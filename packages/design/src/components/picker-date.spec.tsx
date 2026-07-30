import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { PickerCoreProps } from './picker-core';

type CapturedOptions = {
  controlled?: boolean;
  defaultValue?: Date;
  onChange?: (value: Date) => void;
  value?: Date;
};

let capturedOptions: CapturedOptions | undefined;
const setDate = mock((_value: Date) => undefined);

mock.module('../hooks', () => ({
  useControllableValue: (options: CapturedOptions) => {
    capturedOptions = options;
    return [options.value ?? options.defaultValue, setDate] as const;
  },
}));

mock.module('./picker-core', () => ({
  PickerCore: () => null,
}));

const { PickerDate } = await import('./picker-date');

const toParts = (date: Date) => {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
};

beforeEach(() => {
  capturedOptions = undefined;
  setDate.mockClear();
});

describe('PickerDate', () => {
  test('keeps an explicitly undefined value controlled', () => {
    PickerDate({ value: undefined });
    expect(capturedOptions?.controlled).toBe(true);

    PickerDate({});
    expect(capturedOptions?.controlled).toBe(false);
  });

  test('forwards picker props and applies precision', () => {
    const element = PickerDate({
      columnClassName: 'date-column',
      defaultDate: new Date(2026, 6, 24),
      dragSensitivity: 4,
      infinite: true,
      optionItemHeight: 32,
      precision: 'month',
      scrollSensitivity: 6,
      visibleCount: 12,
    }) as React.ReactElement<PickerCoreProps<number>>;

    expect(element.props.columnClassName).toBe('date-column');
    expect(element.props.dragSensitivity).toBe(4);
    expect(element.props.infinite).toBe(true);
    expect(element.props.optionItemHeight).toBe(32);
    expect(element.props.scrollSensitivity).toBe(6);
    expect(element.props.visibleCount).toBe(12);
    expect(element.props.value).toEqual([2026, 7]);
    expect(element.props.columns).toHaveLength(2);
    expect(element.props.columnAriaLabels).toEqual(['Year', 'Month']);
  });

  test('normalizes picker changes before updating state', () => {
    const element = PickerDate({
      defaultDate: new Date(2025, 0, 31),
    }) as React.ReactElement<PickerCoreProps<number>>;

    element.props.onChange?.([2025, 2, 31]);

    const next = setDate.mock.calls[0]?.[0];
    expect(next).toBeInstanceOf(Date);
    expect(toParts(next as Date)).toEqual([2025, 2, 28]);
  });
});
