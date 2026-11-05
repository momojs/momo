import { expect, test } from '../../playwright.fixture';

test('shimmer and pulse loops run while solid renders a single static frame', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { h, mount, Skeleton, slot } = window.designFixture;
    mount(
      h(
        'div',
        null,
        h(Skeleton, {
          id: 'shimmer',
          className: 'block',
          style: { width: 160, height: 40 },
        }),
        h(Skeleton, {
          id: 'pulse',
          variant: 'pulse',
          duration: 0.4,
          className: 'block',
          style: { width: 160, height: 40 },
        }),
        h(Skeleton, {
          id: 'solid',
          variant: 'solid',
          className: 'block',
          style: { width: 160, height: 40 },
        }),
      ),
    );
    void slot;
  });
  const read = () =>
    page.evaluate(() => ({
      shimmer: getComputedStyle(
        document.querySelector<HTMLElement>(
          '#shimmer [data-slot="skeleton-shimmer"]',
        )!,
      ).transform,
      pulse: getComputedStyle(
        document.querySelector<HTMLElement>(
          '#pulse [data-slot="skeleton-pulse"]',
        )!,
      ).opacity,
      solidLayers: document.querySelectorAll('#solid [data-slot^="skeleton-"]')
        .length,
      boxes: ['shimmer', 'pulse', 'solid'].map((id) => {
        const box = document
          .querySelector<HTMLElement>(`#${id}`)!
          .getBoundingClientRect();
        return [box.width, box.height];
      }),
    }));
  const first = await read();
  await page.waitForTimeout(250);
  const second = await read();

  expect(first.solidLayers).toBe(0);
  expect(first.shimmer).not.toBe(second.shimmer);
  expect(first.pulse).not.toBe(second.pulse);
  expect(second.boxes).toEqual(first.boxes);
  expect(first.boxes[0]).toEqual([160, 40]);
});

test('non-finite and non-positive durations keep the loop running', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { h, mount, Skeleton } = window.designFixture;
    mount(
      h('div', null, [
        h(Skeleton, { key: 'a', id: 'a', duration: 0, className: 'block' }),
        h(Skeleton, {
          key: 'b',
          id: 'b',
          duration: Number.NaN,
          className: 'block',
        }),
        h(Skeleton, { key: 'c', id: 'c', duration: -1, className: 'block' }),
      ]),
    );
  });
  const sample = () =>
    page.evaluate(() =>
      ['a', 'b', 'c'].map(
        (id) =>
          getComputedStyle(
            document.querySelector<HTMLElement>(
              `#${id} [data-slot="skeleton-shimmer"]`,
            )!,
          ).transform,
      ),
    );
  const first = await sample();
  await page.waitForTimeout(300);
  const second = await sample();
  // Every instance must animate: an invalid duration cannot freeze the loop.
  expect(first.every((value, index) => value !== second[index])).toBe(true);
});

test('text lines inherit the host font size and keep the short final line', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { h, mount, SkeletonText } = window.designFixture;
    mount(
      h(SkeletonText, {
        lines: 3,
        lastLineRatio: 0.5,
        className: 'text-sm',
        style: { width: 200 },
      }),
    );
    const root = document.querySelector<HTMLElement>(
      '[data-slot="skeleton-text"]',
    )!;
    const lines = [
      ...root.querySelectorAll<HTMLElement>('[data-slot="skeleton-line"]'),
    ];
    return {
      count: lines.length,
      heights: lines.map((line) => line.getBoundingClientRect().height),
      total: root.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(getComputedStyle(root).lineHeight),
      widths: lines.map((line) =>
        Math.round(line.getBoundingClientRect().width),
      ),
      loops: root.querySelectorAll('[data-slot="skeleton-shimmer"]').length,
    };
  });
  expect(result.count).toBe(3);
  expect(new Set(result.heights).size).toBe(1);
  expect(result.heights[0]).toBeGreaterThan(10);
  // Three placeholder rows are exactly as tall as three lines of real text.
  expect(result.total).toBeCloseTo(result.lineHeight * 3, 0);
  expect(result.widths[0]).toBe(200);
  expect(result.widths[2]).toBe(100);
  expect(result.loops).toBe(3);
});

test('reduced motion renders static placeholders without dropping layout', async ({
  page,
}) => {
  // This Playwright build ignores emulateMedia for reduced motion, so stub the
  // query before the first component mounts. The theme caches it on first use.
  await page.evaluate(() => {
    const query = (value: boolean) => ({
      matches: value,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {
        /* stub */
      },
      removeEventListener: () => {
        /* stub */
      },
      addListener: () => {
        /* stub */
      },
      removeListener: () => {
        /* stub */
      },
      onchange: null,
      dispatchEvent: () => false,
    });
    window.matchMedia = ((text: string) =>
      query(
        text.includes('prefers-reduced-motion'),
      )) as typeof window.matchMedia;
  });
  const result = await page.evaluate(() => {
    const { h, mount, Skeleton, SkeletonText } = window.designFixture;
    mount(
      h('div', null, [
        h(Skeleton, {
          key: 'a',
          id: 'a',
          className: 'block',
          style: { width: 160, height: 40 },
        }),
        h(SkeletonText, {
          key: 'b',
          lines: 2,
          className: 'text-sm',
          style: { width: 200 },
        }),
      ]),
    );
    return {
      loops: document.querySelectorAll(
        '[data-slot="skeleton-shimmer"], [data-slot="skeleton-pulse"]',
      ).length,
      box: document.querySelector<HTMLElement>('#a')!.getBoundingClientRect()
        .height,
      lines: document.querySelectorAll('[data-slot="skeleton-line"]').length,
    };
  });
  expect(result).toEqual({ loops: 0, box: 40, lines: 2 });
});

