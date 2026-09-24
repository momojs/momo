import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from 'bun:test';

import { browser } from 'bunwright';

import type { PresenceGateBrowserTests } from './use-presence-gate.fixture';

let page: Awaited<ReturnType<typeof browser.newPage>>;

beforeAll(async () => {
  const fixture = await Bun.build({
    entrypoints: [
      new URL('./use-presence-gate.fixture.tsx', import.meta.url).pathname,
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
  const errors: PresenceGateBrowserTests['errors'] = await page.evaluate(() =>
    window.momoPresenceGateTests.errors.splice(0),
  );
  expect(errors).toEqual([]);
});

afterAll(async () => {
  await browser.close();
});

describe('usePresenceGate in React', () => {
  test('keeps completed gates complete across closing rerenders', async () => {
    expect(
      await page.evaluate(() =>
        window.momoPresenceGateTests.completedGateStaysComplete(),
      ),
    ).toBe(true);
  });
  test('removes a pending gate while the close is in progress', async () => {
    expect(
      await page.evaluate(() =>
        window.momoPresenceGateTests.removedGateStopsWaiting(),
      ),
    ).toBe(true);
  });
  test('releases when the last pending gate disappears after another completes', async () => {
    expect(
      await page.evaluate(() =>
        window.momoPresenceGateTests.removingLastPendingGateReleases(),
      ),
    ).toBe(true);
  });
  test('reopens and waits for every gate in the next close', async () => {
    expect(
      await page.evaluate(() =>
        window.momoPresenceGateTests.reopenStartsNewWait(),
      ),
    ).toBe(true);
  });
  test('preserves distinct keys through reordering and duplicate completions', async () => {
    expect(
      await page.evaluate(() =>
        window.momoPresenceGateTests.distinctKeysAndDuplicateCompletion(),
      ),
    ).toBe(true);
  });
  test('opens and closes without gates', async () => {
    expect(
      await page.evaluate(() => window.momoPresenceGateTests.noGates()),
    ).toBe(true);
  });
});
