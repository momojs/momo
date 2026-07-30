import { describe, expect, test } from 'bun:test';

import {
  fromPickerDateValue,
  normalizePickerDate,
  toPickerDateColumns,
  toPickerDateValue,
} from './picker-date.utils';

const toParts = (date: Date) => {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
};

describe('picker date model', () => {
  test('uses precision to choose columns and canonical output', () => {
    const current = new Date(2026, 6, 24);
    const now = new Date(2026, 6, 24);

    expect(toPickerDateValue(current, 'year')).toEqual([2026]);
    expect(
      toPickerDateColumns(current, { now, precision: 'year' }),
    ).toHaveLength(1);
    expect(
      toParts(
        fromPickerDateValue([2027], current, {
          precision: 'year',
        }),
      ),
    ).toEqual([2027, 1, 1]);

    expect(toPickerDateValue(current, 'month')).toEqual([2026, 7]);
    expect(
      toPickerDateColumns(current, { now, precision: 'month' }),
    ).toHaveLength(2);
    expect(
      toParts(
        fromPickerDateValue([2027, 8], current, {
          precision: 'month',
        }),
      ),
    ).toEqual([2027, 8, 1]);

    expect(toPickerDateValue(current, 'date')).toEqual([2026, 7, 24]);
    expect(toPickerDateColumns(current, { now })).toHaveLength(3);
  });

  test('clamps the day when changing to a shorter month', () => {
    const january31 = new Date(2025, 0, 31);
    const leapJanuary31 = new Date(2024, 0, 31);

    expect(toParts(fromPickerDateValue([2025, 2, 31], january31))).toEqual([
      2025, 2, 28,
    ]);
    expect(toParts(fromPickerDateValue([2024, 2, 31], leapJanuary31))).toEqual([
      2024, 2, 29,
    ]);
  });

  test('clamps leap day when changing to a non-leap year', () => {
    const leapDay = new Date(2024, 1, 29);

    expect(toParts(fromPickerDateValue([2025, 2, 29], leapDay))).toEqual([
      2025, 2, 28,
    ]);
  });

  test('clamps complete candidates to min and max', () => {
    const min = new Date(2024, 5, 15);
    const max = new Date(2025, 1, 10);

    expect(
      toParts(
        fromPickerDateValue([2024, 1, 1], new Date(2025, 0, 1), {
          min,
        }),
      ),
    ).toEqual([2024, 6, 15]);
    expect(
      toParts(
        fromPickerDateValue([2025, 2, 15], new Date(2025, 0, 15), {
          max,
        }),
      ),
    ).toEqual([2025, 2, 10]);
  });

  test('normalizes defaults and bounds to the active precision', () => {
    const fallback = new Date(2026, 6, 24);

    expect(
      toParts(
        normalizePickerDate(undefined, fallback, {
          min: new Date(2026, 6, 25),
        }),
      ),
    ).toEqual([2026, 7, 25]);
    expect(
      toParts(
        normalizePickerDate(new Date(2026, 6, 24), fallback, {
          min: new Date(2026, 5, 20),
          precision: 'month',
        }),
      ),
    ).toEqual([2026, 7, 1]);
  });

  test('includes remote selected years and explicit ranges', () => {
    const now = new Date(2026, 6, 24);
    const remote = new Date(1900, 0, 1);
    const remoteYears = toPickerDateColumns(remote, {
      now,
      precision: 'year',
    })[0]?.map(({ value }) => value);

    expect(remoteYears).toContain(1900);

    const boundedYears = toPickerDateColumns(remote, {
      max: new Date(1905, 11, 31),
      min: new Date(1900, 0, 1),
      now,
      precision: 'year',
    })[0]?.map(({ value }) => value);

    expect(boundedYears).toEqual([1900, 1901, 1902, 1903, 1904, 1905]);
  });

  test('constructs years from zero through ninety-nine without a 1900 offset', () => {
    const current = new Date(0);
    current.setFullYear(42, 0, 31);

    expect(toParts(fromPickerDateValue([43, 2, 31], current))).toEqual([
      43, 2, 28,
    ]);
  });

  test('keeps extreme valid dates inside a bounded, constructible window', () => {
    const maxDate = new Date(8_640_000_000_000_000);
    const years =
      toPickerDateColumns(maxDate, {
        now: new Date(2026, 6, 24),
        precision: 'year',
      })[0] ?? [];

    expect(years.length).toBeLessThanOrEqual(200);
    expect(years.at(-1)?.value).toBe(275_760);
    expect(
      toParts(
        fromPickerDateValue([years.at(-1)?.value ?? 0], maxDate, {
          precision: 'year',
        }),
      ),
    ).toEqual([275_760, 1, 1]);
  });
});
