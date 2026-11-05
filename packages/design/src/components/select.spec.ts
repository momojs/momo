import { expect, test } from '../../playwright.fixture';
import type { SelectProps } from './select';

for (const slotMode of ['implicit', 'explicit true'] as const) {
  test(`renders the default slot structure, sizes, and popup exit motion with ${slotMode} slots`, async ({
    page,
  }) => {
    const result = await page.evaluate(async (slotMode) => {
      const { h, mount, Select, slot, createRef, waitFor } =
        window.designFixture;
      const actionsRef = createRef<{ unmount: () => void }>();
      const options = [
        {
          value: 'apple',
          label: 'Apple',
          textValue: 'Apple fruit',
          className: 'option-item',
        },
        { value: 'banana', label: 'Banana', disabled: true },
      ];
      const slots: Partial<SelectProps<string>> =
        slotMode === 'explicit true'
          ? {
              trigger: true,
              valueSlot: true,
              icon: true,
              portal: true,
              positioner: true,
              popup: true,
              list: true,
              item: true,
              itemText: true,
              itemIndicator: true,
            }
          : {};
      const props = {
        ...slots,
        value: 'apple',
        options,
        actionsRef,
        scrollUpArrow: { keepMounted: true },
        scrollDownArrow: { keepMounted: true },
      };
      mount(h(Select<string>, { ...props, open: true }));
      await waitFor(
        () => !!document.querySelector('[data-slot="select-popup"]'),
      );
      const popup = slot('select-popup');
      const initial = getComputedStyle(popup);
      const initialScale = new DOMMatrix(initial.transform).a;
      const structure = [
        'trigger',
        'value',
        'icon',
        'portal',
        'positioner',
        'popup',
        'list',
        'item-text',
        'item-indicator',
        'scroll-up-arrow',
        'scroll-down-arrow',
      ].map((name) => slot(`select-${name}`).dataset.slot);
      const items = [
        ...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]'),
      ];
      await waitFor(
        () =>
          getComputedStyle(popup).opacity === '1' &&
          getComputedStyle(popup).transform === 'none',
      );
      const triggerBox = slot('select-trigger').getBoundingClientRect();
      const popupBox = popup.getBoundingClientRect();
      const actions = typeof actionsRef.current?.unmount;
      mount(h(Select<string>, { ...props, open: false }));
      const retained = popup.isConnected;
      await waitFor(() => !popup.isConnected);
      return {
        structure,
        count: items.length,
        triggerClass: slot('select-trigger').className,
        itemClass: items[0]!.className,
        initialScale,
        offset: popupBox.top - triggerBox.bottom,
        actions,
        retained,
        removed: !popup.isConnected,
      };
    }, slotMode);
    expect(result.structure).toEqual(
      [
        'trigger',
        'value',
        'icon',
        'portal',
        'positioner',
        'popup',
        'list',
        'item-text',
        'item-indicator',
        'scroll-up-arrow',
        'scroll-down-arrow',
      ].map((name) => `select-${name}`),
    );
    expect(result.count).toBe(2);
    expect(result.triggerClass).toContain('h-9');
    expect(result.itemClass).toContain('min-h-8');
    expect(result.itemClass.split(' ')).toContain('option-item');
    expect(result.initialScale).toBeLessThan(1);
    expect(result.offset).toBeCloseTo(6, 0);
    expect(result).toMatchObject({
      actions: 'function',
      retained: true,
      removed: true,
    });
  });
}

test('keeps popup travel and scale still when reduced motion is preferred', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, Select, slot, reduce, waitFor } = window.designFixture;
    reduce(true);
    const props = {
      value: 'apple',
      options: [{ value: 'apple', label: 'Apple' }],
    };
    mount(h(Select<string>, { ...props, open: true }));
    await waitFor(() => !!document.querySelector('[data-slot="select-popup"]'));
    const popup = slot('select-popup');
    const opening = getComputedStyle(popup).transform;
    await waitFor(() => getComputedStyle(popup).opacity === '1');
    mount(h(Select<string>, { ...props, open: false }));
    const exiting = getComputedStyle(popup).transform;
    await waitFor(() => !popup.isConnected);
    return { opening, exiting, removed: !popup.isConnected };
  });
  expect(result).toEqual({ opening: 'none', exiting: 'none', removed: true });
});

