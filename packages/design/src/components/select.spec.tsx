import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { ReactElement, ReactNode } from 'react';

import type {
  SelectIconState,
  SelectItemState,
  SelectTriggerState,
  SelectValueState,
} from '@base-ui/react/select';

import type { SelectProps } from './select';

type ElementProps = Record<string, unknown> & {
  children?: ReactNode;
};

type TestElement = ReactElement<ElementProps>;

type ControllableOptions = {
  value?: unknown;
  defaultValue?: unknown;
};

const react = await import('react');
const setOpen = mock((_value: unknown) => undefined);
const setSelected = mock((_value: unknown) => undefined);
const clearHighlight = mock(() => undefined);
const flushHighlight = mock(() => undefined);
const setHighlightTarget = mock(() => undefined);
const unmountSelect = mock(() => undefined);

mock.module('react', () => ({
  ...react,
  useRef: <T,>(initial: T) => ({ current: initial }),
}));

mock.module('../hooks', () => ({
  useControllableValue: (options: ControllableOptions) => {
    const current = options.value ?? options.defaultValue;
    return typeof current === 'boolean'
      ? [current, setOpen]
      : [current, setSelected];
  },
}));

mock.module('../effects/highlight.js', () => ({
  Highlight: 'test-highlight',
  useHighlightLayer: () => ({
    clear: clearHighlight,
    flush: flushHighlight,
    setTarget: setHighlightTarget,
    style: null,
  }),
  useHighlightTrigger: () => ({
    getReferenceProps: (props?: Record<string, unknown>) => props ?? {},
  }),
}));

mock.module('motion/react', () => ({
  AnimatePresence: 'test-animate-presence',
  MotionConfig: 'test-motion-config',
  motion: {
    button: 'test-motion-button',
    div: 'test-motion-div',
  },
}));

const [{ Select }, { Select: BaseSelect }] = await Promise.all([
  import('./select'),
  import('@base-ui/react/select'),
]);

const baseSelectTypes = new Set<unknown>([
  BaseSelect.Root,
  BaseSelect.Trigger,
  BaseSelect.Value,
  BaseSelect.Icon,
  BaseSelect.Portal,
  BaseSelect.Positioner,
  BaseSelect.Popup,
  BaseSelect.List,
  BaseSelect.Item,
  BaseSelect.ItemText,
  BaseSelect.ItemIndicator,
  BaseSelect.ScrollUpArrow,
  BaseSelect.ScrollDownArrow,
]);

const options = [
  {
    value: 'apple',
    label: 'Apple',
    textValue: 'Apple fruit',
    className: 'option-item',
  },
  {
    value: 'banana',
    label: 'Banana',
    disabled: true,
  },
];

const idleTriggerState: SelectTriggerState = {
  disabled: false,
  touched: false,
  dirty: false,
  valid: null,
  filled: true,
  focused: false,
  open: false,
  readOnly: false,
  popupSide: null,
  value: 'apple',
  placeholder: false,
};

const idleValueState: SelectValueState = {
  value: 'apple',
  placeholder: false,
};

const idleIconState: SelectIconState = {
  open: false,
};

const idleItemState: SelectItemState = {
  disabled: false,
  selected: false,
  highlighted: false,
};

function renderSelect(props: Partial<SelectProps<string>> = {}) {
  const wrapper = Select<string>({
    open: true,
    value: 'apple',
    options,
    ...props,
  }) as TestElement;

  return wrapper.props.children as TestElement;
}

function pushElements(queue: TestElement[], node: ReactNode) {
  for (const child of react.Children.toArray(node)) {
    if (react.isValidElement<ElementProps>(child)) queue.push(child);
  }
}

function findElements(root: TestElement, type: unknown) {
  const queue = [root];
  const matches: TestElement[] = [];

  while (queue.length > 0) {
    const element = queue.shift() as TestElement;

    if (element.type === type) matches.push(element);

    if (
      typeof element.type === 'function' &&
      !baseSelectTypes.has(element.type)
    ) {
      const Component = element.type as (props: ElementProps) => ReactNode;
      const resolved = Component(element.props);
      pushElements(queue, resolved);
    } else {
      pushElements(queue, element.props.children);
    }
  }

  return matches;
}

