import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { browser } from 'bunwright';

let page: Awaited<ReturnType<typeof browser.newPage>>;
let server: ReturnType<typeof Bun.serve> | undefined;

beforeAll(async () => {
  const fixture = await Bun.build({
    entrypoints: [new URL('./fixture.ts', import.meta.url).pathname],
    format: 'esm',
    plugins: [
      {
        name: 'workspace-packages',
        setup(build) {
          build.onResolve({ filter: /^@momots\/core$/ }, () => ({
            path: new URL('../../core/src/index.ts', import.meta.url).pathname,
          }));
        },
      },
    ],
    target: 'browser',
  });

  if (!fixture.success) {
    throw new Error(fixture.logs.map((log) => log.message).join('\n'));
  }

  const script = fixture.outputs[0];
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      if (new URL(request.url).pathname === '/fixture.js') {
        return new Response(script, {
          headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
        });
      }

      return new Response(
        '<!doctype html><body><script type="module" src="/fixture.js"></script></body>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      );
    },
  });

  page = await browser.newPage();
  await page
    .navigate(`http://${server.hostname}:${server.port}/`)
    .waitForSelector('css:[data-test-fixture="ready"]');
});

afterAll(async () => {
  await browser.close();
  server?.stop(true);
});

describe('@momots/host browser integration', () => {
  test('detects DOM element types in a real browser realm', async () => {
    const result = await page.evaluate(() =>
      globalThis.__momoHostBrowserTests.elementTypes(),
    );

    expect(result).toEqual({
      element: true,
      htmlElement: true,
      input: true,
      inputRejectsTextarea: true,
      textarea: true,
      textareaRejectsInput: true,
      ssr: false,
    });
  });

  test('detects CSS style rules in a real browser realm', async () => {
    const result = await page.evaluate(() =>
      globalThis.__momoHostBrowserTests.cssStyleRule(),
    );

    expect(result).toEqual({ rule: true, element: false });
  });

  test('measures text with canvas font options', async () => {
    const result = await page.evaluate(() =>
      globalThis.__momoHostBrowserTests.canvasMeasurement(),
    );

    expect(result.width).toBeGreaterThan(0);
    expect(result.larger).toBeGreaterThan(result.width ?? 0);
    expect(result.empty).toBeUndefined();
  });

  test('checks scrollable and overflow guards with real layout metrics', async () => {
    const result = await page.evaluate(() =>
      globalThis.__momoHostBrowserTests.layout(),
    );

    expect(result).toEqual({
      scrollable: true,
      overflow: true,
      plainScrollable: false,
      plainOverflow: false,
      touchType: 'boolean',
    });
  });

  test('checks touch devices through coarse pointer media queries', async () => {
    const result = await page.evaluate(() =>
      globalThis.__momoHostBrowserTests.touchDevice(),
    );

    expect(result).toEqual({
      coarsePointer: true,
      finePointerType: 'boolean',
      touchEvent: true,
    });
  });
});
