import { expect, expectTypeOf, test } from 'bun:test';

import { createElement } from 'react';

import type { SelectProps } from './select';

test('slot configs expose typed state and retain single and multiple value contracts', () => {
  type Fruit = 'apple' | 'banana';
  const single: SelectProps<Fruit> = {
    options: [{ value: 'apple', label: 'Apple' }],
    value: 'apple',
    trigger: {
      className: (state) => {
        expectTypeOf(state.open).toEqualTypeOf<boolean>();
        expectTypeOf(state.disabled).toEqualTypeOf<boolean>();
        return state.open ? 'open-trigger' : 'closed-trigger';
      },
      render: (props, state) => {
        expectTypeOf(state.open).toEqualTypeOf<boolean>();
        return createElement('button', props);
      },
    },
    valueSlot: {
      className: (state) => {
        expectTypeOf(state.placeholder).toEqualTypeOf<boolean>();
        return state.placeholder ? 'empty-value' : 'selected-value';
      },
    },
    item: {
      render: (props, state) => {
        expectTypeOf(state.selected).toEqualTypeOf<boolean>();
        expectTypeOf(state.disabled).toEqualTypeOf<boolean>();
        return createElement('div', props);
      },
    },
    itemIndicator: { children: createElement('span', null, 'Selected') },
    indicator: createElement('span', null, 'Check'),
    onChange(value) {
      expectTypeOf(value).toEqualTypeOf<Fruit>();
    },
    onValueChange(value, details) {
      expectTypeOf(value).toEqualTypeOf<Fruit | null>();
      details.cancel();
    },
  };
  const multiple: SelectProps<Fruit, true> = {
    multiple: true,
    defaultValue: ['apple'],
    icon: false,
    itemIndicator: false,
    scrollUpArrow: false,
    scrollDownArrow: false,
    onChange(value) {
      expectTypeOf(value).toEqualTypeOf<Fruit[]>();
    },
    onValueChange(value) {
      expectTypeOf(value).toEqualTypeOf<Fruit[]>();
    },
  };
  expect(single.value).toBe('apple');
  expect(multiple.defaultValue).toEqual(['apple']);
});

test('top-level prop and class aliases are absent from the public API', () => {
  type LegacyKeys = Extract<
    keyof SelectProps<string>,
    `${string}Props` | `${string}ClassName` | 'className'
  >;
  expectTypeOf<LegacyKeys>().toEqualTypeOf<never>();
});
