import { describe, expect, test } from 'bun:test';

import type { InputState as BaseInputState } from '@base-ui/react/input';
import { Input as BaseInput } from '@base-ui/react/input';

import type { InputProps } from './input';
import { Input } from './input';

const state: BaseInputState = {
  disabled: false,
  dirty: false,
  filled: false,
  focused: false,
  touched: false,
  valid: null,
};

type InputElement = React.ReactElement<Record<string, unknown>>;

function getClassName(element: InputElement) {
  const { className } = element.props as {
    className?: InputProps['className'];
  };

  return typeof className === 'function' ? className(state) : className;
}

describe('Input', () => {
  test('configures semantic defaults on the Base UI input', () => {
    const element = Input({
      placeholder: 'Workspace name',
    }) as InputElement;

    expect(element.type).toBe(BaseInput);
    expect(element.props['data-slot']).toBe('input');
    expect(element.props['data-size']).toBe('md');
    expect(element.props.placeholder).toBe('Workspace name');
    expect(getClassName(element)).toContain('h-9');
    expect(getClassName(element)).toContain('border-momo-border-input');
    expect(getClassName(element)).toContain('bg-momo-bg-canvas');
  });

  test('applies every visual size and forwards the native size hint', () => {
    const sizeClasses = {
      sm: 'h-8',
      md: 'h-9',
      lg: 'h-10',
    } as const;

    for (const [size, className] of Object.entries(sizeClasses)) {
      const element = Input({
        size: size as keyof typeof sizeClasses,
      }) as InputElement;

      expect(element.props['data-size']).toBe(size);
      expect(getClassName(element)).toContain(className);
    }

    const element = Input({ nativeSize: 24 }) as InputElement;
    expect(element.props.size).toBe(24);
  });

  test('merges a state-aware className after the base classes', () => {
    const element = Input({
      className: (inputState) =>
        inputState.focused ? 'custom-focused' : 'custom-idle',
    }) as InputElement;
    const { className } = element.props as {
      className: (inputState: BaseInputState) => string;
    };

    expect(className(state)).toContain('custom-idle');
    expect(className({ ...state, focused: true })).toContain('custom-focused');
    expect(className({ ...state, focused: true })).toContain(
      'border-momo-border-input',
    );
  });

  test('preserves controlled value, callbacks, render, type, and ref props', () => {
    const onValueChange = () => undefined;
    const render = <input aria-label='Composed input' />;
    const ref = { current: null };
    const element = Input({
      value: 'momo',
      type: 'search',
      render,
      ref,
      onValueChange,
    }) as InputElement;

    expect(element.props.value).toBe('momo');
    expect(element.props.type).toBe('search');
    expect(element.props.render).toBe(render);
    expect(element.props.ref).toBe(ref);
    expect(element.props.onValueChange).toBe(onValueChange);
  });
});