test('resolves trigger, value, and icon state through direct cva classes', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, Select, slot, waitFor } = window.designFixture;
    const options = [{ value: 'apple', label: 'Apple' }];
    mount(h(Select<string>, { options, value: 'apple', open: true }));
    await waitFor(
      () => slot('select-trigger').getAttribute('aria-expanded') === 'true',
    );
    const open = slot('select-trigger').className;
    const icon = slot('select-icon').className;
    mount(
      h(Select<string>, {
        options,
        value: 'apple',
        open: false,
        disabled: true,
      }),
    );
    const disabled = slot('select-trigger').className;
    mount(
      h(Select<string>, { options, value: null, open: false, readOnly: true }),
    );
    return {
      open,
      icon,
      disabled,
      readOnly: slot('select-trigger').className,
      placeholder: slot('select-value').className,
    };
  });
  for (const name of [
    'border-momo-ring-focus',
    'ring-2',
    'ring-momo-ring-focus/25',
  ])
    expect(result.open.split(' ')).toContain(name);
  for (const name of ['cursor-not-allowed', 'opacity-50'])
    expect(result.disabled.split(' ')).toContain(name);
  expect(result.readOnly).toContain('cursor-default');
  expect(result.placeholder).toContain('text-momo-fg-muted');
  expect(result.icon).toContain('rotate-180');
  expect(result.icon).toContain('text-momo-fg-default');
  expect(result.icon).not.toContain('text-momo-fg-muted');
  for (const selector of [
    'data-[popup-open]',
    'data-[disabled]',
    'data-[readonly]',
    'data-placeholder:',
    'group-data-[popup-open]',
  ])
    expect(Object.values(result).join(' ')).not.toContain(selector);
});

test('resolves item state and merges slot and option classes', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, Select, waitFor } = window.designFixture;
    mount(
      h(Select<string>, {
        open: true,
        value: 'apple',
        size: 'lg',
        item: {
          className: (state) =>
            state.selected ? 'slot-selected' : 'slot-idle',
        },
        options: [
          { value: 'apple', label: 'Apple', className: 'option-item' },
          { value: 'banana', label: 'Banana', disabled: true },
        ],
      }),
    );
    await waitFor(
      () => document.querySelectorAll('[data-slot="select-item"]').length === 2,
    );
    const items = document.querySelectorAll<HTMLElement>(
      '[data-slot="select-item"]',
    );
    return { selected: items[0]!.className, disabled: items[1]!.className };
  });
  for (const name of ['min-h-9', 'option-item', 'slot-selected'])
    expect(result.selected.split(' ')).toContain(name);
  for (const name of [
    'pointer-events-none',
    'text-momo-fg-subtle',
    'opacity-50',
  ])
    expect(result.disabled.split(' ')).toContain(name);
  expect(result.disabled).not.toContain('text-momo-fg-default');
  expect(result.selected).not.toContain('data-[selected]');
  expect(result.disabled).not.toContain('data-[disabled]');
});

