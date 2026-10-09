import { expect, test } from 'bun:test';

import { componentPage } from './setup';

const fixture = componentPage();

test('configures semantic defaults on the Base UI input', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Input, slot } = window.designFixture;
    mount(h(Input, { placeholder: 'Workspace name' }));
    const input = slot<HTMLInputElement>('input');
    return {
      tag: input.tagName,
      size: input.dataset.size,
      placeholder: input.placeholder,
      className: input.className,
    };
  });
  expect(result).toMatchObject({
    tag: 'INPUT',
    size: 'md',
    placeholder: 'Workspace name',
  });
  for (const name of ['h-9', 'border-momo-border-input', 'bg-momo-bg-canvas'])
    expect(result.className).toContain(name);
});

test('applies every visual size and forwards the native size hint', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Input, slot } = window.designFixture;
    const sizes = (['sm', 'md', 'lg'] as const).map((size) => {
      mount(h(Input, { size }));
      return {
        size: slot('input').dataset.size,
        className: slot('input').className,
      };
    });
    mount(h(Input, { nativeSize: 24 }));
    return { sizes, nativeSize: slot<HTMLInputElement>('input').size };
  });
  expect(result.sizes.map(({ size }) => size)).toEqual(['sm', 'md', 'lg']);
  result.sizes.forEach((item, index) =>
    expect(item.className).toContain(['h-8', 'h-9', 'h-10'][index]!),
  );
  expect(result.nativeSize).toBe(24);
});

test('merges a state-aware className after the base classes', async () => {
  const result = await fixture.page.evaluate(() => {
    const { h, mount, Input, Field, slot, flushSync } = window.designFixture;
    mount(
      h(
        Field,
        { label: 'Name' },
        h(Input, {
          className: (state) =>
            state.focused ? 'custom-focused' : 'custom-idle',
        }),
      ),
    );
    const input = slot('input');
    const idle = input.className;
    flushSync(() => input.focus());
    return { idle, focused: input.className };
  });
  expect(result.idle).toContain('custom-idle');
  expect(result.focused).toContain('custom-focused');
  expect(result.focused).toContain('border-momo-border-input');
});

test('preserves controlled value, callbacks, render, type, and ref props', async () => {
  await fixture.page.evaluate(() => {
    const { h, mount, Input, createRef } = window.designFixture;
    const ref = createRef<HTMLInputElement>();
    mount(
      h(Input, {
        value: 'momo',
        type: 'search',
        render: h('input', { 'aria-label': 'Composed input' }),
        ref,
        onValueChange(value) {
          document.body.dataset.changedValue = value;
        },
      }),
    );
    document.body.dataset.refMatches = String(
      ref.current === document.querySelector('[data-slot="input"]'),
    );
  });
  await fixture.page.locator('css:[data-slot="input"]').fill('updated');
  const result = await fixture.page.evaluate(() => {
    const input = window.designFixture.slot<HTMLInputElement>('input');
    return {
      value: input.value,
      type: input.type,
      label: input.getAttribute('aria-label'),
      refMatches: document.body.dataset.refMatches,
      changed: document.body.dataset.changedValue,
    };
  });
  expect(result).toEqual({
    value: 'momo',
    type: 'search',
    label: 'Composed input',
    refMatches: 'true',
    changed: 'updated',
  });
});
