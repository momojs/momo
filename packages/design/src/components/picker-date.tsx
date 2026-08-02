'use client';

import type { OmitOf } from '@momots/core';

import { useControllableValue } from '../hooks/index.js';
import type { PickerCoreProps } from './picker-core.js';
import { PickerCore } from './picker-core.js';
import type { PickerDatePrecision } from './picker-date.utils.js';
import {
  fromPickerDateValue,
  isPickerDateControlled,
  normalizePickerDate,
  toPickerDateColumns,
  toPickerDateValue,
} from './picker-date.utils.js';

export type { PickerDatePrecision } from './picker-date.utils.js';

const columnAriaLabels = ['Year', 'Month', 'Day'];

export interface PickerDateProps
  extends OmitOf<PickerCoreProps<number>, 'columns' | 'value' | 'onChange'> {
  /** Latest selectable date at the active precision. */
  max?: Date;
  /** Earliest selectable date at the active precision. */
  min?: Date;
  /** Controlled date. */
  value?: Date;
  /** Initial date when the component is uncontrolled. */
  defaultDate?: Date;
  /** Visible and emitted date precision. */
  precision?: PickerDatePrecision;
  /** Prevents pointer, wheel, and keyboard interaction. */
  disabled?: boolean;
  /** Receives a local date normalized to the active precision. */
  onChange?: (value: Date) => void;
}

export function PickerDate(props: PickerDateProps) {
  const today = new Date();
  const {
    max,
    min,
    value,
    defaultDate = today,
    precision = 'date',
    columnAriaLabels: ariaLabels,
    'aria-label': ariaLabel = 'Date picker',
    onChange,
    ...pickerProps
  } = props;
  const options = { max, min, precision };
  const normalizedDefaultDate = normalizePickerDate(
    defaultDate,
    today,
    options,
  );
  const normalizedValue =
    value === undefined
      ? undefined
      : normalizePickerDate(value, today, options);
  const [current = normalizedDefaultDate, onDateChange] = useControllableValue({
    controlled: isPickerDateControlled(props),
    value: normalizedValue,
    defaultValue: normalizedDefaultDate,
    onChange,
  });
  const date = normalizePickerDate(current, today, options);
  const pickerValue = toPickerDateValue(date, precision);
  const columns = toPickerDateColumns(date, { ...options, now: today });

  return (
    <PickerCore<number>
      {...pickerProps}
      aria-label={ariaLabel}
      columnAriaLabels={
        ariaLabels ?? columnAriaLabels.slice(0, pickerValue.length)
      }
      value={pickerValue}
      columns={columns}
      onChange={(next) => {
        onDateChange(fromPickerDateValue(next, date, options));
      }}
    />
  );
}
