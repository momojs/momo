import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { PickerCoreProps } from './picker-core';

type CapturedOptions = {
  defaultValue?: Date;
  onChange?: (value: Date) => void;
  value?: Date;
};

let capturedOptions: CapturedOptions | undefined;
const setTime = mock((_value: Date) => undefined);

mock.module('../hooks', () => ({
  useControllableValue: (options: CapturedOptions) => {
    capturedOptions = options;
    return [options.value ?? options.defaultValue, setTime] as const;
  },
}));

mock.module('./picker-core', () => ({
  PickerCore: () => null,
}));

const { PickerTime } = await import('./picker-time');

beforeEach(() => {
  capturedOptions = undefined;
  setTime.mockClear();
});

describe('PickerTime', () => {
  test('uses Date values and preserves the calendar date on change', () => {
    const current = new Date(2026, 6, 24, 9, 30, 45, 123);
    const element = PickerTime({
      value: current,
    }) as React.ReactElement<PickerCoreProps<number | string>>;

    expect(capturedOptions?.value).toBe(current);
    expect(element.props.value).toEqual([9, 30, 'AM']);

    element.props.onChange?.([11, 5, 'PM']);

    const next = setTime.mock.calls[0]?.[0];
    expect(next).toBeInstanceOf(Date);
    expect([
      next?.getFullYear(),
      next?.getMonth(),
      next?.getDate(),
      next?.getHours(),
      next?.getMinutes(),
      next?.getSeconds(),
      next?.getMilliseconds(),
    ]).toEqual([2026, 6, 24, 23, 5, 0, 0]);
    expect([
      current.getHours(),
      current.getMinutes(),
      current.getSeconds(),
      current.getMilliseconds(),
    ]).toEqual([9, 30, 45, 123]);
  });
});
