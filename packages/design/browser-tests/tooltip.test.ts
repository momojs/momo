import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test';

import { compile } from '@tailwindcss/node';
import { browser } from 'bunwright/dist/index';

let server: ReturnType<typeof Bun.serve>;
let page: Awaited<ReturnType<typeof browser.newPage>>;

beforeAll(async () => {
  const build = await Bun.build({
    entrypoints: [new URL('./tooltip.fixture.tsx', import.meta.url).pathname],
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  if (!build.success)
    throw new AggregateError(build.logs, 'Fixture build failed');
  const script = await build.outputs[0]!.text();
  const compiler = await compile(
    '@import "tailwindcss"; @import "./src/themes/neutral.css";',
    {
      base: new URL('../', import.meta.url).pathname,
      onDependency() {
        // This fixture builds once; dependency watching is unnecessary.
      },
    },
  );
  const sources = await Promise.all(
    ['tooltip', 'button'].map((name) =>
      Bun.file(
        new URL(`../src/components/${name}.tsx`, import.meta.url),
      ).text(),
    ),
  );
  const css = compiler.build(sources.join(' ').split(/[\s'"`]+/));
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      return new URL(request.url).pathname === '/fixture.js'
        ? new Response(script, {
            headers: { 'Content-Type': 'text/javascript' },
          })
        : new Response(
            `<!doctype html><html class="theme-neutral"><head><style>${css}
          #root { padding: 120px; display: flex; gap: 24px; }
          </style></head><body><div id="root"></div><script>
          if (location.search.includes('reduced')) {
            const match = window.matchMedia.bind(window);
            window.matchMedia = query => {
              const result = match(query);
              if (query.includes('prefers-reduced-motion')) Object.defineProperty(result, 'matches', { value: true });
              return result;
            };
          }
          </script><script type="module" src="/fixture.js"></script></body></html>`,
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
  await page.navigate(server.url.href).waitForSelector('css:#trigger');
});
afterAll(async () => {
  await browser.close();
  server?.stop(true);
});

test('hover respects provider and local delays, then retains the popup during exit', async () => {
  const result = await page.evaluate(async () => {
    const api = window.tooltipFixture;
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    api.render({ delay: 220, closeDelay: 200, providerDelay: 1200 });
    await pause(50);
    api.hover('trigger');
    await pause(90);
    const delayed = !document.querySelector('[data-slot="tooltip-popup"]');
    await pause(180);
    const opened = document
      .querySelector('[data-slot="tooltip-popup"]')
      ?.hasAttribute('data-open');
    api.leave('trigger');
    await pause(90);
    const closeDelayed = api.changes.at(-1) === true;
    await pause(140);
    const exiting = document
      .querySelector('[data-slot="tooltip-popup"]')
      ?.hasAttribute('data-closed');
    await pause(850);
    return {
      delayed,
      opened,
      closeDelayed,
      exiting,
      removed: !document.querySelector('[data-slot="tooltip-popup"]'),
      changes: api.changes,
    };
  });
  expect(result).toEqual({
    delayed: true,
    opened: true,
    closeDelayed: true,
    exiting: true,
    removed: true,
    changes: [true, false],
  });
});

test('a provider skips the opening delay when moving to the neighboring tooltip', async () => {
  const result = await page.evaluate(async () => {
    const api = window.tooltipFixture;
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    await pause(50);
    api.hover('trigger');
    await pause(100);
    const delayed = !document.querySelector('[data-slot="tooltip-popup"]');
    await pause(280);
    const first = document.querySelector(
      '[data-slot="tooltip-popup"][data-open]',
    )?.textContent;
    api.leave('trigger');
    api.hover('second');
    await pause(90);
    return {
      delayed,
      first,
      second: document.querySelector('[data-slot="tooltip-popup"][data-open]')
        ?.textContent,
    };
  });
  expect(result).toEqual({
    delayed: true,
    first: 'Save your changes',
    second: 'View history',
  });
});

test('keyboard focus opens immediately and Escape dismisses without moving focus', async () => {
  await page.evaluate(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    document.getElementById('trigger')!.focus();
  });
  await page.waitForSelector('css:[data-slot="tooltip-popup"][data-open]');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('trigger');
  await page.press('Escape');
  expect(
    await page.evaluate(() => ({
      focus: document.activeElement?.id,
      last: window.tooltipFixture.details.at(-1),
    })),
  ).toEqual({ focus: 'trigger', last: { open: false, reason: 'escape-key' } });
  await page.evaluate(() => document.getElementById('second')!.focus());
  await page.waitForSelector('css:[data-slot="tooltip-popup"][data-open]');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('second');
});

test('cancellation precedes onChange and controlled state remains owned by the caller', async () => {
  const result = await page.evaluate(async () => {
    const api = window.tooltipFixture;
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    api.render({ cancel: true, delay: 0 });
    await pause(50);
    api.hover('trigger');
    await pause(80);
    const canceled =
      api.details.some((event) => event.open) &&
      api.changes.length === 0 &&
      !document.querySelector('[data-slot="tooltip-popup"]');
    api.leave('trigger');
    api.render({ cancel: false, open: false });
    await pause(30);
    api.hover('trigger');
    await pause(80);
    const controlled =
      api.changes.at(-1) === true &&
      !document.querySelector('[data-slot="tooltip-popup"]');
    api.render({ open: true });
    await pause(60);
    return {
      canceled,
      controlled,
      opened: !!document.querySelector(
        '[data-slot="tooltip-popup"][data-open]',
      ),
    };
  });
  expect(result).toEqual({ canceled: true, controlled: true, opened: true });
});

test('composed trigger refs, events and content render forms survive real DOM rendering', async () => {
  const result = await page.evaluate(async () => {
    const api = window.tooltipFixture;
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    api.render({ open: true });
    await pause(80);
    const trigger = document.getElementById('trigger')!;
    const composed =
      trigger === api.triggerRef.current &&
      trigger.classList.contains('original-trigger') &&
      trigger.classList.contains('composed-trigger') &&
      trigger.style.color === 'rgb(255, 0, 0)';
    const tags: (string | undefined)[] = [];
    for (const slot of ['object', 'element', 'callback'] as const) {
      api.render({ slot });
      tags.push(document.getElementById('custom-content')?.tagName);
      if (
        document.getElementById('custom-content')?.textContent !==
        'Save your changes'
      )
        throw new Error('Slot lost children');
    }
    trigger.click();
    const clicked = api.clicks === 1;
    api.render({ callback: true });
    await pause(60);
    const callback = document
      .querySelector('[data-callback-open]')
      ?.getAttribute('data-callback-open');
    api.render({ slot: 'hidden' });
    return {
      composed,
      tags,
      clicked,
      callback,
      refs: api.refMounts > 0,
      hidden: !document.querySelector('[data-slot="tooltip-content"]'),
    };
  });
  expect(result).toEqual({
    composed: true,
    tags: ['SECTION', 'SECTION', 'ARTICLE'],
    clicked: true,
    callback: 'true',
    refs: true,
    hidden: true,
  });
});

test('disabled hints leave the button usable, and touch does not start a hover tooltip', async () => {
  const result = await page.evaluate(async () => {
    const api = window.tooltipFixture;
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    api.render({ delay: 0, disabled: true, open: true });
    await pause(50);
    api.hover('trigger');
    document.getElementById('trigger')!.click();
    await pause(80);
    const disabled =
      !document.querySelector('[data-slot="tooltip-popup"]') &&
      !api.triggerRef.current?.disabled &&
      api.clicks === 1;
    api.leave('trigger');
    api.render({ open: undefined, disabled: false });
    await pause(50);
    api.hover('trigger', 'touch');
    await pause(100);
    return {
      disabled,
      touchIgnored: !document.querySelector('[data-slot="tooltip-popup"]'),
    };
  });
  expect(result).toEqual({ disabled: true, touchIgnored: true });
});

test('collision handling flips the arrow and constrains a long hint to the viewport', async () => {
  await page.resize(420, 500);
  const result = await page.evaluate(async () => {
    window.tooltipFixture.render({ open: true, edge: true });
    await new Promise((resolve) => setTimeout(resolve, 750));
    const popup = document.querySelector<HTMLElement>(
      '[data-slot="tooltip-popup"]',
    )!;
    const box = popup.getBoundingClientRect();
    const arrow = document.querySelector('[data-slot="tooltip-arrow"]')!;
    return {
      side: popup.dataset.side,
      arrowSide: arrow.getAttribute('data-side'),
      inside: box.left >= 0 && box.right <= innerWidth,
      styled: getComputedStyle(popup).backgroundColor !== 'rgba(0, 0, 0, 0)',
    };
  });
  expect(result).toEqual({
    side: 'bottom',
    arrowSide: 'bottom',
    inside: true,
    styled: true,
  });
  await page.resize(1024, 768);
});

test('reopening interrupts exit and reduced motion removes spatial animation', async () => {
  const result = await page.evaluate(async () => {
    const api = window.tooltipFixture;
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    api.render({ open: true });
    await pause(700);
    const original = document.querySelector('[data-slot="tooltip-popup"]');
    api.render({ open: false });
    await pause(45);
    const retained = original?.isConnected;
    api.render({ open: true });
    await pause(750);
    return {
      retained,
      reused:
        original === document.querySelector('[data-slot="tooltip-popup"]'),
      count: document.querySelectorAll('[data-slot="tooltip-popup"]').length,
    };
  });
  expect(result).toEqual({ retained: true, reused: true, count: 1 });
  await page
    .navigate(`${server.url.href}?reduced`)
    .waitForSelector('css:#trigger');
  const reduced = await page.evaluate(async () => {
    const api = window.tooltipFixture;
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    api.render({ open: true });
    await pause(60);
    const calm = getComputedStyle(
      document.querySelector('[data-slot="tooltip-popup"]')!,
    ).transform;
    api.render({ reduced: 'off' });
    await pause(50);
    api.render({ open: false });
    await pause(80);
    return {
      calm,
      removed: !document.querySelector('[data-slot="tooltip-popup"]'),
    };
  });
  expect(reduced).toEqual({ calm: 'none', removed: true });
});
