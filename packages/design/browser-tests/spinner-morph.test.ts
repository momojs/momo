import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test';

import { browser } from 'bunwright/dist/index';

let server: ReturnType<typeof Bun.serve>;
let page: Awaited<ReturnType<typeof browser.newPage>>;

beforeAll(async () => {
  const build = await Bun.build({
    entrypoints: [
      new URL('./spinner-morph.fixture.tsx', import.meta.url).pathname,
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
            '<!doctype html><html><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>',
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
  await page.navigate(server.url.href).waitForSelector('css:#subject circle');
});
afterAll(async () => {
  await browser.close();
  server?.stop(true);
});

test('hands the rendered dash and its rotation to the same path before morphing', async () => {
  const result = await page.evaluate(async () => {
    await new Promise((resolve) => setTimeout(resolve, 180));
    const svg = document.querySelector<SVGSVGElement>('#subject')!;
    const circle = svg.querySelector('circle')!;
    const path = svg.querySelector('path')!;
    const toast = document.querySelector('#toast svg')!;
    const length = parseFloat(circle.getAttribute('stroke-dasharray')!);
    const offset = parseFloat(circle.getAttribute('stroke-dashoffset')!);
    const circumference = circle.getTotalLength();
    const start = Math.min(circumference, Math.max(0, -offset));
    const end = Math.min(circumference, Math.max(0, length - offset));
    const rotation = svg.getCTM()!.inverse().multiply(circle.getCTM()!);
    const from = circle.getPointAtLength(start).matrixTransform(rotation);
    const to = circle.getPointAtLength(end).matrixTransform(rotation);
    window.spinnerFixture.render({ result: 'success' });
    const initial = path.getAttribute('d');
    const actualFrom = path.getPointAtLength(0);
    const actualTo = path.getPointAtLength(path.getTotalLength());
    const geometry = {
      startError: Math.hypot(actualFrom.x - from.x, actualFrom.y - from.y),
      endError: Math.hypot(actualTo.x - to.x, actualTo.y - to.y),
      lengthError: Math.abs(path.getTotalLength() - (end - start)),
    };
    await new Promise((resolve) => setTimeout(resolve, 70));
    const intermediate = path.getAttribute('d');
    window.spinnerFixture.render({ revision: 1 });
    const afterRender = path.getAttribute('d');
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      ...geometry,
      sameSvg:
        document.querySelector('#subject') === svg &&
        window.spinnerFixture.ref.current === svg,
      samePath: svg.querySelector('path') === path,
      sameToast: document.querySelector('#toast svg') === toast,
      hiddenCircle: circle.getAttribute('display') === 'none',
      moving:
        initial !== intermediate &&
        intermediate !== window.spinnerFixture.targets.success,
      renderPreservesPath: afterRender === intermediate,
      settled: path.getAttribute('d') === window.spinnerFixture.targets.success,
      toastSettled:
        toast.querySelector('path')!.getAttribute('d') ===
        window.spinnerFixture.targets.success,
    };
  });
  expect(result.startError).toBeLessThan(0.05);
  expect(result.endError).toBeLessThan(0.05);
  expect(result.lengthError).toBeLessThan(0.05);
  expect(result).toMatchObject({
    sameSvg: true,
    samePath: true,
    sameToast: true,
    hiddenCircle: true,
    moving: true,
    renderPreservesPath: true,
    settled: true,
    toastSettled: true,
  });
});

test('retargets in flight and cancels the old morph when loading restarts', async () => {
  const result = await page.evaluate(async () => {
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const path = document.querySelector('#subject path')!;
    const circle = document.querySelector('#subject circle')!;
    window.spinnerFixture.render({ result: 'success' });
    await pause(50);
    const before = path.getAttribute('d');
    window.spinnerFixture.render({ result: 'error' });
    const uninterrupted = path.getAttribute('d') === before;
    await pause(50);
    window.spinnerFixture.render({ result: undefined });
    const stopped = path.getAttribute('d');
    await pause(100);
    const rotation = circle.getAttribute('style');
    await pause(100);
    const restarted = circle.getAttribute('style') !== rotation;
    const noOldWrites = path.getAttribute('d') === stopped;
    window.spinnerFixture.render({ result: 'error' });
    await pause(600);
    return {
      uninterrupted,
      restarted,
      noOldWrites,
      settled: path.getAttribute('d') === window.spinnerFixture.targets.error,
    };
  });
  expect(result).toEqual({
    uninterrupted: true,
    restarted: true,
    noOldWrites: true,
    settled: true,
  });
});

test('morph=false stops a pending morph and switches immediately while loading still runs', async () => {
  const result = await page.evaluate(async () => {
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const path = document.querySelector('#subject path')!;
    window.spinnerFixture.render({ result: 'success' });
    await pause(40);
    window.spinnerFixture.render({ morph: false });
    const immediate =
      path.getAttribute('d') === window.spinnerFixture.targets.success;
    await pause(120);
    const stable =
      path.getAttribute('d') === window.spinnerFixture.targets.success;
    window.spinnerFixture.render({ result: undefined });
    await pause(60);
    const circle = document.querySelector('#subject circle')!;
    const rotation = circle.getAttribute('style');
    await pause(80);
    const spinning = rotation !== circle.getAttribute('style');
    window.spinnerFixture.render({ result: 'error' });
    return {
      immediate,
      stable,
      spinning,
      resolved: path.getAttribute('d') === window.spinnerFixture.targets.error,
    };
  });
  expect(result).toEqual({
    immediate: true,
    stable: true,
    spinning: true,
    resolved: true,
  });
});

test('reduced motion stops the active morph and loading loop immediately', async () => {
  const result = await page.evaluate(async () => {
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const path = document.querySelector('#subject path')!;
    window.spinnerFixture.render({ result: 'success' });
    await pause(40);
    window.spinnerFixture.reduce(true);
    const immediate =
      path.getAttribute('d') === window.spinnerFixture.targets.success;
    await pause(120);
    const stable =
      path.getAttribute('d') === window.spinnerFixture.targets.success;
    window.spinnerFixture.render({ result: undefined });
    await pause(50);
    const circle = document.querySelector('#subject circle')!;
    const frozen = circle.outerHTML;
    await pause(100);
    const still = frozen === circle.outerHTML;
    window.spinnerFixture.render({ result: 'error' });
    const resolved =
      path.getAttribute('d') === window.spinnerFixture.targets.error;
    window.spinnerFixture.render({ result: undefined });
    window.spinnerFixture.reduce(false);
    await pause(60);
    const rotation = circle.getAttribute('style');
    await pause(80);
    return {
      immediate,
      stable,
      still,
      resolved,
      resumed: rotation !== circle.getAttribute('style'),
    };
  });
  expect(result).toEqual({
    immediate: true,
    stable: true,
    still: true,
    resolved: true,
    resumed: true,
  });
});

test('unmount cancels frame writes and an initially resolved remount starts at rest', async () => {
  const result = await page.evaluate(async () => {
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const path = document.querySelector('#subject path')!;
    window.spinnerFixture.render({ result: 'success' });
    await pause(40);
    window.spinnerFixture.render({ mounted: false });
    const last = path.getAttribute('d');
    const clearedRef = window.spinnerFixture.ref.current === null;
    await pause(140);
    const stopped = path.getAttribute('d') === last;
    window.spinnerFixture.render({ mounted: true });
    const next = document.querySelector('#subject path')!;
    const immediate =
      next.getAttribute('d') === window.spinnerFixture.targets.success;
    await pause(80);
    return {
      clearedRef,
      stopped,
      immediate,
      stable: next.getAttribute('d') === window.spinnerFixture.targets.success,
    };
  });
  expect(result).toEqual({
    clearedRef: true,
    stopped: true,
    immediate: true,
    stable: true,
  });
});

test('can resolve at the empty seam of the loading cycle without flashing a full circle', async () => {
  const result = await page.evaluate(async () => {
    const circle = document.querySelector<SVGCircleElement>('#subject circle')!;
    const path = document.querySelector('#subject path')!;
    const circumference = 2 * Math.PI * Number(circle.getAttribute('r'));
    const deadline = performance.now() + 2000;
    while (
      -parseFloat(circle.getAttribute('stroke-dashoffset')!) < circumference
    ) {
      if (performance.now() > deadline)
        throw new Error('Loading did not reach its empty seam');
      await new Promise(requestAnimationFrame);
    }
    window.spinnerFixture.render({ result: 'success' });
    // A fully hidden dash has no morphable geometry; the result fades in.
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const fading = Number(getComputedStyle(path.parentElement!).opacity) < 1;
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      fading,
      settled:
        path.getAttribute('d') === window.spinnerFixture.targets.success &&
        getComputedStyle(path.parentElement!).opacity === '1',
    };
  });
  expect(result).toEqual({ fading: true, settled: true });
});
