import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { ReactElement, ReactNode } from 'react';

import type {
  NumberFieldRootChangeEventDetails,
  NumberFieldRootState,
} from '@base-ui/react/number-field';

import type { NumericProps } from './numeric';

type ElementProps = Record<string, unknown> & {
  children?: ReactNode;
};

type TestElement = ReactElement<ElementProps>;

const react = await import('react');
let prefersReducedMotion = false;

mock.module('react', () => ({
  ...react,
  useId: () => 'generated-numeric-id',
  useContext: () => null,
  useMemo: <T,>(factory: () => T) => factory(),
  useSyncExternalStore: () => prefersReducedMotion,
}));

const { defaultTheme } = await import('../motion/index.js');

const [{ Numeric }, { NumberField: BaseNumberField }] = await Promise.all([
  import('./numeric'),
  import('@base-ui/react/number-field'),
]);

const idleState: NumberFieldRootState = {
  value: 4,
  inputValue: '4',
  required: false,
  disabled: false,
  readOnly: false,
  scrubbing: false,
  touched: false,
  dirty: false,
  valid: null,
  filled: true,
  focused: false,
};

function renderNumeric(props: Partial<NumericProps> = {}) {
  const wrapper = Numeric({
    label: 'Amount',
    ...props,
  }) as TestElement;
  const root = wrapper.props.children as TestElement;

  return { root, wrapper };
}

function getChildren(element: TestElement) {
  return react.Children.toArray(element.props.children) as TestElement[];
}

function resolveFunctionElement(element: TestElement) {
  const Component = element.type as (props: ElementProps) => ReactNode;

  return Component(element.props) as TestElement;
}

function getClassName(
  element: TestElement,
  state: NumberFieldRootState = idleState,
) {
  const { className } = element.props;

  return typeof className === 'function'
    ? (className as (value: NumberFieldRootState) => string | undefined)(state)
    : (className as string | undefined);
}

function resolveDefaultSlots(root: TestElement) {
  const [scrubAreaSlot, groupSlot] = getChildren(root);
  const scrubArea = resolveFunctionElement(scrubAreaSlot as TestElement);
  const group = resolveFunctionElement(groupSlot as TestElement);
  const scrubAreaContent = scrubArea.props.children as TestElement;
  const groupContent = group.props.children as TestElement;
  const [labelSlot, scrubAreaCursorSlot] = getChildren(scrubAreaContent);
  const [decrementSlot, inputSlot, incrementSlot] = getChildren(groupContent);

  return {
    decrement: resolveFunctionElement(decrementSlot as TestElement),
    group,
    increment: resolveFunctionElement(incrementSlot as TestElement),
    input: resolveFunctionElement(inputSlot as TestElement),
    label: resolveFunctionElement(labelSlot as TestElement),
    scrubArea,
    scrubAreaCursor: resolveFunctionElement(scrubAreaCursorSlot as TestElement),
  };
}

beforeEach(() => {
  prefersReducedMotion = false;
});

