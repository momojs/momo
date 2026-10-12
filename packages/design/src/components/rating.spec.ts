import { expect, test } from '../../playwright.fixture';

test('configures accessible defaults and semantic styles', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { h, mount, Rating, slot } = window.designFixture;
    mount(h(Rating));
    const root = slot('rating');
    const items = root.querySelectorAll<HTMLElement>(
      '[data-slot="rating-item"]',
    );
    const first = items[0]!;
    return {
      tag: root.tagName,
      size: root.dataset.size,
      variant: root.dataset.variant,
      role: root.getAttribute('role'),
      tabIndex: root.tabIndex,
      min: root.getAttribute('aria-valuemin'),
      max: root.getAttribute('aria-valuemax'),
      value: root.getAttribute('aria-valuenow'),
      text: root.getAttribute('aria-valuetext'),
      className: root.className,
      count: items.length,
      itemClass: first.className,
      emptyClass: first.querySelector('svg')!.getAttribute('class'),
      clip: getComputedStyle(first.children[1]!).clipPath,
    };
  });
  expect(result).toMatchObject({
    tag: 'DIV',
    size: 'sm',
    variant: 'default',
    role: 'slider',
    tabIndex: 0,
    min: '0',
    max: '5',
    value: '0',
    text: '0 out of 5 stars',
    count: 5,
    clip: 'inset(0px 100% 0px 0px)',
  });
  expect(result.className).toContain('ring-momo-ring-focus/45');
  expect(result.itemClass).toContain('size-5');
  expect(result.itemClass).toContain('any-pointer-coarse:size-11');
  expect(result.emptyClass).toContain('text-momo-fg-subtle');
});

test('renders fractional values, variants, sizes, and slot classes', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { h, mount, Rating, slot } = window.designFixture;
    mount(
      h(Rating, {
        value: 2.5,
        precision: 0.5,
        size: 'lg',
        variant: 'yellow',
        icon: [['path', { d: 'M0 0L24 24', key: 'custom' }]],
        itemClassName: 'custom-item',
        emptyIconClassName: 'custom-empty',
        filledIconClassName: 'custom-filled',
      }),
    );
    const root = slot('rating');
    const partial = root.querySelector<HTMLElement>('[data-partial]')!;
    return {
      value: root.getAttribute('aria-valuenow'),
      size: root.dataset.size,
      variant: root.dataset.variant,
      className: partial.className,
      empty: partial.children[0]!.getAttribute('class'),
      filled: partial.children[1]!.children[0]!.getAttribute('class'),
      clip: getComputedStyle(partial.children[1]!).clipPath,
      path: partial.querySelector('path')!.getAttribute('d'),
    };
  });
  expect(result).toMatchObject({
    value: '2.5',
    size: 'lg',
    variant: 'yellow',
    clip: 'inset(0px 50% 0px 0px)',
    path: 'M0 0L24 24',
  });
  for (const name of ['size-7', 'custom-item'])
    expect(result.className).toContain(name);
  for (const name of ['text-momo-fg-warning/35', 'custom-empty'])
    expect(result.empty).toContain(name);
  for (const name of ['text-momo-fg-warning', 'custom-filled'])
    expect(result.filled).toContain(name);
});

test('normalizes max, precision, and values at their boundaries', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { h, mount, Rating, slot } = window.designFixture;
    return [
      { max: 0.5, value: 4 },
      { max: 3.9, value: 4 },
      { precision: 0.3, value: 2.6 },
      { precision: 0.25, value: 1.25 },
    ].map((props, index) => {
      mount(h(Rating, { ...props, key: index }));
      const root = slot('rating');
      const partial = root.querySelector('[data-partial]');
      return {
        max: root.getAttribute('aria-valuemax'),
        value: root.getAttribute('aria-valuenow'),
        count: root.querySelectorAll('[data-slot="rating-item"]').length,
        clip: partial ? getComputedStyle(partial.children[1]!).clipPath : null,
      };
    });
  });
  expect(result).toEqual([
    { max: '5', value: '4', count: 5, clip: null },
    { max: '3', value: '3', count: 3, clip: null },
    { max: '5', value: '3', count: 5, clip: null },
    { max: '5', value: '1.25', count: 5, clip: 'inset(0px 75% 0px 0px)' },
  ]);
});