test('composes top-level slot configs, refs and render state', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, Select, slot, waitFor, createRef } = window.designFixture;
    const triggerRef = createRef<HTMLButtonElement>();
    const popupRef = createRef<HTMLDivElement>();
    const itemRef = createRef<HTMLDivElement>();
    mount(
      h(Select<string>, {
        open: true,
        value: 'apple',
        options: [{ value: 'apple', label: 'Apple' }],
        indicator: h('span', { 'data-custom-indicator': '' }),
        trigger: {
          'data-config': 'trigger',
          'aria-label': 'Configured trigger',
          className: 'slot-trigger',
          ref: triggerRef,
          render: (props, state) =>
            h('button', { ...props, 'data-render-open': state.open }),
        },
        valueSlot: {
          'data-config': 'value',
          'aria-live': 'polite',
          className: 'slot-value',
        },
        icon: { 'data-config': 'icon', className: 'slot-icon' },
        portal: { 'data-config': 'portal' },
        positioner: {
          'data-config': 'positioner',
          align: 'end',
          className: 'slot-positioner',
        },
        popup: {
          'data-config': 'popup',
          finalFocus: false,
          className: 'slot-popup',
          ref: popupRef,
        },
        list: {
          'data-config': 'list',
          'aria-label': 'Configured list',
          className: 'slot-list',
        },
        item: {
          'data-config': 'item',
          'aria-label': 'Configured item',
          className: 'slot-item',
          ref: itemRef,
          render: (props, state) =>
            h('div', { ...props, 'data-render-selected': state.selected }),
        },
        itemText: { 'data-config': 'item-text', className: 'slot-item-text' },
        itemIndicator: {
          'data-config': 'item-indicator',
          className: 'slot-item-indicator',
        },
        scrollUpArrow: {
          'data-config': 'scroll-up',
          'aria-label': 'Configured scroll up',
          className: 'slot-scroll-up-arrow',
          keepMounted: true,
        },
        scrollDownArrow: {
          'data-config': 'scroll-down',
          'aria-label': 'Configured scroll down',
          className: 'slot-scroll-down-arrow',
          keepMounted: true,
        },
      } as SelectProps<string>),
    );
    await waitFor(
      () => !!document.querySelector('[data-slot="select-item-indicator"]'),
    );
    const names = [
      'trigger',
      'value',
      'icon',
      'portal',
      'positioner',
      'popup',
      'list',
      'item',
      'item-text',
      'item-indicator',
      'scroll-up-arrow',
      'scroll-down-arrow',
    ];
    return {
      slots: names.map((name) => {
        const node = slot(`select-${name}`);
        return {
          name,
          config: node.dataset.config,
          className: node.className,
          label: node.getAttribute('aria-label'),
        };
      }),
      live: slot('select-value').getAttribute('aria-live'),
      align: slot('select-positioner').dataset.align,
      indicator: !!slot('select-item-indicator').querySelector(
        '[data-custom-indicator]',
      ),
      refs: [
        triggerRef.current === slot('select-trigger'),
        popupRef.current === slot('select-popup'),
        itemRef.current === slot('select-item'),
      ],
      renderOpen: slot('select-trigger').dataset.renderOpen,
      renderSelected: slot('select-item').dataset.renderSelected,
    };
  });
  expect(result.slots.map(({ config }) => config)).toEqual([
    'trigger',
    'value',
    'icon',
    'portal',
    'positioner',
    'popup',
    'list',
    'item',
    'item-text',
    'item-indicator',
    'scroll-up',
    'scroll-down',
  ]);
  for (const { name, className } of result.slots) {
    if (name === 'portal') continue;
    expect(className).toContain(`slot-${name}`);
  }
  expect(
    result.slots.filter(({ label }) => label).map(({ label }) => label),
  ).toEqual([
    'Configured trigger',
    'Configured list',
    'Configured item',
    'Configured scroll up',
    'Configured scroll down',
  ]);
  expect(result).toMatchObject({
    live: 'polite',
    align: 'end',
    indicator: true,
    refs: [true, true, true],
    renderOpen: 'true',
    renderSelected: 'true',
  });
});

test('hides optional slots while preserving generated option selection', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, Select, slot, click, waitFor } = window.designFixture;
    const changes: string[] = [];
    mount(
      h(Select<string>, {
        open: true,
        defaultValue: 'apple',
        options: [
          { value: 'apple', label: 'Apple' },
          { value: 'banana', label: 'Banana' },
        ],
        trigger: { 'aria-label': 'Fruit' },
        valueSlot: false,
        icon: false,
        itemIndicator: false,
        scrollUpArrow: false,
        scrollDownArrow: false,
        onChange: (value) => changes.push(value),
      }),
    );
    await waitFor(
      () => document.querySelectorAll('[data-slot="select-item"]').length === 2,
    );
    const hidden = [
      'value',
      'icon',
      'item-indicator',
      'scroll-up-arrow',
      'scroll-down-arrow',
    ].map(
      (name) =>
        document.querySelectorAll(`[data-slot="select-${name}"]`).length,
    );
    const items = document.querySelectorAll<HTMLElement>(
      '[data-slot="select-item"]',
    );
    click(items[1]!);
    await waitFor(() => changes.length === 1);
    return {
      hidden,
      changes,
      triggerLabel: slot('select-trigger').getAttribute('aria-label'),
      selected: [...items].map((item) => item.getAttribute('aria-selected')),
    };
  });
  expect(result).toEqual({
    hidden: [0, 0, 0, 0, 0],
    changes: ['banana'],
    triggerLabel: 'Fruit',
    selected: ['false', 'true'],
  });
});