test('render composes semantic elements and merges classes and refs', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { h, mount, Skeleton, createRef, slot } = window.designFixture;
    const ref = createRef<HTMLDivElement>();
    mount(
      h(Skeleton, {
        ref,
        shape: 'circle',
        className: 'size-6',
        render: (props, state) =>
          h('span', { ...props, 'data-testid': `rendered-${state.shape}` }),
      }),
    );
    const element = slot('skeleton');
    return {
      tag: element.tagName,
      testId: element.getAttribute('data-testid'),
      classes: element.className,
      ref: ref.current === element,
      ariaHidden: element.getAttribute('aria-hidden'),
    };
  });
  expect(result).toMatchObject({
    tag: 'SPAN',
    testId: 'rendered-circle',
    ref: true,
    ariaHidden: 'true',
  });
  expect(result.classes).toContain('size-6');
  expect(result.classes).toContain('rounded-momo-full');
});

test('the placeholder wipes away left to right and unmounts after the handoff', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, SkeletonReveal, slot, waitFor } = window.designFixture;
    const state = { pending: true };
    mount(
      h(
        SkeletonReveal,
        {
          pending: true,
          duration: 0.4,
          className: 'w-40',
          fallback: h('div', { id: 'cover' }, 'placeholder'),
        },
        h('p', { id: 'content' }, 'Loaded'),
      ),
    );
    const fallback = () =>
      document.querySelector('[data-slot="skeleton-reveal-fallback"]');
    const content = document.querySelector<HTMLElement>('#content')!;
    void slot;
    void state;
    const covered = {
      present: fallback() !== null,
      inert: content
        .closest('[data-slot="skeleton-reveal-content"]')!
        .hasAttribute('inert'),
      hidden: content
        .closest('[data-slot="skeleton-reveal-content"]')!
        .getAttribute('aria-hidden'),
      position: getComputedStyle(fallback()!).maskPosition,
      height: document
        .querySelector('[data-slot="skeleton-reveal"]')!
        .getBoundingClientRect().height,
    };
    mount(
      h(
        SkeletonReveal,
        {
          pending: false,
          duration: 0.4,
          className: 'w-40',
          fallback: h('div', { id: 'cover' }, 'placeholder'),
        },
        h('p', { id: 'content' }, 'Loaded'),
      ),
    );
    const during = fallback() !== null;
    // Motion writes the first exit frame on the next tick, not during mount.
    await waitFor(() => {
      const node = fallback();
      return node === null || getComputedStyle(node).maskPosition !== '100% 0%';
    }, 'wipe did not start');
    const mid = fallback() ? getComputedStyle(fallback()!).maskPosition : '';
    await waitFor(() => fallback() === null, 'fallback did not leave');
    return { covered, during, mid };
  });
  expect(result.covered.present).toBe(true);
  expect(result.covered.inert).toBe(true);
  expect(result.covered.hidden).toBe('true');
  expect(result.covered.position).toContain('100%');
  expect(result.during).toBe(true);
  expect(result.mid).not.toContain('100% 0%');
  expect(result.covered.height).toBeGreaterThan(0);
});

test('content becomes interactive again after the handoff and the box keeps its height', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, SkeletonReveal, click, waitFor } = window.designFixture;
    let clicked = 0;
    mount(
      h(
        SkeletonReveal,
        { pending: true, duration: 0.2 },
        h(
          'button',
          { type: 'button', id: 'action', onClick: () => clicked++ },
          'Open',
        ),
      ),
    );
    const button = document.querySelector<HTMLButtonElement>('#action')!;
    const whilePending = {
      inert: button
        .closest('[data-slot="skeleton-reveal-content"]')!
        .hasAttribute('inert'),
      height: document
        .querySelector('[data-slot="skeleton-reveal"]')!
        .getBoundingClientRect().height,
    };
    mount(
      h(
        SkeletonReveal,
        { pending: false, duration: 0.2 },
        h(
          'button',
          { type: 'button', id: 'action', onClick: () => clicked++ },
          'Open',
        ),
      ),
    );
    await waitFor(
      () => !document.querySelector('[data-slot="skeleton-reveal-fallback"]'),
      'handoff did not finish',
    );
    click(document.querySelector<HTMLButtonElement>('#action')!);
    return {
      whilePending,
      after: {
        inert: document
          .querySelector('[data-slot="skeleton-reveal-content"]')!
          .hasAttribute('inert'),
        height: document
          .querySelector('[data-slot="skeleton-reveal"]')!
          .getBoundingClientRect().height,
        clicked,
      },
    };
  });
  expect(result.whilePending.inert).toBe(true);
  expect(result.after.inert).toBe(false);
  expect(result.after.clicked).toBe(1);
  expect(result.after.height).toBe(result.whilePending.height);
});

