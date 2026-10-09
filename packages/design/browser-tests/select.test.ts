import { expect, test } from 'bun:test';

import type { SelectProps } from '../src/components/select';
import { componentPage } from './setup';

const fixture = componentPage();

test('renders the default slot structure, sizes, and popup exit motion', async () => {
  const result = await fixture.page.evaluate(async () => {
    const { h, mount, Select, slot, createRef, waitFor } = window.designFixture;
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
    const props = {
      value: 'apple',
      options,
      actionsRef,
      scrollUpArrow: { keepMounted: true },
      scrollDownArrow: { keepMounted: true },
    };
    mount(h(Select<string>, { ...props, open: true }));
    await waitFor(() => !!document.querySelector('[data-slot="select-popup"]'));
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
  });
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
  expect(result.initialScale).toBeLessThan(1);
  expect(result.offset).toBeCloseTo(6, 0);
  expect(result).toMatchObject({
    actions: 'function',
    retained: true,
    removed: true,
  });
});

test('keeps popup travel and scale still when reduced motion is preferred', async () => {
  const result = await fixture.page.evaluate(async () => {
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

test('resolves trigger, value, and icon state through direct cva classes', async () => {
  const result = await fixture.page.evaluate(async () => {
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

test('resolves item state and merges slot, legacy, and option classes', async () => {
  const result = await fixture.page.evaluate(async () => {
    const { h, mount, Select, waitFor } = window.designFixture;
    mount(
      h(Select<string>, {
        open: true,
        value: 'apple',
        size: 'lg',
        itemClassName: 'legacy-item',
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
  for (const name of [
    'min-h-9',
    'font-medium',
    'legacy-item',
    'option-item',
    'slot-selected',
  ])
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

test('composes slot configs with legacy prop and class aliases', async () => {
  const result = await fixture.page.evaluate(async () => {
    const { h, mount, Select, slot, waitFor } = window.designFixture;
    mount(
      h(Select<string>, {
        open: true,
        value: 'apple',
        options: [{ value: 'apple', label: 'Apple' }],
        className: 'legacy-trigger',
        valueClassName: 'legacy-value',
        iconClassName: 'legacy-icon',
        positionerClassName: 'legacy-positioner',
        popupClassName: 'legacy-popup',
        listClassName: 'legacy-list',
        itemTextClassName: 'legacy-item-text',
        itemIndicatorClassName: 'legacy-item-indicator',
        scrollArrowClassName: 'legacy-scroll-arrow',
        triggerProps: { 'aria-label': 'Legacy trigger' },
        valueProps: { 'aria-live': 'polite' },
        positionerProps: { align: 'end' },
        popupProps: { finalFocus: false },
        listProps: { 'aria-label': 'Legacy list' },
        itemProps: { 'aria-label': 'Legacy item' },
        scrollUpArrowProps: { 'aria-label': 'Legacy scroll up' },
        scrollDownArrowProps: { 'aria-label': 'Legacy scroll down' },
        indicator: h('span', { 'data-custom-indicator': '' }),
        trigger: { 'data-config': 'trigger' },
        valueSlot: { 'data-config': 'value' },
        icon: { 'data-config': 'icon' },
        portal: { 'data-config': 'portal' },
        positioner: { 'data-config': 'positioner' },
        popup: { 'data-config': 'popup' },
        list: { 'data-config': 'list' },
        item: { 'data-config': 'item' },
        itemText: { 'data-config': 'item-text' },
        itemIndicator: { 'data-config': 'item-indicator' },
        scrollUpArrow: { 'data-config': 'scroll-up', keepMounted: true },
        scrollDownArrow: { 'data-config': 'scroll-down', keepMounted: true },
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
    if (name === 'portal' || name === 'item') continue;
    expect(className).toContain(
      name.includes('scroll-') ? 'legacy-scroll-arrow' : `legacy-${name}`,
    );
  }
  expect(
    result.slots.filter(({ label }) => label).map(({ label }) => label),
  ).toEqual([
    'Legacy trigger',
    'Legacy list',
    'Legacy item',
    'Legacy scroll up',
    'Legacy scroll down',
  ]);
  expect(result).toMatchObject({
    live: 'polite',
    align: 'end',
    indicator: true,
  });
});

test('leaves unmounting to Base UI without the default popup motion', async () => {
  const result = await fixture.page.evaluate(async () => {
    const { h, mount, Select, waitFor } = window.designFixture;
    const options = [{ value: 'apple', label: 'Apple' }];
    mount(h(Select<string>, { options, open: false, portal: false }));
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

test('honors canceled value and open changes before simplified updates', async () => {
  const result = await fixture.page.evaluate(async () => {
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