describe('Numeric', () => {
  test('renders the default accessible slot structure and size metadata', () => {
    const { root, wrapper } = renderNumeric();
    const slots = resolveDefaultSlots(root);

    expect(wrapper.props.transition).toMatchObject(
      defaultTheme.transitions.snap,
    );
    expect(root.type).toBe(BaseNumberField.Root);
    expect(root.props.id).toBe('generated-numeric-id');
    expect(root.props['data-slot']).toBe('numeric');
    expect(root.props['data-size']).toBe('md');

    expect(slots.scrubArea.type).toBe(BaseNumberField.ScrubArea);
    expect(slots.scrubArea.props['data-slot']).toBe('numeric-scrub-area');
    expect(slots.scrubArea.props['data-size']).toBe('md');
    expect(slots.label.type).toBe('label');
    expect(slots.label.props['data-slot']).toBe('numeric-label');
    expect(slots.label.props.htmlFor).toBe('generated-numeric-id');
    expect(slots.label.props.children).toBe('Amount');
    expect(slots.scrubAreaCursor.type).toBe(BaseNumberField.ScrubAreaCursor);
    expect(slots.scrubAreaCursor.props['data-slot']).toBe(
      'numeric-scrub-area-cursor',
    );

    expect(slots.group.type).toBe(BaseNumberField.Group);
    expect(slots.group.props['data-slot']).toBe('numeric-group');
    expect(slots.group.props['data-size']).toBe('md');
    expect(slots.decrement.type).toBe(BaseNumberField.Decrement);
    expect(slots.decrement.props['data-slot']).toBe('numeric-decrement');
    expect(slots.input.type).toBe(BaseNumberField.Input);
    expect(slots.input.props['data-slot']).toBe('numeric-input');
    expect(slots.increment.type).toBe(BaseNumberField.Increment);
    expect(slots.increment.props['data-slot']).toBe('numeric-increment');
  });

  test('uses reduced-motion-aware press feedback for default steppers', () => {
    const { root, wrapper } = renderNumeric();
    const { decrement, increment } = resolveDefaultSlots(root);
    const decrementRender = decrement.props.render as (
      props: ElementProps,
      state: NumberFieldRootState,
    ) => TestElement;
    const incrementRender = increment.props.render as (
      props: ElementProps,
      state: NumberFieldRootState,
    ) => TestElement;
    const decrementButton = decrementRender({}, idleState);
    const incrementButton = incrementRender({}, idleState);
    const disabledButton = decrementRender(
      {},
      { ...idleState, disabled: true },
    );
    const readOnlyButton = incrementRender(
      {},
      { ...idleState, readOnly: true },
    );

    expect(wrapper.props.transition).toMatchObject(
      defaultTheme.transitions.snap,
    );
    expect(decrementButton.props.whileTap).toEqual({ scale: 0.9 });
    expect(incrementButton.props.whileTap).toEqual({ scale: 0.9 });
    expect(disabledButton.props.whileTap).toBeUndefined();
    expect(readOnlyButton.props.whileTap).toBeUndefined();
  });

  test('removes stepper press scaling when reduced motion is preferred', () => {
    prefersReducedMotion = true;
    const { root } = renderNumeric();
    const { decrement, increment } = resolveDefaultSlots(root);

    for (const slot of [decrement, increment]) {
      const render = slot.props.render as (
        props: ElementProps,
        state: NumberFieldRootState,
      ) => TestElement;
      const button = render({}, idleState);
      expect(button.props.whileTap).toBeUndefined();
      expect(button.props.transition).toMatchObject({ duration: 0 });
    }
  });

  test('merges state-aware slot classes with semantic and legacy classes', () => {
    const { root } = renderNumeric({
      className: (state) => (state.focused ? 'root-focused' : 'root-unfocused'),
      labelClassName: 'legacy-label',
      labelProps: { className: 'slot-label' },
      scrubAreaClassName: 'legacy-scrub-area',
      scrubArea: {
        className: (state) =>
          state.scrubbing ? 'slot-scrubbing' : 'slot-not-scrubbing',
      },
      scrubAreaCursorClassName: 'legacy-cursor',
      scrubAreaCursor: {
        className: (state) =>
          state.scrubbing ? 'slot-cursor-active' : 'slot-cursor-idle',
      },
      groupClassName: 'legacy-group',
      group: {
        className: (state) =>
          state.valid === false ? 'slot-group-invalid' : 'slot-group-valid',
      },
      inputClassName: 'legacy-input',
      input: {
        className: (state) =>
          state.focused ? 'slot-input-focused' : 'slot-input-idle',
      },
      decrementClassName: 'legacy-decrement',
      decrement: {
        className: (state) =>
          state.disabled ? 'slot-decrement-disabled' : 'slot-decrement-ready',
      },
      incrementClassName: 'legacy-increment',
      increment: {
        className: (state) =>
          state.readOnly ? 'slot-increment-readonly' : 'slot-increment-ready',
      },
    });
    const slots = resolveDefaultSlots(root);

    expect(getClassName(root, { ...idleState, focused: true })).toContain(
      'root-focused',
    );
    expect(getClassName(root)).toContain('group/numeric');
    expect(slots.label.props.className).toContain('legacy-label');
    expect(slots.label.props.className).toContain('slot-label');

    const scrubbingState = { ...idleState, scrubbing: true };
    expect(getClassName(slots.scrubArea, scrubbingState)).toContain(
      'legacy-scrub-area',
    );
    expect(getClassName(slots.scrubArea, scrubbingState)).toContain(
      'slot-scrubbing',
    );
    expect(getClassName(slots.scrubAreaCursor, scrubbingState)).toContain(
      'legacy-cursor',
    );
    expect(getClassName(slots.scrubAreaCursor, scrubbingState)).toContain(
      'slot-cursor-active',
    );

    expect(getClassName(slots.group, { ...idleState, valid: false })).toContain(
      'legacy-group',
    );
    expect(getClassName(slots.group, { ...idleState, valid: false })).toContain(
      'slot-group-invalid',
    );
    expect(
      getClassName(slots.input, { ...idleState, focused: true }),
    ).toContain('legacy-input');
    expect(
      getClassName(slots.input, { ...idleState, focused: true }),
    ).toContain('slot-input-focused');
    expect(
      getClassName(slots.decrement, { ...idleState, disabled: true }),
    ).toContain('legacy-decrement');
    expect(
      getClassName(slots.decrement, { ...idleState, disabled: true }),
    ).toContain('slot-decrement-disabled');
    expect(
      getClassName(slots.increment, { ...idleState, readOnly: true }),
    ).toContain('legacy-increment');
    expect(
      getClassName(slots.increment, { ...idleState, readOnly: true }),
    ).toContain('slot-increment-readonly');
  });

  test('forwards slot props, custom children, render, and native size', () => {
    const customCursor = <span data-custom='cursor'>Drag</span>;
    const customDecrement = <span data-custom='decrement'>Subtract</span>;
    const customIncrement = <span data-custom='increment'>Add</span>;
    const customIncrementRender = <button data-custom='render' />;
    const { root } = renderNumeric({
      scrubArea: {
        direction: 'vertical',
        pixelSensitivity: 8,
        teleportDistance: 240,
      },
      scrubAreaCursor: {
        children: customCursor,
      },
      group: {
        'aria-label': 'Amount controls',
      },
      input: {
        'aria-describedby': 'amount-help',
        nativeSize: 12,
        placeholder: '0',
      },
      decrement: {
        'aria-label': 'Subtract amount',
        children: customDecrement,
      },
      increment: {
        'aria-label': 'Add amount',
        children: customIncrement,
        render: customIncrementRender,
      },
    });
    const slots = resolveDefaultSlots(root);

    expect(slots.scrubArea.props.direction).toBe('vertical');
    expect(slots.scrubArea.props.pixelSensitivity).toBe(8);
    expect(slots.scrubArea.props.teleportDistance).toBe(240);
    expect(slots.scrubAreaCursor.props.children).toBe(customCursor);
    expect(slots.group.props['aria-label']).toBe('Amount controls');
    expect(slots.input.props['aria-describedby']).toBe('amount-help');
    expect(slots.input.props.placeholder).toBe('0');
    expect(slots.input.props.size).toBe(12);
    expect(slots.input.props).not.toHaveProperty('nativeSize');
    expect(slots.decrement.props['aria-label']).toBe('Subtract amount');
    expect(slots.decrement.props.children).toBe(customDecrement);
    expect(slots.increment.props['aria-label']).toBe('Add amount');
    expect(slots.increment.props.children).toBe(customIncrement);
    expect(slots.increment.props.render).toBe(customIncrementRender);
  });

  test('forwards Number Field Root behavior and form props', () => {
    const format = { style: 'percent' } as const;
    const inputRef = { current: null };
    const onValueCommitted = mock(() => undefined);
    const { root } = renderNumeric({
      id: 'quantity',
      defaultValue: 4,
      min: 0,
      max: 20,
      step: 2,
      smallStep: 0.5,
      largeStep: 10,
      locale: 'de-DE',
      format,
      name: 'quantity',
      form: 'order-form',
      required: true,
      disabled: true,
      allowOutOfRange: true,
      allowWheelScrub: true,
      snapOnStep: true,
      inputRef,
      onValueCommitted,
    });

    expect(root.props.id).toBe('quantity');
    expect(root.props.defaultValue).toBe(4);
    expect(root.props.min).toBe(0);
    expect(root.props.max).toBe(20);
    expect(root.props.step).toBe(2);
    expect(root.props.smallStep).toBe(0.5);
    expect(root.props.largeStep).toBe(10);
    expect(root.props.locale).toBe('de-DE');
    expect(root.props.format).toBe(format);
    expect(root.props.name).toBe('quantity');
    expect(root.props.form).toBe('order-form');
    expect(root.props.required).toBe(true);
    expect(root.props.disabled).toBe(true);
    expect(root.props.allowOutOfRange).toBe(true);
    expect(root.props.allowWheelScrub).toBe(true);
    expect(root.props.snapOnStep).toBe(true);
    expect(root.props.inputRef).toBe(inputRef);
    expect(root.props.onValueCommitted).toBe(onValueCommitted);
  });

  test('does not call onChange after onValueChange cancels the update', () => {
    const onChange = mock((_value: number | null) => undefined);
    const onValueChange = mock(
      (_value: number | null, details: NumberFieldRootChangeEventDetails) => {
        details.cancel();
      },
    );
    const { root } = renderNumeric({ onChange, onValueChange });
    const handleValueChange = root.props.onValueChange as NonNullable<
      NumericProps['onValueChange']
    >;
    const details = {
      reason: 'keyboard',
      event: {} as KeyboardEvent,
      cancel: mock(() => {
        details.isCanceled = true;
      }),
      allowPropagation: mock(() => undefined),
      isCanceled: false,
      isPropagationAllowed: false,
      trigger: undefined,
    } as NumberFieldRootChangeEventDetails;

    handleValueChange(8, details);

    expect(onValueChange).toHaveBeenCalledWith(8, details);
    expect(details.cancel).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  test('supports explicitly hiding and replacing composed slots', () => {
    const hidden = renderNumeric({
      scrubArea: null,
      group: false,
    }).root;

    expect(getChildren(hidden)).toHaveLength(0);

    const replacementInput = <output data-slot='replacement-input'>8</output>;
    const { root } = renderNumeric({
      scrubAreaCursor: false,
      decrement: null,
      input: replacementInput,
      increment: false,
    });
    const [scrubAreaSlot, groupSlot] = getChildren(root);
    const scrubArea = resolveFunctionElement(scrubAreaSlot as TestElement);
    const group = resolveFunctionElement(groupSlot as TestElement);
    const scrubChildren = getChildren(scrubArea.props.children as TestElement);
    const groupChildren = getChildren(group.props.children as TestElement);

    expect(scrubChildren).toHaveLength(1);
    expect(resolveFunctionElement(scrubChildren[0] as TestElement).type).toBe(
      'label',
    );
    expect(groupChildren).toHaveLength(1);
    expect(groupChildren[0]?.type).toBe('output');
    expect(groupChildren[0]?.props['data-slot']).toBe('replacement-input');
  });
});
