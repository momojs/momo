'use client';

import { useId, useLayoutEffect, useRef } from 'react';

import type { OmitOf } from '@momots/core';
import type {
  WheelPickerProps,
  WheelPickerValue,
} from '@ncdai/react-wheel-picker';
import { WheelPicker, WheelPickerWrapper } from '@ncdai/react-wheel-picker';
import { clone, isArray } from 'remeda';

import '@ncdai/react-wheel-picker/style.css';

import { useControllableValue } from '../hooks';
import type { ControlOption } from '../shared';
import { cx } from '../tailwind';

export interface PickerCoreProps<T extends WheelPickerValue>
  extends OmitOf<React.ComponentProps<typeof WheelPickerWrapper>, 'children'> {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  value?: T[];
  columns?: ControlOption<T>[][];
  disabled?: boolean;
  infinite?: boolean | boolean[];
  /** Accessible names for each wheel column. */
  columnAriaLabels?: readonly string[];
  /** Class names applied to every wheel column root. */
  columnClassName?: string;
  visibleCount?: WheelPickerProps<T>['visibleCount'];
  dragSensitivity?: WheelPickerProps<T>['dragSensitivity'];
  scrollSensitivity?: WheelPickerProps<T>['scrollSensitivity'];
  optionItemHeight?: WheelPickerProps<T>['optionItemHeight'];
  onChange?: (value: T[]) => void;
}

const toOptionText = <T extends WheelPickerValue>(
  option: ControlOption<T> | undefined,
) => {
  if (!option) return '';
  if (option.textValue) return option.textValue;
  if (typeof option.label === 'string' || typeof option.label === 'number') {
    return option.label.toString();
  }
  return option.value.toString();
};

const toColumnClassNames = (className: string | undefined) => {
  return className?.split(/\s+/).filter(Boolean) ?? [];
};

export function PickerCore<T extends WheelPickerValue>(
  props: PickerCoreProps<T>,
) {
  const {
    value,
    infinite,
    disabled,
    className,
    columns = [],
    columnAriaLabels,
    columnClassName,
    visibleCount,
    dragSensitivity,
    scrollSensitivity,
    optionItemHeight,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    onChange,
  } = props;
  const [current, setCurrent] = useControllableValue({
    controlled: Object.hasOwn(props, 'value'),
    value,
    onChange,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const pickerId = useId().replaceAll(':', '');

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const classNames = toColumnClassNames(columnClassName);
    const pickers = root.querySelectorAll<HTMLElement>('[data-rwp]');

    pickers.forEach((picker, columnIndex) => {
      const options = columns[columnIndex] ?? [];
      const currentIndex = options.findIndex(
        (option) => option.value === current?.[columnIndex],
      );
      const selectedIndex =
        currentIndex >= 0 && !options[currentIndex]?.disabled
          ? currentIndex
          : options.findIndex((option) => !option.disabled);
      const isInfinite = isArray(infinite) ? infinite[columnIndex] : infinite;
      const optionOffset = isInfinite ? 1 : 0;
      const optionItems = picker.querySelectorAll<HTMLElement>(
        '[data-rwp-highlight-item]',
      );
      const highlightList = picker.querySelector<HTMLElement>(
        '[data-rwp-highlight-list]',
      );
      const visualOptionItems =
        picker.querySelectorAll<HTMLElement>('[data-rwp-option]');
      const visualOptions =
        picker.querySelector<HTMLElement>('[data-rwp-options]');

      picker.setAttribute('role', 'listbox');
      picker.setAttribute('aria-orientation', 'vertical');
      picker.setAttribute(
        'aria-label',
        columnAriaLabels?.[columnIndex] ?? `Column ${columnIndex + 1}`,
      );

      if (disabled) {
        picker.setAttribute('aria-disabled', 'true');
      } else {
        picker.removeAttribute('aria-disabled');
      }

      classNames.forEach((name) => picker.classList.add(name));
      highlightList?.setAttribute('role', 'presentation');
      visualOptions?.setAttribute('aria-hidden', 'true');
      visualOptionItems.forEach((item) => {
        item.setAttribute('aria-hidden', 'true');
      });

      optionItems.forEach((item) => {
        item.removeAttribute('id');
        item.removeAttribute('role');
        item.removeAttribute('aria-disabled');
        item.removeAttribute('aria-label');
        item.removeAttribute('aria-posinset');
        item.removeAttribute('aria-selected');
        item.removeAttribute('aria-setsize');
        item.setAttribute('aria-hidden', 'true');
      });

      options.forEach((option, optionIndex) => {
        const item = optionItems[optionIndex + optionOffset];
        if (!item) return;

        const id = `${pickerId}-${columnIndex}-${optionIndex}`;
        item.id = id;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-label', toOptionText(option));
        item.setAttribute('aria-posinset', (optionIndex + 1).toString());
        item.setAttribute('aria-setsize', options.length.toString());
        item.setAttribute(
          'aria-selected',
          (optionIndex === selectedIndex).toString(),
        );
        item.removeAttribute('aria-hidden');

        if (option.disabled) {
          item.setAttribute('aria-disabled', 'true');
        }
      });

      const selectedItem = optionItems[selectedIndex + optionOffset];
      if (selectedItem?.id) {
        picker.setAttribute('aria-activedescendant', selectedItem.id);
      } else {
        picker.removeAttribute('aria-activedescendant');
      }
    });

    if (
      disabled &&
      document.activeElement instanceof HTMLElement &&
      root.contains(document.activeElement)
    ) {
      document.activeElement.blur();
    }

    return () => {
      pickers.forEach((picker) => {
        classNames.forEach((name) => picker.classList.remove(name));
      });
    };
  }, [
    columnAriaLabels,
    columnClassName,
    columns,
    current,
    disabled,
    infinite,
    pickerId,
  ]);

  return (
    <div
      ref={rootRef}
      role='group'
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-disabled={disabled || undefined}
    >
      <div inert={disabled || undefined}>
        <WheelPickerWrapper
          className={cx(
            'w-56 rounded-md border border-momo-border-default bg-momo-bg-canvas',
            disabled && 'pointer-events-none opacity-50',
            className,
          )}
        >
          {columns.map((options, idx) => (
            <WheelPicker
              infinite={isArray(infinite) ? infinite[idx] : infinite}
              key={idx.toString()}
              options={options}
              value={current?.[idx]}
              visibleCount={visibleCount}
              dragSensitivity={dragSensitivity}
              scrollSensitivity={scrollSensitivity}
              optionItemHeight={optionItemHeight}
              onValueChange={(value: T) => {
                if (disabled) return;
                setCurrent((prev) => {
                  const next = clone(prev) ?? [];
                  next[idx] = value;
                  return next;
                });
              }}
              classNames={{
                optionItem: 'text-momo-fg-muted data-disabled:opacity-40',
                highlightWrapper:
                  'bg-momo-bg-surface-muted text-momo-fg-default data-rwp-focused:ring-2 data-rwp-focused:ring-momo-ring-focus data-rwp-focused:ring-inset',
                highlightItem: 'data-disabled:opacity-40',
              }}
            />
          ))}
        </WheelPickerWrapper>
      </div>
    </div>
  );
}