test('supports read-only, disabled, and hidden form states', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { h, mount, Rating, slot } = window.designFixture;
    mount(h(Rating, { value: 4.5, precision: 0.5, readOnly: true }));
    const root = slot('rating');
    const readOnly = {
      role: root.getAttribute('role'),
      tabIndex: root.getAttribute('tabindex'),
      label: root.getAttribute('aria-label'),
      value: root.getAttribute('aria-valuenow'),
    };
    mount(
      h(Rating, {
        value: 3,
        name: 'score',
        form: 'review',
        disabled: true,
        tabIndex: 4,
      }),
    );
    const input = slot<HTMLInputElement>('rating-input');
    return {
      readOnly,
      disabled: {
        role: root.getAttribute('role'),
        tabIndex: root.getAttribute('tabindex'),
        aria: root.getAttribute('aria-disabled'),
        data: root.hasAttribute('data-disabled'),
      },
      input: {
        tag: input.tagName,
        name: input.name,
        form: input.getAttribute('form'),
        value: input.value,
        disabled: input.disabled,
      },
    };
  });
  expect(result).toEqual({
    readOnly: {
      role: 'img',
      tabIndex: null,
      label: '4.5 out of 5 stars',
      value: null,
    },
    disabled: { role: 'slider', tabIndex: null, aria: 'true', data: true },
    input: {
      tag: 'INPUT',
      name: 'score',
      form: 'review',
      value: '3',
      disabled: true,
    },
  });
});

test('handles keyboard changes and composes cancelable key handlers', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { h, mount, Rating, slot, key } = window.designFixture;
    const changes: number[] = [];
    const onValueChange = (value: number) => changes.push(value);
    mount(h(Rating, { value: 2, precision: 0.5, onValueChange }));
    const prevented = key(slot('rating'), 'ArrowRight').defaultPrevented;
    key(slot('rating'), 'End');
    mount(
      h(Rating, {
        value: 2,
        onValueChange,
        onKeyDown: (event) => event.preventDefault(),
      }),
    );
    key(slot('rating'), 'ArrowLeft');
    return { prevented, changes };
  });
  expect(result).toEqual({ prevented: true, changes: [2.5, 5] });
});

test('previews pointer values, focuses on selection, and clears repeats', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { h, mount, Rating, slot, pointer } = window.designFixture;
    const hovered: number[] = [];
    const changes: number[] = [];
    mount(
      h(Rating, {
        value: 2,
        precision: 0.5,
        onValueHover: (value) => hovered.push(value),
        onValueChange: (value) => changes.push(value),
      }),
    );
    const root = slot('rating');
    const item = root.querySelectorAll<HTMLElement>(
      '[data-slot="rating-item"]',
    )[1]!;
    const rect = item.getBoundingClientRect();
    pointer(item, 'pointermove', { clientX: rect.left + rect.width * 0.75 });
    const preview = [...hovered];
    pointer(item, 'click', { clientX: rect.left + rect.width * 0.75 });
    hovered.length = 0;
    pointer(item, 'pointermove', {
      pointerType: 'touch',
      clientX: rect.left + rect.width * 0.25,
    });
    return {
      preview,
      changes,
      focused: document.activeElement === root,
      touch: hovered,
    };
  });
  expect(result).toEqual({
    preview: [2],
    changes: [0],
    focused: true,
    touch: [],
  });
});

test('clears an active preview and skips interaction when disabled', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, Rating, slot, pointer, waitFor } = window.designFixture;
    const hovered: number[] = [];
    const changes: number[] = [];
    mount(h(Rating, { onValueHover: (value) => hovered.push(value) }));
    const third = document.querySelectorAll<HTMLElement>(
      '[data-slot="rating-item"]',
    )[2]!;
    const rect = third.getBoundingClientRect();
    pointer(third, 'pointermove', { clientX: rect.right - 1 });
    await waitFor(() => slot('rating').hasAttribute('data-hovered'));
    pointer(third, 'pointerout', { relatedTarget: document.body });
    await waitFor(() => !slot('rating').hasAttribute('data-hovered'));
    const cleared = !slot('rating').hasAttribute('data-hovered');
    mount(
      h(Rating, {
        disabled: true,
        onValueChange: (value) => changes.push(value),
      }),
    );
    pointer(slot('rating-item'), 'click');
    return { hovered, cleared, changes };
  });
  expect(result).toEqual({ hovered: [3, 0], cleared: true, changes: [] });
});

