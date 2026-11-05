import { expect, expectTypeOf, test } from 'bun:test';

import { createElement } from 'react';

import type { NumericProps } from './numeric';

test('root styles, native label props and slots retain their typed state', () => {
  const props: NumericProps = {
    label: 'Amount',
    className: (state) => {
      expectTypeOf(state.focused).toEqualTypeOf<boolean>();
      return state.focused ? 'focused-amount' : 'idle-amount';
    },
    labelProps: { className: 'amount-label', 'aria-label': 'Order amount' },
    scrubArea: {
      className: (state) => {
        expectTypeOf(state.scrubbing).toEqualTypeOf<boolean>();
        return state.scrubbing ? 'scrubbing-amount' : 'idle-scrub-area';
      },
    },
    input: {
      nativeSize: 12,
      render: (attributes, state) => {
        expectTypeOf(state.focused).toEqualTypeOf<boolean>();
        return createElement('input', attributes);
      },
    },
    decrement: false,
    increment: {
      className: (state) => {
        expectTypeOf(state.disabled).toEqualTypeOf<boolean>();
        expectTypeOf(state.readOnly).toEqualTypeOf<boolean>();
        return state.disabled || state.readOnly
          ? 'inactive-step'
          : 'ready-step';
      },
    },
    onChange(value) {
      expectTypeOf(value).toEqualTypeOf<number | null>();
    },
    onValueChange(value, details) {
      expectTypeOf(value).toEqualTypeOf<number | null>();
      details.cancel();
    },
  };
  expect(typeof props.className).toBe('function');
  expect(props.labelProps?.className).toBe('amount-label');
});

test('top-level slot class aliases are absent from the public API', () => {
  type LegacyClassKeys = Extract<keyof NumericProps, `${string}ClassName`>;
  expectTypeOf<LegacyClassKeys>().toEqualTypeOf<never>();
});
