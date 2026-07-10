import { format, getHours, getMinutes, parse } from 'date-fns';
import { range } from 'remeda';

import { useControllableValue } from '../hooks';
import type { ControlOption } from '../shared';
import { PickerCore } from './picker-core';

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

const today = new Date();

const toDate = (value: [number, number, string]) => {
  const date = new Date();
  date.setHours((value[0] % 12) + (value[2] === 'AM' ? 0 : 12));
  date.setMinutes(value[1]);
  return date;
};

const toTime = (date: Date) => {
  return format(date, 'hh:mm a');
};

const toPickerValue = (value: string = toTime(today)) => {
  const date = parse(value, 'hh:mm a', today);

  const hour = getHours(date);
  const minute = getMinutes(date);

  return [hour % 12 || 12, minute, hour < 12 ? 'AM' : 'PM'];
};

export interface PickerTimeProps {
  value?: string;
  defaultDate?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}

export function PickerTime({ value, disabled, onChange }: PickerTimeProps) {
  const [current, setCurrent] = useControllableValue({
    value,
    onChange,
  });

  return (
    <div className='w-56'>
      <PickerCore
        columns={[hours, minutes, meridiems]}
        disabled={disabled}
        value={toPickerValue(current)}
        onChange={(value) => {
          setCurrent(toTime(toDate(value as [number, number, string])));
        }}
        infinite={[true, true, false]}
      />
    </div>
  );
}
