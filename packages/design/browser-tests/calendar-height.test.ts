import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from 'bun:test';

import { compile } from '@tailwindcss/node';
import { browser } from 'bunwright';

import type { CalendarGeometry } from './calendar-height-types';

let page: Awaited<ReturnType<typeof browser.newPage>>;

function expectCompleteHeight(rect: CalendarGeometry) {
  expect(Math.abs(rect.outer - rect.content)).toBeLessThan(0.6);
  expect(rect.footerVisible).toBe(true);
}

beforeAll(async () => {
  const fixture = await Bun.build({
    entrypoints: [
      new URL(
        '../../../examples/cupori/browser-tests/calendar-height.fixture.tsx',
        import.meta.url,
      ).pathname,
    ],
    plugins: [
      {
        name: 'design-source',
        setup(build) {
          build.onResolve({ filter: /^@momots\/design$/ }, () => ({
            path: new URL('../src/index.ts', import.meta.url).pathname,
          }));
        },
      },
    ],
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
  page = await browser.newPage({ viewport: { width: 1_024, height: 1_000 } });
  await page.navigate(
    'data:text/html,<!doctype html><html><body></body></html>',
  );
  await page.evaluate(
    new Function(await fixture.outputs[0].text()) as () => void,
  );
  await page.evaluate(() => window.momoCalendarHeightTests.render());
  // Generate the real Tailwind utilities rendered by Calendar, including its breakpoint.
  const candidates: string[] = await page.evaluate(() =>
    window.momoCalendarHeightTests.classes(),
  );
  const compiler = await compile('@import "tailwindcss";', {
    base: new URL('..', import.meta.url).pathname,
    onDependency() {
      /* No file watcher is needed in a test. */
    },
  });
  const css = compiler.build(candidates);
  await page.evaluate(
    new Function(
      `const style = document.createElement('style'); style.textContent = ${JSON.stringify(css)}; document.head.append(style);`,
    ) as () => void,
  );
  await page.evaluate(() => window.momoCalendarHeightTests.settle());
  await page.evaluate(() => window.momoCalendarHeightTests.reset());
}, 30_000);

afterEach(async () => {
  if (!page) return;
  await page.evaluate(() => window.momoCalendarHeightTests.reset());
  expect(
    await page.evaluate(() => window.momoCalendarHeightTests.errors.splice(0)),
  ).toEqual([]);
});

afterAll(async () => {
  await browser.close();
});

describe('Calendar auto height with multiple months', () => {
  test('includes every stacked month, the gap, root decoration and footer on narrow screens', async () => {
    await page.resize(375, 1_000);
    await page.evaluate(() => window.momoCalendarHeightTests.render());
    const rect: CalendarGeometry = await page.evaluate(() =>
      window.momoCalendarHeightTests.settle(),
    );
    expect(rect.months).toHaveLength(2);
    expect(rect.direction).toBe('column');
    expect(rect.months[1]!.top).toBeGreaterThan(rect.months[0]!.bottom);
    expect(rect.content).toBeGreaterThan(
      rect.months.reduce((sum, month) => sum + month.height, 0),
    );
    expectCompleteHeight(rect);
  });

  test('follows the full horizontal layout and updates when the viewport changes without a render', async () => {
    await page.resize(1_024, 1_000);
    await page.evaluate(() => window.momoCalendarHeightTests.render());
    const wide: CalendarGeometry = await page.evaluate(() =>
      window.momoCalendarHeightTests.settle(),
    );
    expect(wide.direction).toBe('row');
    expect(Math.abs(wide.months[0]!.top - wide.months[1]!.top)).toBeLessThan(1);
    expect(wide.content).toBeGreaterThanOrEqual(
      Math.max(...wide.months.map((month) => month.height)),
    );
    expectCompleteHeight(wide);
    await page.resize(375, 1_000);
    const narrow: CalendarGeometry = await page.evaluate(() =>
      window.momoCalendarHeightTests.settle(),
    );
    expect(narrow.direction).toBe('column');
    expect(narrow.content).toBeGreaterThan(wide.content);
    expectCompleteHeight(narrow);
  });

  test('remeasures on month changes, month-count changes and asynchronous content growth', async () => {
    await page.resize(375, 1_000);
    await page.evaluate(() =>
      window.momoCalendarHeightTests.render({ months: 2, month: 1 }),
    );
    const before: CalendarGeometry = await page.evaluate(() =>
      window.momoCalendarHeightTests.settle(),
    );
    await page.evaluate(() =>
      window.momoCalendarHeightTests.render({ months: 3, month: 7 }),
    );
    const three: CalendarGeometry = await page.evaluate(() =>
      window.momoCalendarHeightTests.settle(),
    );
    expect(three.months).toHaveLength(3);
    expect(three.content).toBeGreaterThan(before.content);
    expectCompleteHeight(three);
    await page.evaluate(() =>
      window.momoCalendarHeightTests.setFooterHeight(137),
    );
    const grown: CalendarGeometry = await page.evaluate(() =>
      window.momoCalendarHeightTests.settle(),
    );
    expect(grown.content - three.content).toBeCloseTo(100, 0);
    expectCompleteHeight(grown);
    await page.evaluate(() =>
      window.momoCalendarHeightTests.render({ months: 1, month: 1 }),
    );
    const single: CalendarGeometry = await page.evaluate(() =>
      window.momoCalendarHeightTests.settle(),
    );
    expect(single.months).toHaveLength(1);
    expect(single.content).toBeLessThan(before.content);
    expectCompleteHeight(single);
  });
});
