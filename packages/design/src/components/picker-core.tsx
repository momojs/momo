'use client';

import type { WheelPickerValue } from '@ncdai/react-wheel-picker';
import { WheelPicker, WheelPickerWrapper } from '@ncdai/react-wheel-picker';

import type { ControlOption } from '../shared';

export const ncdaiWheelPickerPackageName = '@ncdai/wheel-picker';

import '@ncdai/react-wheel-picker/style.css';
import type { OmitOf } from '@momots/core';
import { clone, isArray } from 'remeda';

import { useControllableValue } from '../hooks';
import { cx } from '../shared';

export interface PickerCoreProps<T extends WheelPickerValue>
  extends OmitOf<React.ComponentProps<typeof WheelPickerWrapper>, 'children'> {
  value?: T[];
  columns?: ControlOption<T>[][];
  disabled?: boolean;
  infinite?: boolean | boolean[];
  columnClassName?: string;
  onChange?: (value: T[]) => void;
}

export function PickerCore<T extends WheelPickerValue>({
  value,
  infinite,
  disabled,
  className,
  columns = [],
  onChange,
}: PickerCoreProps<T>) {
  const [current, setCurrent] = useControllableValue({
    value,
    onChange,
  });

  return (
    <WheelPickerWrapper
      className={cx(
        'w-56 rounded-md border border-momo-border bg-momo-background',
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
          onValueChange={(value: T) => {
            if (disabled) return;
            setCurrent((prev) => {
              const next = clone(prev) ?? [];
              next[idx] = value;
              return next;
            });
          }}
          classNames={{
            optionItem: 'text-momo-muted-foreground data-disabled:opacity-40',
            highlightWrapper:
              'bg-momo-muted text-momo-foreground data-rwp-focused:ring-2 data-rwp-focused:ring-momo-ring data-rwp-focused:ring-inset',
            highlightItem: 'data-disabled:opacity-40',
          }}
        />
      ))}
    </WheelPickerWrapper>
  );
}
