import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { ReactElement, ReactNode } from 'react';

import type { RatingProps } from './rating';

interface ControllableOptions {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
}

type ElementProps = Record<string, unknown> & {
  children?: ReactNode;
};

type TestElement = ReactElement<ElementProps>;

const react = await import('react');
const setSelectedValue = mock((_value: unknown) => undefined);
const setHoveredValue = mock((_value: unknown) => undefined);

let capturedOptions: ControllableOptions | undefined;
let hoveredState = 0;
let prefersReducedMotion = false;

mock.module('react', () => ({
  ...react,
  useCallback: (callback: (...args: unknown[]) => unknown) => callback,
  useState: () => [hoveredState, setHoveredValue],
}));

mock.module('../hooks', () => ({
  useControllableValue: (options: ControllableOptions) => {
    capturedOptions = options;
    return [
      options.value ?? options.defaultValue ?? 0,
      setSelectedValue,
    ] as const;
  },
}));

mock.module('motion/react', () => ({
  MotionConfig: ({ children }: { children?: ReactNode }) => children,
  motion: {
    span: 'span',
  },
  useReducedMotion: () => prefersReducedMotion,
}));

const { Rating } = await import('./rating');

function renderRating(props: RatingProps = {}) {
  const wrapper = Rating(props) as TestElement;
  const root = wrapper.props.children as TestElement;

  return { root, wrapper };
}

function getChildren(element: TestElement) {
  return react.Children.toArray(element.props.children) as TestElement[];
}

function getItems(root: TestElement) {
  return getChildren(root).filter(
    (child) => child.props['data-slot'] === 'rating-item',
  );
}

function createKeyboardEvent(key: string) {
  const event = {
    key,
    defaultPrevented: false,
    preventDefault: mock(() => {
      event.defaultPrevented = true;
    }),
  };

  return event;
}

function createPointerEvent({
  clientX,
  pointerType = 'mouse',
}: {
  clientX: number;
  pointerType?: string;
}) {
  const focus = mock(() => undefined);
  const event = {
    clientX,
    pointerType,
    defaultPrevented: false,
    currentTarget: {
      getBoundingClientRect: () => ({
        left: 0,
        width: 100,
      }),
      parentElement: {
        focus,
      },
    },
  };

  return { event, focus };
}

beforeEach(() => {
  capturedOptions = undefined;
  hoveredState = 0;
  prefersReducedMotion = false;
  setHoveredValue.mockClear();
  setSelectedValue.mockClear();
});