function findElement(root: TestElement, type: unknown, index = 0) {
  const element = findElements(root, type)[index];
  expect(element).toBeDefined();
  return element as TestElement;
}

function getClassName<TState>(element: TestElement, state: TState) {
  const { className } = element.props;
  return typeof className === 'function'
    ? (className as (value: TState) => string | undefined)(state)
    : (className as string | undefined);
}

function getClassTokens<TState>(element: TestElement, state: TState) {
  return getClassName(element, state)?.split(/\s+/).filter(Boolean) ?? [];
}

beforeEach(() => {
  setOpen.mockClear();
  setSelected.mockClear();
  clearHighlight.mockClear();
  flushHighlight.mockClear();
  setHighlightTarget.mockClear();
  unmountSelect.mockClear();
});

describe('Select', () => {
  test('renders the default slot structure, sizes, and popup exit motion', () => {
    const actionsRef = { current: { unmount: unmountSelect } };
    const root = renderSelect({ actionsRef });
    const trigger = findElement(root, BaseSelect.Trigger);
    const value = findElement(root, BaseSelect.Value);
    const icon = findElement(root, BaseSelect.Icon);
    const portal = findElement(root, BaseSelect.Portal);
    const positioner = findElement(root, BaseSelect.Positioner);
    const popup = findElement(root, BaseSelect.Popup);
    const list = findElement(root, BaseSelect.List);
    const items = findElements(root, BaseSelect.Item);
    const itemText = findElement(root, BaseSelect.ItemText);
    const itemIndicator = findElement(root, BaseSelect.ItemIndicator);
    const scrollUpArrow = findElement(root, BaseSelect.ScrollUpArrow);
    const scrollDownArrow = findElement(root, BaseSelect.ScrollDownArrow);
    const presences = findElements(root, 'test-animate-presence');
    const popupPresence = presences.find(
      (item) => typeof item.props.onExitComplete === 'function',
    );
    const popupMotion = popup.props.render as TestElement;

    expect(root.type).toBe(BaseSelect.Root);
    expect(root.props.open).toBe(true);
    expect(root.props.value).toBe('apple');
    expect(trigger.type).toBe(BaseSelect.Trigger);
    expect(value.type).toBe(BaseSelect.Value);
    expect(icon.type).toBe(BaseSelect.Icon);
    expect(portal.type).toBe(BaseSelect.Portal);
    expect(positioner.props.alignItemWithTrigger).toBe(false);
    expect(positioner.props.sideOffset).toBe(6);
    expect(list.type).toBe(BaseSelect.List);
    expect(items).toHaveLength(2);
    expect(items[0]?.props.label).toBe('Apple fruit');
    expect(itemText.type).toBe(BaseSelect.ItemText);
    expect(itemIndicator.type).toBe(BaseSelect.ItemIndicator);
    expect(scrollUpArrow.type).toBe(BaseSelect.ScrollUpArrow);
    expect(scrollDownArrow.type).toBe(BaseSelect.ScrollDownArrow);
    expect(getClassTokens(trigger, idleTriggerState)).toContain('h-9');
    expect(getClassTokens(items[0] as TestElement, idleItemState)).toContain(
      'min-h-8',
    );
    expect(popupPresence).toBeDefined();
    expect(root.props.actionsRef).toBe(actionsRef);
    if (!popupPresence) throw new Error('Popup presence was not rendered');
    (popupPresence.props.onExitComplete as () => void)();
    expect(unmountSelect).toHaveBeenCalledTimes(1);
    expect(popupMotion.type).toBe('test-motion-div');
    expect(popupMotion.props.initial).toEqual({
      opacity: 0,
      scale: 0.98,
      y: -2,
    });
    expect(popupMotion.props.animate).toEqual({ opacity: 1, scale: 1, y: 0 });
    expect(popupMotion.props.exit).toEqual({
      opacity: 0,
      scale: 0.98,
      y: -2,
    });
  });

  test('resolves trigger, value, and icon state through direct cva classes', () => {
    const root = renderSelect();
    const trigger = findElement(root, BaseSelect.Trigger);
    const value = findElement(root, BaseSelect.Value);
    const icon = findElement(root, BaseSelect.Icon);
    const openTrigger = getClassTokens(trigger, {
      ...idleTriggerState,
      open: true,
    });
    const disabledTrigger = getClassTokens(trigger, {
      ...idleTriggerState,
      disabled: true,
    });
    const readOnlyTrigger = getClassTokens(trigger, {
      ...idleTriggerState,
      readOnly: true,
    });
    const placeholderValue = getClassTokens(value, {
      ...idleValueState,
      placeholder: true,
      value: null,
    });
    const openIcon = getClassTokens(icon, { ...idleIconState, open: true });

    expect(openTrigger).toContain('border-momo-ring-focus');
    expect(openTrigger).toContain('ring-2');
    expect(openTrigger).toContain('ring-momo-ring-focus/25');
    expect(disabledTrigger).toContain('cursor-not-allowed');
    expect(disabledTrigger).toContain('opacity-50');
    expect(readOnlyTrigger).toContain('cursor-default');
    expect(placeholderValue).toContain('text-momo-fg-muted');
    expect(openIcon).toContain('rotate-180');
    expect(openIcon).toContain('text-momo-fg-default');
    expect(openIcon).not.toContain('text-momo-fg-muted');

    const classes = [
      getClassName(trigger, { ...idleTriggerState, open: true }),
      getClassName(value, { ...idleValueState, placeholder: true }),
      getClassName(icon, { ...idleIconState, open: true }),
    ].join(' ');

    for (const selector of [
      'data-[popup-open]',
      'data-[disabled]',
      'data-[readonly]',
      'data-placeholder:',
      'group-data-[popup-open]',
    ]) {
      expect(classes).not.toContain(selector);
    }
  });

  test('resolves item state and merges slot, legacy, and option classes', () => {
    const root = renderSelect({
      size: 'lg',
      itemClassName: 'legacy-item',
      item: {
        className: (state: SelectItemState) =>
          state.selected ? 'slot-selected' : 'slot-idle',
      },
    } as Partial<SelectProps<string>>);
    const item = findElement(root, BaseSelect.Item);
    const selectedClasses = getClassTokens(item, {
      ...idleItemState,
      selected: true,
    });
    const disabledClasses = getClassTokens(item, {
      ...idleItemState,
      disabled: true,
    });

    expect(selectedClasses).toContain('min-h-9');
    expect(selectedClasses).toContain('font-medium');
    expect(selectedClasses).toContain('legacy-item');
    expect(selectedClasses).toContain('option-item');
    expect(selectedClasses).toContain('slot-selected');
    expect(disabledClasses).toContain('pointer-events-none');
    expect(disabledClasses).toContain('text-momo-fg-subtle');
    expect(disabledClasses).toContain('opacity-50');
    expect(disabledClasses).not.toContain('text-momo-fg-default');

    const classes = [selectedClasses, disabledClasses].flat().join(' ');
    expect(classes).not.toContain('data-[selected]');
    expect(classes).not.toContain('data-[disabled]');
  });

  test('composes slot configs with legacy prop and class aliases', () => {
    const customIndicator = <span data-custom-indicator />;
    const root = renderSelect({
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
      indicator: customIndicator,
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
      scrollUpArrow: { 'data-config': 'scroll-up' },
      scrollDownArrow: { 'data-config': 'scroll-down' },
    } as Partial<SelectProps<string>>);

    const trigger = findElement(root, BaseSelect.Trigger);
    const value = findElement(root, BaseSelect.Value);
    const icon = findElement(root, BaseSelect.Icon);
    const portal = findElement(root, BaseSelect.Portal);
    const positioner = findElement(root, BaseSelect.Positioner);
    const popup = findElement(root, BaseSelect.Popup);
    const list = findElement(root, BaseSelect.List);
    const item = findElement(root, BaseSelect.Item);
    const itemText = findElement(root, BaseSelect.ItemText);
    const itemIndicator = findElement(root, BaseSelect.ItemIndicator);
    const scrollUpArrow = findElement(root, BaseSelect.ScrollUpArrow);
    const scrollDownArrow = findElement(root, BaseSelect.ScrollDownArrow);

    expect(trigger.props['data-config']).toBe('trigger');
    expect(trigger.props['aria-label']).toBe('Legacy trigger');
    expect(getClassTokens(trigger, idleTriggerState)).toContain(
      'legacy-trigger',
    );
    expect(value.props['data-config']).toBe('value');
    expect(value.props['aria-live']).toBe('polite');
    expect(getClassTokens(value, idleValueState)).toContain('legacy-value');
    expect(icon.props['data-config']).toBe('icon');
    expect(getClassTokens(icon, idleIconState)).toContain('legacy-icon');
    expect(portal.props['data-config']).toBe('portal');
    expect(positioner.props['data-config']).toBe('positioner');
    expect(positioner.props.align).toBe('end');
    expect(getClassName(positioner, {})).toContain('legacy-positioner');
    expect(popup.props['data-config']).toBe('popup');
    expect(popup.props.finalFocus).toBe(false);
    expect(getClassName(popup, {})).toContain('legacy-popup');
    expect(list.props['data-config']).toBe('list');
    expect(list.props['aria-label']).toBe('Legacy list');
    expect(getClassName(list, {})).toContain('legacy-list');
    expect(item.props['data-config']).toBe('item');
    expect(item.props['aria-label']).toBe('Legacy item');
    expect(itemText.props['data-config']).toBe('item-text');
    expect(getClassName(itemText, {})).toContain('legacy-item-text');
    expect(itemIndicator.props['data-config']).toBe('item-indicator');
    expect(getClassName(itemIndicator, {})).toContain('legacy-item-indicator');
    expect(itemIndicator.props.children).toBe(customIndicator);
    expect(scrollUpArrow.props['data-config']).toBe('scroll-up');
    expect(scrollUpArrow.props['aria-label']).toBe('Legacy scroll up');
    expect(getClassName(scrollUpArrow, {})).toContain('legacy-scroll-arrow');
    expect(scrollDownArrow.props['data-config']).toBe('scroll-down');
    expect(scrollDownArrow.props['aria-label']).toBe('Legacy scroll down');
    expect(getClassName(scrollDownArrow, {})).toContain('legacy-scroll-arrow');
  });

  test('leaves unmounting to Base UI without the default popup motion', () => {
    const withoutPortal = renderSelect({ open: false, portal: false });
    const withCustomPopup = renderSelect({
      open: false,
      popup: { render: <div /> },
    });

    expect(withoutPortal.props.actionsRef).toBeUndefined();
    expect(findElements(withoutPortal, BaseSelect.Portal)).toHaveLength(0);
    expect(findElements(withoutPortal, 'test-animate-presence')).toHaveLength(
      0,
    );

    expect(withCustomPopup.props.actionsRef).toBeUndefined();
    expect(findElements(withCustomPopup, BaseSelect.Portal)).toHaveLength(1);
    expect(findElements(withCustomPopup, 'test-animate-presence')).toHaveLength(
      0,
    );
  });

  test('honors canceled value and open changes before simplified updates', () => {
    const onChange = mock((_value: string) => undefined);
    const onValueChange = mock(
      (_value: unknown, _details: unknown) => undefined,
    );
    const onOpenChange = mock((_open: boolean, _details: unknown) => undefined);
    const root = renderSelect({ onChange, onValueChange, onOpenChange });
    const changeValue = root.props.onValueChange as (
      value: string | null,
      details: { isCanceled: boolean },
    ) => void;
    const changeOpen = root.props.onOpenChange as (
      open: boolean,
      details: { isCanceled: boolean },
    ) => void;

    changeValue('banana', { isCanceled: true });
    expect(onValueChange).toHaveBeenCalledWith('banana', {
      isCanceled: true,
    });
    expect(setSelected).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();

    changeValue('banana', { isCanceled: false });
    expect(setSelected).toHaveBeenCalledWith('banana');
    expect(onChange).toHaveBeenCalledWith('banana');

    setSelected.mockClear();
    onChange.mockClear();
    changeValue(null, { isCanceled: false });
    expect(setSelected).toHaveBeenCalledWith(null);
    expect(onChange).not.toHaveBeenCalled();

    changeOpen(false, { isCanceled: true });
    expect(onOpenChange).toHaveBeenCalledWith(false, { isCanceled: true });
    expect(setOpen).not.toHaveBeenCalled();
    expect(clearHighlight).not.toHaveBeenCalled();

    changeOpen(false, { isCanceled: false });
    expect(clearHighlight).toHaveBeenCalledTimes(1);
    expect(setOpen).toHaveBeenCalledWith(false);
  });
});