test('fade cross-fades the placeholder out', async ({ page }) => {
  const fade = await page.evaluate(async () => {
    const { h, mount, SkeletonReveal, waitFor } = window.designFixture;
    mount(h(SkeletonReveal, { pending: true, reveal: 'fade', duration: 0.2 }));
    const root = document.querySelector('[data-slot="skeleton-reveal"]')!;
    mount(h(SkeletonReveal, { pending: false, reveal: 'fade', duration: 0.2 }));
    await waitFor(() => {
      const node = document.querySelector(
        '[data-slot="skeleton-reveal-fallback"]',
      );
      return node === null || Number(getComputedStyle(node).opacity) < 1;
    }, 'fade did not start');
    const node = document.querySelector(
      '[data-slot="skeleton-reveal-fallback"]',
    );
    const opacity = node ? Number(getComputedStyle(node).opacity) : 0;
    await waitFor(
      () => !document.querySelector('[data-slot="skeleton-reveal-fallback"]'),
      'fade did not finish',
    );
    return { reveal: root.getAttribute('data-reveal'), opacity };
  });
  expect(fade.reveal).toBe('fade');
  expect(fade.opacity).toBeLessThan(1);
});

test('reduced motion removes the handoff entirely', async ({ page }) => {
  // The theme caches the media query on first use, so stub it before mounting.
  await page.evaluate(() => {
    window.matchMedia = ((text: string) =>
      ({
        matches: text.includes('prefers-reduced-motion'),
        media: text,
        addEventListener: () => {
          /* stub */
        },
        removeEventListener: () => {
          /* stub */
        },
        addListener: () => {
          /* stub */
        },
        removeListener: () => {
          /* stub */
        },
        onchange: null,
        dispatchEvent: () => false,
      }) as MediaQueryList) as typeof window.matchMedia;
  });
  const result = await page.evaluate(async () => {
    const { h, mount, SkeletonReveal, waitFor } = window.designFixture;
    mount(h(SkeletonReveal, { pending: true, duration: 3 }));
    const covered =
      document.querySelector('[data-slot="skeleton-reveal-fallback"]') !== null;
    const startedAt = performance.now();
    mount(h(SkeletonReveal, { pending: false, duration: 3 }));
    await waitFor(
      () => !document.querySelector('[data-slot="skeleton-reveal-fallback"]'),
      'handoff never finished',
    );
    // A 3s handoff finishes at once when motion is reduced.
    return { covered, elapsed: performance.now() - startedAt };
  });
  expect(result.covered).toBe(true);
  expect(result.elapsed).toBeLessThan(200);
});

test('covered content stays hidden behind a sparse placeholder and unmasks after the wipe', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, SkeletonReveal, waitFor } = window.designFixture;
    const view = (pending: boolean) =>
      h(
        SkeletonReveal,
        {
          pending,
          duration: 0.3,
          // A sparse placeholder: one thin bar, gaps everywhere else.
          fallback: h('div', { style: { height: 4, width: 40 } }),
        },
        h('p', { id: 'content', style: { height: 60 } }, 'Loaded'),
      );
    mount(view(true));
    const content = () =>
      document.querySelector<HTMLElement>(
        '[data-slot="skeleton-reveal-content"]',
      )!;
    const pending = {
      image: getComputedStyle(content()).maskImage,
      position: getComputedStyle(content()).maskPosition,
    };
    mount(view(false));
    await waitFor(
      () => getComputedStyle(content()).maskImage === 'none',
      'content mask was not removed',
    );
    // Content is fully visible once settled, so nothing is left to clip.
    return { pending, after: getComputedStyle(content()).maskImage };
  });
  expect(result.pending.image).toContain('linear-gradient');
  expect(result.pending.position).toBe('100% 0%');
  expect(result.after).toBe('none');
});

test('loops inside a revealing placeholder still animate', async ({ page }) => {
  await page.evaluate(() => {
    const { h, mount, SkeletonReveal } = window.designFixture;
    mount(
      h(
        SkeletonReveal,
        { pending: true, className: 'block', style: { width: 160 } },
        h('div', { style: { height: 40 } }),
      ),
    );
  });
  const read = () =>
    page.evaluate(
      () =>
        getComputedStyle(
          document.querySelector<HTMLElement>(
            '[data-slot="skeleton-shimmer"]',
          )!,
        ).transform,
    );
  const first = await read();
  await page.waitForTimeout(250);
  expect(await read()).not.toBe(first);
});