describe('Rating', () => {
  test('configures accessible defaults and semantic styles', () => {
    const { root, wrapper } = renderRating();
    const items = getItems(root);
    const [emptyIcon, filledLayer] = getChildren(items[0] as TestElement);

    expect(wrapper.props.reducedMotion).toBe('user');
    expect(root.type).toBe('div');
    expect(root.props['data-slot']).toBe('rating');
    expect(root.props['data-size']).toBe('sm');
    expect(root.props['data-variant']).toBe('default');
    expect(root.props.role).toBe('slider');
    expect(root.props.tabIndex).toBe(0);
    expect(root.props['aria-valuemin']).toBe(0);
    expect(root.props['aria-valuemax']).toBe(5);
    expect(root.props['aria-valuenow']).toBe(0);
    expect(root.props['aria-valuetext']).toBe('0 out of 5 stars');
    expect(root.props.className).toContain('ring-momo-ring-focus/45');
    expect(items).toHaveLength(5);
    expect(items[0]?.props.className).toContain('size-5');
    expect(items[0]?.props.className).toContain('any-pointer-coarse:size-11');
    expect(emptyIcon?.props.className).toContain('text-momo-fg-subtle');
    expect(filledLayer?.props.animate).toEqual({
      clipPath: 'inset(0 100% 0 0)',
    });
  });

  test('renders fractional values, variants, sizes, and slot classes', () => {
    const customIcon = [] as unknown as NonNullable<RatingProps['icon']>;
    const { root } = renderRating({
      value: 2.5,
      precision: 0.5,
      size: 'lg',
      variant: 'yellow',
      icon: customIcon,
      itemClassName: 'custom-item',
      emptyIconClassName: 'custom-empty',
      filledIconClassName: 'custom-filled',
    });
    const items = getItems(root);
    const partialItem = items[2] as TestElement;
    const [emptyIcon, filledLayer] = getChildren(partialItem);
    const [filledIcon] = getChildren(filledLayer as TestElement);

    expect(root.props['aria-valuenow']).toBe(2.5);
    expect(root.props['data-size']).toBe('lg');
    expect(root.props['data-variant']).toBe('yellow');
    expect(partialItem.props['data-partial']).toBe('');
    expect(partialItem.props.className).toContain('size-7');
    expect(partialItem.props.className).toContain('custom-item');
    expect(emptyIcon?.props.icon).toBe(customIcon);
    expect(emptyIcon?.props.className).toContain('text-momo-fg-warning/35');
    expect(emptyIcon?.props.className).toContain('custom-empty');
    expect(filledLayer?.props.animate).toEqual({
      clipPath: 'inset(0 50% 0 0)',
    });
    expect(filledIcon?.props.className).toContain('text-momo-fg-warning');
    expect(filledIcon?.props.className).toContain('custom-filled');
  });

  test('normalizes max, precision, and values at their boundaries', () => {
    const fractionalMax = renderRating({
      max: 0.5,
      value: 4,
    }).root;
    const flooredMax = renderRating({
      max: 3.9,
      value: 4,
    }).root;
    const invalidPrecision = renderRating({
      precision: 0.3,
      value: 2.6,
    }).root;
    const quarterPrecision = renderRating({
      precision: 0.25,
      value: 1.25,
    }).root;

    expect(fractionalMax.props['aria-valuemax']).toBe(5);
    expect(getItems(fractionalMax)).toHaveLength(5);
    expect(flooredMax.props['aria-valuemax']).toBe(3);
    expect(flooredMax.props['aria-valuenow']).toBe(3);
    expect(getItems(flooredMax)).toHaveLength(3);
    expect(invalidPrecision.props['aria-valuenow']).toBe(3);

    const quarterItem = getItems(quarterPrecision)[1] as TestElement;
    const quarterLayer = getChildren(quarterItem)[1] as TestElement;
    expect(quarterLayer.props.animate).toEqual({
      clipPath: 'inset(0 75% 0 0)',
    });
  });

  test('supports read-only, disabled, and hidden form states', () => {
    const readOnly = renderRating({
      value: 4.5,
      precision: 0.5,
      readOnly: true,
    }).root;
    const disabled = renderRating({
      value: 3,
      name: 'score',
      form: 'review',
      disabled: true,
      tabIndex: 4,
    }).root;
    const hiddenInput = getChildren(disabled).find(
      (child) => child.props['data-slot'] === 'rating-input',
    );

    expect(readOnly.props.role).toBe('img');
    expect(readOnly.props.tabIndex).toBeUndefined();
    expect(readOnly.props['aria-label']).toBe('4.5 out of 5 stars');
    expect(readOnly.props['aria-valuenow']).toBeUndefined();
    expect(disabled.props.role).toBe('slider');
    expect(disabled.props.tabIndex).toBeUndefined();
    expect(disabled.props['aria-disabled']).toBe(true);
    expect(disabled.props['data-disabled']).toBe('');
    expect(hiddenInput?.type).toBe('input');
    expect(hiddenInput?.props.name).toBe('score');
    expect(hiddenInput?.props.form).toBe('review');
    expect(hiddenInput?.props.value).toBe(3);
    expect(hiddenInput?.props.disabled).toBe(true);
  });

  test('handles keyboard changes and composes cancelable key handlers', () => {
    const { root } = renderRating({
      value: 2,
      precision: 0.5,
    });
    const arrowEvent = createKeyboardEvent('ArrowRight');

    (root.props.onKeyDown as (event: typeof arrowEvent) => void)(arrowEvent);

    expect(arrowEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(setSelectedValue).toHaveBeenLastCalledWith(2.5);

    setSelectedValue.mockClear();
    const endEvent = createKeyboardEvent('End');
    (root.props.onKeyDown as (event: typeof endEvent) => void)(endEvent);
    expect(setSelectedValue).toHaveBeenLastCalledWith(5);

    setSelectedValue.mockClear();
    const canceledEvent = createKeyboardEvent('ArrowLeft');
    const canceled = renderRating({
      value: 2,
      onKeyDown: (event) => event.preventDefault(),
    }).root;
    (canceled.props.onKeyDown as (event: typeof canceledEvent) => void)(
      canceledEvent,
    );
    expect(setSelectedValue).not.toHaveBeenCalled();
  });

  test('previews pointer values, focuses on selection, and clears repeats', () => {
    const onValueHover = mock((_value: number) => undefined);
    const { root } = renderRating({
      value: 2,
      precision: 0.5,
      onValueHover,
    });
    const item = getItems(root)[1] as TestElement;
    const preview = createPointerEvent({ clientX: 75 });

    (item.props.onPointerMove as (event: typeof preview.event) => void)(
      preview.event,
    );
    expect(setHoveredValue).toHaveBeenLastCalledWith(2);
    expect(onValueHover).toHaveBeenLastCalledWith(2);

    const click = createPointerEvent({ clientX: 75 });
    (item.props.onClick as (event: typeof click.event) => void)(click.event);
    expect(click.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(setSelectedValue).toHaveBeenLastCalledWith(0);

    setHoveredValue.mockClear();
    onValueHover.mockClear();
    const touch = createPointerEvent({
      clientX: 25,
      pointerType: 'touch',
    });
    (item.props.onPointerMove as (event: typeof touch.event) => void)(
      touch.event,
    );
    expect(setHoveredValue).not.toHaveBeenCalled();
    expect(onValueHover).not.toHaveBeenCalled();
  });

  test('clears an active preview and skips interaction when disabled', () => {
    hoveredState = 3;
    const onValueHover = mock((_value: number) => undefined);
    const hovered = renderRating({ onValueHover }).root;
    const leaveEvent = {
      defaultPrevented: false,
    };

    (hovered.props.onPointerLeave as (event: typeof leaveEvent) => void)(
      leaveEvent,
    );
    expect(setHoveredValue).toHaveBeenLastCalledWith(0);
    expect(onValueHover).toHaveBeenLastCalledWith(0);

    setSelectedValue.mockClear();
    const disabled = renderRating({ disabled: true }).root;
    const disabledItem = getItems(disabled)[0] as TestElement;
    const click = createPointerEvent({ clientX: 100 });
    (disabledItem.props.onClick as (event: typeof click.event) => void)(
      click.event,
    );
    expect(setSelectedValue).not.toHaveBeenCalled();
  });

  test('removes fill duration when reduced motion is preferred', () => {
    prefersReducedMotion = true;
    const { root } = renderRating({ value: 1 });
    const item = getItems(root)[0] as TestElement;
    const filledLayer = getChildren(item)[1] as TestElement;

    expect(item.props.initial).toBe(false);
    expect(item.props.whileTap).toEqual({ scale: 0.9 });
    expect(filledLayer.props.initial).toBe(false);
    expect(filledLayer.props.transition).toEqual({
      duration: 0,
      ease: 'easeOut',
    });
    expect(capturedOptions?.value).toBe(1);
  });
});
