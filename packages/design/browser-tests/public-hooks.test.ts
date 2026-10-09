import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test';

import { createElement } from 'react';

import { browser } from 'bunwright/dist/index';
import { renderToString } from 'react-dom/server';

import { BreakpointProbe } from './public-hooks.fixture';

let server: ReturnType<typeof Bun.serve>;
let page: Awaited<ReturnType<typeof browser.newPage>>;

beforeAll(async () => {
  const build = await Bun.build({
    entrypoints: [
      new URL('./public-hooks.fixture.tsx', import.meta.url).pathname,
    ],
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  if (!build.success)
    throw new AggregateError(build.logs, 'Fixture build failed');
  const script = await build.outputs[0]!.text();
  const hydration = [0, 1]
    .map((index) => {
      const html = renderToString(
        createElement(BreakpointProbe, {
          id: `hydrated-${index}`,
          mode: index === 0 ? 'min' : 'max',
          breakpoint: 0,
          serverMatches: index === 1,
        }),
      );
      return `<div id="hydration-${index}">${html}</div>`;
    })
    .join('');
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      return new URL(request.url).pathname === '/fixture.js'
        ? new Response(script, {
            headers: { 'Content-Type': 'text/javascript' },
          })
        : new Response(
            `<!doctype html><html><body><div id="root"></div>${hydration}
            <script>if (location.search === '?no-media') window.matchMedia = undefined;</script>
            <script type="module" src="/fixture.js"></script></body></html>`,
            { headers: { 'Content-Type': 'text/html' } },
          );
    },
  });
  browser.config({
    backend: process.platform === 'darwin' ? 'webkit' : 'chrome',
    dataStore: 'ephemeral',
    console: true,
    retryTimeout: 5000,
  });
  page = await browser.newPage();
}, 30000);

beforeEach(async () => {
  await page.resize(768, 700);
  await page.navigate(server.url.href).waitForSelector('css:#breakpoint');
});

afterAll(async () => {
  await browser.close();
  server?.stop(true);
});

test('hydration preserves server nodes, then updates both default and custom snapshots', async () => {
  await page.waitForSelector('css:#hydrated-0');
  const result = await page.evaluate(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const api = window.publicHooksFixture;
    return {
      commits: api.hydration,
      errors: api.hydrationErrors,
      preserved: api.hydrationNodes.every(
        (node, index) => node === document.getElementById(`hydrated-${index}`),
      ),
    };
  });
  expect(result).toEqual({
    commits: [
      [false, true],
      [true, false],
    ],
    errors: [],
    preserved: true,
  });
});

test('breakpoints match native CSS inclusive boundaries and preserve fractional widths', async () => {
  const matches = await page.evaluate(() => {
    const api = window.publicHooksFixture;
    const result: string[] = [];
    for (const breakpoint of [innerWidth - 0.5, innerWidth, innerWidth + 0.5]) {
      for (const mode of ['min', 'max'] as const) {
        api.render({ mode, breakpoint });
        const value = document.getElementById('breakpoint')!.textContent!;
        if (
          value !==
          String(matchMedia(`(${mode}-width: ${breakpoint}px)`).matches)
        ) {
          throw new Error('Breakpoint differs from the native media query');
        }
        result.push(value);
      }
    }
    return result;
  });
  expect(matches).toEqual(['true', 'false', 'true', 'true', 'false', 'true']);
});

test('viewport resizing updates the active subscription', async () => {
  await page.evaluate(() => {
    window.publicHooksFixture.render({ mode: 'max', breakpoint: 700 });
  });
  await page.resize(640, 700);
  await page.waitForSelector('css:#breakpoint[data-matches="true"]');
  expect(
    await page.evaluate(
      () => document.getElementById('breakpoint')!.textContent,
    ),
  ).toBe('true');
  await page.resize(800, 700);
  await page.waitForSelector('css:#breakpoint[data-matches="false"]');
  expect(
    await page.evaluate(
      () => document.getElementById('breakpoint')!.textContent,
    ),
  ).toBe('false');
});

test('missing matchMedia uses the fallback on the client', async () => {
  await page
    .navigate(`${server.url.href}?no-media`)
    .waitForSelector('css:#breakpoint');
  const result = await page.evaluate(() => {
    const before = document.getElementById('breakpoint')!.textContent;
    window.publicHooksFixture.render({ serverMatches: true });
    return [before, document.getElementById('breakpoint')!.textContent];
  });
  expect(result).toEqual(['false', 'true']);
});

test('merged refs stay stable and release old refs on replacement and unmount', async () => {
  const result = await page.evaluate(() => {
    const api = window.publicHooksFixture;
    const node = document.getElementById('ref-target');
    const original = api.objectRefs[0]!.current === node;
    api.render({ refVersion: 1 });
    const replaced =
      api.objectRefs[0]!.current === null &&
      api.objectRefs[1]!.current === node;
    const stable = api.mergedCallbacks.every(
      (callback) => callback === api.mergedCallbacks[0],
    );
    api.render({ mounted: false });
    const count = (value: string) =>
      api.events.filter((event) => event === value).length;
    return {
      original,
      replaced,
      stable,
      cleared: api.objectRefs.every((ref) => ref.current === null),
      cleanups: [0, 1].every(
        (version) =>
          count(`${version}:attach`) > 0 &&
          count(`${version}:attach`) === count(`${version}:cleanup`) &&
          count(`${version}:null`) === 0,
      ),
      legacy: count('legacy:attach') === count('legacy:detach'),
    };
  });
  expect(result).toEqual({
    original: true,
    replaced: true,
    stable: true,
    cleared: true,
    cleanups: true,
    legacy: true,
  });
});

test('previous records committed values, including unrelated renders', async () => {
  const result = await page.evaluate(() => {
    const api = window.publicHooksFixture;
    const read = () => document.getElementById('previous')!.textContent;
    const values = [read()];
    api.render({ value: 2 });
    values.push(read());
    api.render();
    values.push(read());
    api.render({ value: 3 });
    values.push(read());
    return values;
  });
  expect(result).toEqual(['null', '1', '2', '2']);
});

test('resize reports layout border boxes, rebinds equal sizes and distinguishes unsupported layouts', async () => {
  const result = await page.evaluate(() => {
    const api = window.publicHooksFixture;
    const initial = api.measurements.at(-1);
    api.render({ binding: 1 });
    const rebound = api.measurements.at(-1);
    api.render({ display: 'contents', binding: 2 });
    const unsupported = api.measurements.at(-1);
    api.render({ display: 'none', binding: 3 });
    const hidden = api.measurements.at(-1);
    api.render({ mounted: false });
    return { initial, rebound, unsupported, hidden };
  });
  expect(result).toEqual({
    initial: { binding: 0, size: { width: 110, height: 50 } },
    rebound: { binding: 1, size: { width: 110, height: 50 } },
    unsupported: { binding: 2, size: null },
    hidden: { binding: 3, size: { width: 0, height: 0 } },
  });
});