test('leaves unmounting to Base UI without the default popup motion', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, Select, waitFor } = window.designFixture;
    const options = [{ value: 'apple', label: 'Apple' }];
    mount(h(Select<string>, { options, open: true, portal: false }));
    const withoutPortal = !document.querySelector(
      '[data-slot="select-portal"]',
    );
    mount(
      h(Select<string>, {
        options,
        open: true,
        popup: { render: h('div', { id: 'custom-popup' }) },
      }),
    );
    await waitFor(() => !!document.getElementById('custom-popup'));
    const popup = document.getElementById('custom-popup')!;
    const transform = getComputedStyle(popup).transform;
    mount(
      h(Select<string>, {
        options,
        open: false,
        popup: { render: h('div', { id: 'custom-popup' }) },
      }),
    );
    await waitFor(() => !popup.isConnected);
    return { withoutPortal, transform, removed: !popup.isConnected };
  });
  expect(result).toEqual({
    withoutPortal: true,
    transform: 'none',
    removed: true,
  });
});

test('honors canceled value and open changes before simplified updates', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { h, mount, Select, SelectParts, slot, click, key, waitFor } =
      window.designFixture;
    let cancelValue = true;
    let cancelOpen = true;
    const changes: string[] = [];
    const requests: (string | null)[] = [];
    const opens: boolean[] = [];
    mount(
      h(
        Select<string>,
        {
          defaultOpen: true,
          defaultValue: 'apple',
          options: [
            { value: 'apple', label: 'Apple' },
            { value: 'banana', label: 'Banana' },
          ],
          onChange: (value) => changes.push(value),
          onValueChange(value, details) {
            requests.push(value);
            if (cancelValue) details.cancel();
          },
          onOpenChange(open, details) {
            opens.push(open);
            if (cancelOpen) details.cancel();
          },
        },
        ...(['apple', 'banana', null] as const).map((value) =>
          h(
            SelectParts.Item,
            {
              value,
              key: value ?? 'clear',
              render: h('div', { 'data-choice': value ?? 'clear' }),
            },
            h(SelectParts.ItemText, null, value ?? 'Clear'),
          ),
        ),
      ),
    );
    await waitFor(
      () => !!document.querySelector<HTMLElement>('[data-choice="banana"]'),
    );
    click(document.querySelector<HTMLElement>('[data-choice="banana"]')!);
    const canceled = {
      requests: [...requests],
      changes: [...changes],
      value: slot('select-value').textContent,
    };
    cancelValue = false;
    click(document.querySelector<HTMLElement>('[data-choice="banana"]')!);
    await waitFor(() => changes.length === 1);
    click(document.querySelector<HTMLElement>('[data-choice="clear"]')!);
    await waitFor(() => requests.at(-1) === null);
    const cleared = slot('select-value').textContent;
    key(slot('select-popup'), 'Escape');
    const openAfterCancel =
      slot('select-trigger').getAttribute('aria-expanded');
    cancelOpen = false;
    key(slot('select-popup'), 'Escape');
    await waitFor(() => !document.querySelector('[data-slot="select-popup"]'));
    return {
      canceled,
      requests,
      changes,
      cleared,
      openAfterCancel,
      lastOpen: opens.at(-1),
      closed: slot('select-trigger').getAttribute('aria-expanded'),
    };
  });
  expect(result).toEqual({
    canceled: { requests: ['banana'], changes: [], value: 'Apple' },
    requests: ['banana', 'banana', null],
    changes: ['banana'],
    cleared: 'Select...',
    openAfterCancel: 'true',
    lastOpen: false,
    closed: 'false',
  });
});

