import { expect, test } from '../../playwright.fixture';
import type {} from './spinner.fixture';

test.use({
  fixturePath: 'spinner-morph',
  readySelector: '#subject circle',
});

test('hands the rendered dash and its rotation to the same path before morphing', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    await new Promise((resolve) => setTimeout(resolve, 180));
    const svg = document.querySelector<SVGSVGElement>('#subject')!;
    const circle = svg.querySelector('circle')!;
    const path = svg.querySelector('path')!;
    const toast = document.querySelector('#toast svg')!;
    const length = parseFloat(circle.getAttribute('stroke-dasharray')!);
    const offset = parseFloat(circle.getAttribute('stroke-dashoffset')!);
    // Chromium approximates circle geometry too coarsely for this tolerance.
    // Measure an equivalent native SVG path independently of the morph helper.
    const reference = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    );
    const { value: cx } = circle.cx.baseVal;
    const { value: cy } = circle.cy.baseVal;
    const { value: radius } = circle.r.baseVal;
    reference.setAttribute(
      'd',
      `M${cx + radius} ${cy} A${radius} ${radius} 0 1 1 ${cx - radius} ${cy} A${radius} ${radius} 0 1 1 ${cx + radius} ${cy}`,
    );
    const circumference = reference.getTotalLength();
    const start = Math.min(circumference, Math.max(0, -offset));
    const end = Math.min(circumference, Math.max(0, length - offset));
    const rotation = svg.getCTM()!.inverse().multiply(circle.getCTM()!);
    const from = reference.getPointAtLength(start).matrixTransform(rotation);
    const to = reference.getPointAtLength(end).matrixTransform(rotation);
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

test('retargets in flight and cancels the old morph when loading restarts', async ({
  page,
}) => {
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

test('morph=false stops a pending morph and switches immediately while loading still runs', async ({
  page,
}) => {
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

test('reduced motion stops the active morph and loading loop immediately', async ({
  page,
}) => {
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

test('unmount cancels frame writes and an initially resolved remount starts at rest', async ({
  page,
}) => {
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

test('can resolve at the empty seam of the loading cycle without flashing a full circle', async ({
  page,
}) => {
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
