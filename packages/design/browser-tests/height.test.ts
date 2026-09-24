import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from 'bun:test';

import { createElement } from 'react';

import { browser } from 'bunwright';
import { renderToString } from 'react-dom/server';

import { useAutoHeight } from '../src/effects/height';
import type { HeightBrowserTests } from './height.fixture';

let page: Awaited<ReturnType<typeof browser.newPage>>;

beforeAll(async () => {
  const fixture = await Bun.build({
    entrypoints: [new URL('./height.fixture.tsx', import.meta.url).pathname],
    format: 'iife',
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  if (!fixture.success) throw new Error(fixture.logs.map(String).join('\n'));

  browser.config({
    backend: process.platform === 'darwin' ? 'webkit' : 'chrome',
    dataStore: 'ephemeral',
    headless: true,
  });
  page = await browser.newPage();
  await page.navigate(
    'data:text/html,<!doctype html><html><body></body></html>',
  );
  await page.evaluate(
    new Function(await fixture.outputs[0].text()) as () => void,
  );
}, 30_000);

afterEach(async () => {
  if (!page) return;
  const errors: HeightBrowserTests['errors'] = await page.evaluate(() =>
    window.momoHeightTests.errors.splice(0),
  );
  expect(errors).toEqual([]);
});

afterAll(async () => {
  await browser.close();
});

describe('auto height in React and the browser', () => {
  test('keeps server rendering natural without accessing browser measurement APIs', () => {
    function ServerProbe() {
      const { height, state } = useAutoHeight();
      return createElement(
        'div',
        { style: { height }, 'data-status': state.status },
        'Content',
      );
    }
    expect(renderToString(createElement(ServerProbe))).toBe(
      '<div style="height:auto" data-status="idle">Content</div>',
    );
  });
  test('separates pending measurements, retained height and explicit clearing', async () => {
    expect(await page.evaluate(() => window.momoHeightTests.lifecycle())).toBe(
      true,
    );
  });
  test('ignores obsolete same-key cleanup and observer notifications', async () => {
    expect(
      await page.evaluate(() => window.momoHeightTests.replacement()),
    ).toBe(true);
  });
  test('preserves exact keys, valid zero, ref identity and numerical deduplication', async () => {
    expect(
      await page.evaluate(() => window.momoHeightTests.keysAndDedup()),
    ).toBe(true);
  });
  test('restores a single subscription under StrictMode and cleans up on unmount', async () => {
    expect(await page.evaluate(() => window.momoHeightTests.strictMode())).toBe(
      true,
    );
  });
  test('does not restore stale height after a descendant clears during layout', async () => {
    expect(
      await page.evaluate(() => window.momoHeightTests.layoutClear()),
    ).toBe(true);
  });
  test('measures unscaled border boxes and observes CSS-only size changes', async () => {
    expect(
      await page.evaluate(() => window.momoHeightTests.boxAndResize()),
    ).toBe(true);
  });
  test('Tabs measures committed selection, decorations and removed/reintroduced options', async () => {
    expect(
      await page.evaluate(() => window.momoHeightTests.tabsControlled()),
    ).toBe(true);
  });
  test('Tabs preserves explicit, implicit and asynchronously available uncontrolled defaults', async () => {
    expect(
      await page.evaluate(() => window.momoHeightTests.tabsUncontrolled()),
    ).toBe(true);
  });
  test('retains height through a mounting gap and redirects a running animation', async () => {
    expect(
      await page.evaluate(() => window.momoHeightTests.animationRetarget()),
    ).toBe(true);
  });
});
