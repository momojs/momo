'use client';

import type { OmitOf } from '@momots/core';
import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfMonth,
  endOfYear,
  getYear,
  isDate,
  startOfMonth,
  startOfYear,
} from 'date-fns';

import { useControllableValue } from '../hooks';
import type { PickerCoreProps } from './picker-core';
import { PickerCore } from './picker-core';

const today = new Date();

const toYears = (date: Date) => {
  const year = getYear(date);
  return Array.from({ length: 200 }, (_, i) => {
    const value = year + i - 100;
    return { label: value.toString(), value };
  });
};

const toMonths = (date: Date) => {
  const end = endOfYear(date);
  const start = startOfYear(date);
  const length = differenceInCalendarMonths(end, start) + 1;
  return Array.from({ length }, (_, i) => {
    const value = start.getMonth() + i + 1;
    return { label: value.toString(), value };
  });
};

const toDays = (date: Date) => {
  const end = endOfMonth(date);
  const start = startOfMonth(date);
  const length = differenceInCalendarDays(end, start) + 1;
  return Array.from({ length }, (_, i) => {
    const value = start.getDate() + i;
    return { label: value.toString(), value };
  });
};

const toCols = (
  date: Date,
  params?: {
    max?: Date;
    min?: Date;
  },
) => {
  const { max, min } = params ?? {};
  const years = toYears(today).filter((year) => {
    if (isDate(max) && max.getFullYear() < year.value) {
      return false;
    }
    if (isDate(min) && min.getFullYear() > year.value) {
      return false;
    }
    return true;
  });

  const months = toMonths(date).filter((month) => {
    if (
      isDate(max) &&
      max.getMonth() + 1 < month.value &&
      max.getFullYear() === date.getFullYear()
    ) {
      return false;
    }
    if (
      isDate(min) &&
      min.getMonth() + 1 > month.value &&
      min.getFullYear() === date.getFullYear()
    ) {
      return false;
    }
    return true;
  });

  const days = toDays(date).filter((day) => {
    if (
      isDate(max) &&
      max.getDate() < day.value &&
      max.getFullYear() === date.getFullYear() &&
      max.getMonth() === date.getMonth()
    ) {
      return false;
    }
    if (
      isDate(min) &&
      min.getDate() > day.value &&
      min.getFullYear() === date.getFullYear() &&
      min.getMonth() === date.getMonth()
    ) {
      return false;
    }
    return true;
  });

  return [years, months, days];
};

const toDate = (value: number[]) => {
  return new Date(value[0], value[1] - 1, value[2]);
};

const toPickerValue = (date: Date) => {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
};

export interface PickerDateProps
  extends OmitOf<PickerCoreProps<number>, 'value' | 'onChange'> {
  max?: Date;
  min?: Date;
  value?: Date;
  defaultDate?: Date;
  disabled?: boolean;
  onChange?: (value: Date) => void;
}

export function PickerDate({
  max,
  min,
  value,
  disabled,
  className,
  defaultDate = today,
  onChange,
}: PickerDateProps) {
  const [date = today, onDateChange] = useControllableValue({
    value,
    onChange,
    defaultDate,
    defaultValuePropName: 'defaultDate',
  });

  return (
    <PickerCore<number>
      value={toPickerValue(date)}
      columns={toCols(date, {
        max,
        min,
      })}
      disabled={disabled}
      className={className}
      onChange={(next) => {
        onDateChange(toDate(next));
      }}
    />
  );
}