test('fills and clears items in order through fractional values', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, Rating, slot, waitFor } = window.designFixture;
    mount(h(Rating, { value: 0, precision: 0.5, name: 'score' }));
    const layers = Array.from(
      slot('rating').querySelectorAll('[data-slot="rating-item"]'),
      (item) => item.children[1]!,
    );
    const fills = () =>
      layers.map((layer) => {
        const inset = getComputedStyle(layer).clipPath.split(/\s+/)[1]!;
        return 1 - Number.parseFloat(inset) / 100;
      });
    const sampleUntil = async (target: number) => {
      const frames: number[][] = [];
      await waitFor(() => {
        const frame = fills();
        frames.push(frame);
        return frame.every(
          (fill, index) =>
            Math.abs(fill - Math.min(1, Math.max(0, target - index))) < 0.001,
        );
      }, 'Rating fill did not reach its target');
      return frames;
    };

    mount(h(Rating, { value: 5, precision: 0.5, name: 'score' }));
    const committed = {
      value: slot('rating').getAttribute('aria-valuenow'),
      input: slot<HTMLInputElement>('rating-input').value,
    };
    const increasing = await sampleUntil(5);
    mount(h(Rating, { value: 1.5, precision: 0.5, name: 'score' }));
    const decreasing = await sampleUntil(1.5);
    return { committed, increasing, decreasing };
  });
  expect(result.committed).toEqual({ value: '5', input: '5' });
  for (const frames of [result.increasing, result.decreasing]) {
    expect(
      frames.some((frame) =>
        frame.some((fill) => fill > 0.001 && fill < 0.999),
      ),
    ).toBe(true);
    for (const frame of frames) {
      // Only the leading edge can be partial; every item before it is full.
      for (let index = 1; index < frame.length; index++) {
        if (frame[index]! > 0.001)
          expect(frame[index - 1]!).toBeGreaterThan(0.999);
      }
    }
  }
  expect(result.increasing.at(-1)).toEqual([1, 1, 1, 1, 1]);
  expect(result.decreasing.at(-1)).toEqual([1, 0.5, 0, 0, 0]);
});

test('redirects an active preview and settles when reduced motion is enabled', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, Rating, slot, pointer, reduce, waitFor } =
      window.designFixture;
    mount(h(Rating, { value: 0.5, precision: 0.5 }));
    const items = Array.from(
      slot('rating').querySelectorAll<HTMLElement>('[data-slot="rating-item"]'),
    );
    const fills = () =>
      items.map((item) => {
        const inset = getComputedStyle(item.children[1]!).clipPath.split(
          /\s+/,
        )[1]!;
        return 1 - Number.parseFloat(inset) / 100;
      });
    const total = () => fills().reduce((sum, fill) => sum + fill, 0);
    const preview = (index: number) => {
      const item = items[index]!;
      pointer(item, 'pointermove', {
        clientX: item.getBoundingClientRect().right - 1,
      });
    };
    preview(4);
    await waitFor(() => total() > 2 && total() < 4);
    const beforeReverse = total();
    preview(0);
    const afterReverse = total();
    await waitFor(() => total() < beforeReverse);
    const reversing = fills();

    // Redirect again before the previous preview finishes, then disable motion.
    preview(4);
    await waitFor(() => total() > 3 && total() < 5);
    reduce(true);
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const reducedFill = fills();
    pointer(items[4]!, 'pointerout', { relatedTarget: document.body });
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return {
      beforeReverse,
      afterReverse,
      reversing,
      reducedFill,
      restoredFill: fills(),
      value: slot('rating').getAttribute('aria-valuenow'),
    };
  });
  expect(result.afterReverse).toBeCloseTo(result.beforeReverse, 2);
  for (let index = 1; index < result.reversing.length; index++) {
    if (result.reversing[index]! > 0.001)
      expect(result.reversing[index - 1]!).toBeGreaterThan(0.999);
  }
  expect(result.reducedFill).toEqual([1, 1, 1, 1, 1]);
  expect(result.restoredFill).toEqual([0.5, 0, 0, 0, 0]);
  expect(result.value).toBe('0.5');
});

test('removes fill duration when reduced motion is preferred', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, Rating, slot, reduce, pointer, waitFor } =
      window.designFixture;
    reduce(true);
    mount(h(Rating, { value: 0 }));
    mount(h(Rating, { value: 1 }));
    const item = slot('rating-item');
    const fill = item.children[1]!;
    await waitFor(
      () => getComputedStyle(fill).clipPath === 'inset(0px 0% 0px 0px)',
    );
    pointer(item, 'pointerover');
    pointer(item, 'pointerdown', { button: 0, isPrimary: true });
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return {
      value: slot('rating').getAttribute('aria-valuenow'),
      transform: getComputedStyle(item).transform,
      clip: getComputedStyle(fill).clipPath,
      animations: fill
        .getAnimations()
        .filter((animation) => animation.playState === 'running').length,
    };
  });
  expect(result).toEqual({
    value: '1',
    transform: 'none',
    clip: 'inset(0px 0% 0px 0px)',
    animations: 0,
  });
});
