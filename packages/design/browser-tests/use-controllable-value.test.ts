import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from 'bun:test';

import { browser } from 'bunwright';

import type { ControllableValueBrowserTests } from './use-controllable-value.fixture';

let page: Awaited<ReturnType<typeof browser.newPage>>;

beforeAll(async () => {
  const fixture = await Bun.build({
    entrypoints: [
      new URL('./use-controllable-value.fixture.tsx', import.meta.url).pathname,
    ],
    format: 'iife',
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  if (!fixture.success) {
    throw new Error(fixture.logs.map((log) => log.message).join('\n'));
  }

  browser.config({
    backend: process.platform === 'darwin' ? 'webkit' : 'chrome',
    dataStore: 'ephemeral',
    headless: true,
  });
  page = await browser.newPage();
  await page.navigate(
    'data:text/html,<!doctype html><html><body></body></html>',
  );
  const installFixture = new Function(
    await fixture.outputs[0].text(),
  ) as () => void;
  await page.evaluate(installFixture);
}, 30_000);

afterEach(async () => {
  if (!page) return;
  const errors: ControllableValueBrowserTests['errors'] = await page.evaluate(
    () => window.momoControllableValueTests.errors.splice(0),
  );
  expect(errors).toEqual([]);
});

afterAll(async () => {
  await browser.close();
});

describe('useControllableValue in React', () => {
  test('uses the initial fallback only for an implicitly controlled missing value', async () => {
    const result = await page.evaluate(() =>
      window.momoControllableValueTests.defaultFallback(),
    );
    expect(result).toEqual({
      implicit: 0,
      explicitIsUndefined: true,
      changes: [1],
      warnings: 1,
    });
  });

  test('composes controlled column requests without changing the rendered value', async () => {
    const result = await page.evaluate(() =>
      window.momoControllableValueTests.controlledColumns(),
    );
    expect(result).toEqual({
      current: [2026, 7],
      changes: [
        [[2030, 7], 'year'],
        [[2030, 8], 'month'],
      ],
    });
  });

  test('composes uncontrolled column requests', async () => {
    const result = await page.evaluate(() =>
      window.momoControllableValueTests.uncontrolledColumns(),
    );
    expect(result).toEqual({
      current: [2030, 8],
      changes: [
        [[2030, 7], 'year'],
        [[2030, 8], 'month'],
      ],
    });
  });

  test('composes a controlled clear before realigning to the defined value', async () => {
    const result = await page.evaluate(() =>
      window.momoControllableValueTests.controlledClear(),
    );
    expect(result).toEqual({
      current: 1_000,
      changes: [
        [null, 'clear'],
        [2_000, 'restore'],
        [1_001, 'after-commit'],
      ],
      previousValues: [null, 1_000],
    });
  });

  test('realigns controlled requests even when the parent does not rerender', async () => {
    const result = await page.evaluate(() =>
      window.momoControllableValueTests.controlledRealignment(),
    );
    expect(result).toEqual({ current: 1, changes: [2, 3, 2], renders: 3 });
  });

  test('uses the value normalized by the parent', async () => {
    const result = await page.evaluate(() =>
      window.momoControllableValueTests.controlledNormalization(),
    );
    expect(result).toEqual({ current: 10, changes: [20, 11] });
  });

  test('publishes props before child layout effects and preserves their requests', async () => {
    const result = await page.evaluate(() =>
      window.momoControllableValueTests.layoutRequests(),
    );
    expect(result).toEqual({
      changes: [
        ['new', 6],
        ['new', 7],
      ],
      stable: true,
    });
  });

  test('preserves transition requests across an unrelated urgent commit', async () => {
    const result = await page.evaluate(() =>
      window.momoControllableValueTests.mixedPriorities(),
    );
    expect(result).toEqual({ unrelatedCommit: 0, current: 2, changes: [1, 2] });
  });

  test('preserves newer requests when only an earlier write commits', async () => {
    const result = await page.evaluate(() =>
      window.momoControllableValueTests.partialCommit(),
    );
    expect(result).toEqual({ intermediate: 1, current: 3, changes: [1, 2, 3] });
  });

  test('does not publish values or callbacks from an abandoned render', async () => {
    const result = await page.evaluate(() =>
      window.momoControllableValueTests.abandonedRender(),
    );
    expect(result).toEqual({ attempted: true, changes: [['committed', 2]] });
  });

  test('notifies synchronously without duplicating requests in StrictMode', async () => {
    const result = await page.evaluate(() =>
      window.momoControllableValueTests.strictMode(),
    );
    expect(result).toEqual({
      current: 2,
      changes: [1, 2],
      synchronous: [1, 2],
    });
  });
});
