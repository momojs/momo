import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test';

import { browser } from 'bunwright/dist/index';

let server: ReturnType<typeof Bun.serve>;
let page: Awaited<ReturnType<typeof browser.newPage>>;

beforeAll(async () => {
  const build = await Bun.build({
    entrypoints: [
      new URL('./toast-runtime.fixture.tsx', import.meta.url).pathname,
    ],
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  if (!build.success)
    throw new AggregateError(build.logs, 'Fixture build failed');
  const script = await build.outputs[0]!.text();
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      return new URL(request.url).pathname === '/fixture.js'
        ? new Response(script, {
            headers: { 'Content-Type': 'text/javascript' },
          })
        : new Response(
            `<!doctype html><html><head><style>
      [data-slot=toast-viewport] { position: fixed; bottom: 20px; right: 20px; width: 360px; }
      [data-slot=toast] { position: absolute; bottom: 0; width: 360px; min-height: 90px; background: white; border: 1px solid black; }
      [data-slot=toast-content] { padding: 16px; }
      [data-slot=toast-icon] svg { width: 20px; height: 20px; }
      [data-slot=toast-close] svg { width: 16px; height: 16px; }
      </style></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>`,
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
  await page
    .navigate(server.url.href)
    .waitForSelector('css:[data-slot="toast-viewport"]');
});
afterAll(async () => {
  await browser.close();
  server?.stop(true);
});

test('manual pause is honored and resumes the remaining timeout', async () => {
  const result = await page.evaluate(async () => {
    const api = window.toastFixture;
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    api.render({ paused: true });
    api.add('timed', { timeout: 500 });
    await pause(600);
    const held =
      api.ids().includes('timed') &&
      document
        .querySelector('[data-slot="toast-viewport"]')!
        .hasAttribute('data-paused');
    api.render({ paused: false });
    await pause(200);
    api.render({ paused: true });
    await pause(550);
    const heldAgain = api.ids().includes('timed');
    api.render({ paused: false });
    await pause(100);
    const notEarly = api.ids().includes('timed');
    await pause(250);
    return {
      held,
      heldAgain,
      notEarly,
      expired: !api.ids().includes('timed'),
      reason: api.closed[0]?.reason,
    };
  });
  expect(result).toEqual({
    held: true,
    heldAgain: true,
    notEarly: true,
    expired: true,
    reason: 'timeout',
  });
});

test('an update resets the timer even while the notification is paused', async () => {
  const result = await page.evaluate(async () => {
    const api = window.toastFixture;
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    api.add('updated', { timeout: 500 });
    await pause(300);
    api.render({ paused: true });
    api.update('updated', { title: 'Updated in place' });
    await pause(550);
    api.render({ paused: false });
    await pause(300);
    const restarted = api.ids().includes('updated');
    await pause(260);
    return { restarted, expired: !api.ids().includes('updated') };
  });
  expect(result).toEqual({ restarted: true, expired: true });
});

test('focus, pointer, window and explicit pause sources do not cancel one another', async () => {
  const result = await page.evaluate(async () => {
    const api = window.toastFixture;
    const frame = () => new Promise(requestAnimationFrame);
    const viewport = document.querySelector('[data-slot="toast-viewport"]')!;
    const paused = () => viewport.hasAttribute('data-paused');
    api.add('focus');
    const card = document.querySelector<HTMLElement>('[data-slot="toast"]')!;
    card.focus();
    await frame();
    api.render({ paused: true });
    api.render({ paused: false });
    const focusHeld = paused();
    api.focusWindow(false);
    document.querySelector<HTMLButtonElement>('#trigger')!.focus();
    await frame();
    const windowHeld = paused();
    api.focusWindow(true);
    await frame();
    const resumed = !paused();
    viewport.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    await frame();
    api.render({ paused: true });
    viewport.dispatchEvent(
      new PointerEvent('pointerout', {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    await frame();
    const manualHeld = paused();
    api.render({ paused: false });
    api.visibility(true);
    await frame();
    const hiddenHeld = paused();
    api.visibility(false);
    await frame();
    return {
      focusHeld,
      windowHeld,
      resumed,
      manualHeld,
      hiddenHeld,
      visibleResumed: !paused(),
    };
  });
  expect(result).toEqual({
    focusHeld: true,
    windowHeld: true,
    resumed: true,
    manualHeld: true,
    hiddenHeld: true,
    visibleResumed: true,
  });
});

test('F6 enters the stack and Escape restores focus through the next toast to the caller', async () => {
  const result = await page.evaluate(async () => {
    const api = window.toastFixture;
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    api.add('older');
    api.add('newer');
    document.querySelector<HTMLButtonElement>('#trigger')!.focus();
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F6', bubbles: true }),
    );
    await pause(30);
    const first = document.activeElement?.textContent?.includes('newer');
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await pause(850);
    const next = document.activeElement?.textContent?.includes('older');
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await pause(850);
    return {
      first,
      next,
      returned: document.activeElement?.id === 'trigger',
      removed: api.removed,
      reasons: api.closed.map((item) => item.reason),
    };
  });
  expect(result).toEqual({
    first: true,
    next: true,
    returned: true,
    removed: ['newer', 'older'],
    reasons: ['escape', 'escape'],
  });
});

test('merged refs clean up on replacement, exit and unmount, including StrictMode', async () => {
  const result = await page.evaluate(async () => {
    const api = window.toastFixture;
    api.add('refs');
    api.render({ refVersion: 1 });
    const replaced = ['root0', 'viewport0'].every(
      (key) =>
        api.counters[key]!.mounted > 0 &&
        api.counters[key]!.mounted === api.counters[key]!.cleaned,
    );
    api.close('refs');
    await new Promise((resolve) => setTimeout(resolve, 850));
    const exited =
      api.counters.root1!.mounted > 0 &&
      api.counters.root1!.mounted === api.counters.root1!.cleaned;
    api.render({ mounted: false });
    return {
      replaced,
      exited,
      allCleaned: Object.values(api.counters).every(
        (counter) => counter.mounted === counter.cleaned && counter.nulls === 0,
      ),
      objectCleared: api.objectRef.current === null,
      legacyCleared:
        api.legacy.at(-1) === 'null' &&
        api.legacy.filter((value) => value === 'mount').length ===
          api.legacy.filter((value) => value === 'null').length,
    };
  });
  expect(result).toEqual({
    replaced: true,
    exited: true,
    allCleaned: true,
    objectCleared: true,
    legacyCleared: true,
  });
});

test('a compact render-window eviction is not a semantic removal', async () => {
  const result = await page.evaluate(async () => {
    const api = window.toastFixture;
    api.render({ limit: 1 });
    api.add('first');
    await new Promise((resolve) => setTimeout(resolve, 350));
    api.add('second');
    api.add('third');
    api.add('fourth');
    await new Promise((resolve) => setTimeout(resolve, 850));
    return {
      ids: api.ids(),
      removed: api.removed,
      mounted: document.querySelectorAll('[data-slot="toast"]').length,
      interactive: document.querySelectorAll('[data-toast-interactive="true"]')
        .length,
    };
  });
  expect(result).toEqual({
    ids: ['fourth', 'third', 'second', 'first'],
    removed: [],
    mounted: 3,
    interactive: 1,
  });
});

test('swipe preserves rebound and dismisses only when the gesture crosses the threshold', async () => {
  const result = await page.evaluate(async () => {
    const api = window.toastFixture;
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    api.add('swipe');
    await pause(500);
    const card = document.querySelector<HTMLElement>('[data-slot="toast"]')!;
    const target = card.querySelector('[data-slot="toast-title"]')!;
    const point = card.getBoundingClientRect();
    const event = (kind: string, x: number) =>
      new PointerEvent(kind, {
        bubbles: true,
        pointerId: 1,
        isPrimary: true,
        pointerType: 'mouse',
        button: 0,
        buttons: kind === 'pointerup' ? 0 : 1,
        clientX: point.left + 20 + x,
        clientY: point.top + 20,
      });
    target.dispatchEvent(event('pointerdown', 0));
    window.dispatchEvent(event('pointermove', 8));
    await pause(120);
    window.dispatchEvent(event('pointermove', 10));
    await pause(120);
    window.dispatchEvent(event('pointerup', 10));
    await pause(500);
    const retained = api.ids().includes('swipe');
    target.dispatchEvent(event('pointerdown', 0));
    window.dispatchEvent(event('pointermove', 50));
    await pause(40);
    window.dispatchEvent(event('pointermove', 160));
    await pause(40);
    window.dispatchEvent(event('pointerup', 160));
    await pause(850);
    return {
      retained,
      dismissed: !api.ids().includes('swipe'),
      reason: api.closed[0]?.reason,
      removed: api.removed,
    };
  });
  expect(result).toEqual({
    retained: true,
    dismissed: true,
    reason: 'swipe',
    removed: ['swipe'],
  });
});