for (const direction of ['ltr', 'rtl'] as const) {
  test(`reserves icon and indicator columns across selection and hidden indicators in ${direction}`, async ({
    page,
  }) => {
    await page.evaluate((direction) => {
      const { h, mount, DirectionProvider, Select } = window.designFixture;
      mount(
        h(
          DirectionProvider,
          { direction },
          h(
            'div',
            { dir: direction },
            h(Select<string, true>, {
              multiple: true,
              defaultValue: [],
              trigger: { style: { width: 200 } },
              options: [
                {
                  value: 'team',
                  label: 'Team workspace',
                  extra: 'Pro',
                  icon: '★',
                },
                { value: 'personal', label: 'Personal workspace', extra: 0 },
                { value: 'disabled', label: 'Unavailable', disabled: true },
              ],
            }),
          ),
        ),
      );
    }, direction);
    await page.getByRole('combobox').click();
    const popup = page.locator('[data-slot="select-popup"]');
    await expect
      .poll(() => popup.evaluate((node) => getComputedStyle(node).transform))
      .toBe('none');
    await expect(popup).toHaveCSS('direction', direction);
    const measure = () =>
      page.evaluate(() => {
        const boxes = [
          ...document.querySelectorAll('[data-slot="select-item-text"]'),
        ].map((node) => {
          const box = node.getBoundingClientRect();
          return {
            left: box.left,
            right: box.right,
            width: box.width,
            height: box.height,
          };
        });
        return {
          boxes,
          popup: document
            .querySelector('[data-slot="select-popup"]')!
            .getBoundingClientRect().width,
        };
      });
    const before = await measure();
    const start = direction === 'ltr' ? 'left' : 'right';
    for (const box of before.boxes)
      expect(box[start]).toBeCloseTo(before.boxes[0]![start], 1);
    const option = page.getByRole('option', { name: 'Team workspace Pro' });
    await expect(option).toHaveAttribute('aria-selected', 'false');
    await expect(
      page.locator('[data-slot="select-item-indicator"]'),
    ).toHaveCount(0);
    await option.click();
    await expect(option).toHaveAttribute('aria-selected', 'true');
    await expect(
      option.locator('[data-slot="select-item-indicator"]'),
    ).toBeVisible();
    expect(await measure()).toEqual(before);
    const ordered = await option.evaluate((node, direction) => {
      const names = ['icon', 'text', 'extra', 'indicator'];
      const rects = names.map((name) =>
        node
          .querySelector(`[data-slot="select-item-${name}"]`)!
          .getBoundingClientRect(),
      );
      return rects.every(
        (rect, i) =>
          i === 0 ||
          (direction === 'ltr'
            ? rect.left > rects[i - 1]!.right
            : rect.right < rects[i - 1]!.left),
      );
    }, direction);
    expect(ordered).toBe(true);
    await expect(page.getByRole('combobox')).toHaveText('Team workspace');
    await expect(
      page.locator('[data-slot="select-item-extra"]').nth(1),
    ).toHaveText('0');
    await option.click();
    await expect(option).toHaveAttribute('aria-selected', 'false');
    await expect(
      page.locator('[data-slot="select-item-indicator"]'),
    ).toHaveCount(0);
    expect(await measure()).toEqual(before);
    await page.evaluate((direction) => {
      const { h, mount, DirectionProvider, Select } = window.designFixture;
      mount(
        h(
          DirectionProvider,
          { direction },
          h(
            'div',
            { dir: direction },
            h(Select<string, true>, {
              multiple: true,
              defaultValue: [],
              itemIndicator: false,
              trigger: { style: { width: 200 } },
              options: [
                {
                  value: 'team',
                  label: 'Team workspace',
                  extra: 'Pro',
                  icon: '★',
                },
                { value: 'personal', label: 'Personal workspace', extra: 0 },
                { value: 'disabled', label: 'Unavailable', disabled: true },
              ],
            }),
          ),
        ),
      );
    }, direction);
    await option.click();
    await expect(option).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.locator('[data-slot="select-item-indicator"]'),
    ).toHaveCount(0);
    expect(await measure()).toEqual(before);
  });
}

test('truncates long option labels and extra content while keeping the indicator visible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.evaluate(() => {
    const { h, mount, Select } = window.designFixture;
    mount(
      h(Select<string>, {
        value: 'long',
        trigger: { style: { width: 220 } },
        options: [
          {
            value: 'long',
            label: 'An extremely long workspace title that needs truncation',
            extra: 'An extremely long current value that needs truncation',
            icon: '★',
          },
        ],
      }),
    );
  });
  await page.getByRole('combobox').click();
  const option = page.getByRole('option');
  await expect(option).toBeVisible();
  const result = await option.evaluate((node) => {
    const text = node.querySelector('[data-slot="select-item-text"]')!;
    const extra = node.querySelector('[data-slot="select-item-extra"]')!;
    const indicator = node.querySelector(
      '[data-slot="select-item-indicator"]',
    )!;
    return {
      fits: node.scrollWidth <= node.clientWidth,
      textTruncated: text.scrollWidth > text.clientWidth,
      extraTruncated: extra.scrollWidth > extra.clientWidth,
      indicatorFits:
        indicator.getBoundingClientRect().right <
        node.getBoundingClientRect().right,
    };
  });
  expect(result).toEqual({
    fits: true,
    textTruncated: true,
    extraTruncated: true,
    indicatorFits: true,
  });
  const popup = await page.locator('[data-slot="select-popup"]').boundingBox();
  expect(popup!.x).toBeGreaterThanOrEqual(0);
  expect(popup!.x + popup!.width).toBeLessThanOrEqual(320);
});
