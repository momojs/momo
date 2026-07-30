import { getHours, getMinutes, set } from 'date-fns';
import { range } from 'remeda';

import { useControllableValue } from '../hooks';
import type { ControlOption } from '../shared';
import { PickerCore } from './picker-core';

const today = new Date();

const hours = range(1, 13).map((hour) => ({
  label: String(hour).padStart(2, '0'),
  value: hour,
}));
const minutes = range(0, 60).map((minute) => ({
  label: String(minute).padStart(2, '0'),
  value: minute,
}));
const meridiems: ControlOption<string>[] = [
  { label: 'AM', value: 'AM' },
  { label: 'PM', value: 'PM' },
];
const columnAriaLabels = ['Hour', 'Minute', 'Meridiem'];

const toDate = (value: [number, number, string], date: Date) => {
  return set(date, {
    hours: (value[0] % 12) + (value[2] === 'AM' ? 0 : 12),
    minutes: value[1],
    seconds: 0,
    milliseconds: 0,
  });
};

const toPickerValue = (value: Date) => {
  const hour = getHours(value);
  const minute = getMinutes(value);

  return [hour % 12 || 12, minute, hour < 12 ? 'AM' : 'PM'];
};

export interface PickerTimeProps {
  /** Controlled time. */
  value?: Date;
  /** Initial time when the component is uncontrolled. */
  defaultValue?: Date;
  /** Prevents interaction. */
  disabled?: boolean;
  /** Receives the selected time while preserving the current calendar date. */
  onChange?: (value: Date) => void;
}

export function PickerTime({
  value,
  disabled,
  defaultValue = today,
  onChange,
}: PickerTimeProps) {
  const [current, setCurrent] = useControllableValue({
    value,
    defaultValue,
    onChange,
  });

  return (
    <PickerCore
      aria-label='Time picker'
      columnAriaLabels={columnAriaLabels}
      columns={[hours, minutes, meridiems]}
      disabled={disabled}
      value={toPickerValue(current)}
      onChange={(value) => {
        setCurrent(toDate(value as [number, number, string], current));
      }}
      infinite={[true, true, false]}
    />
  );
}
