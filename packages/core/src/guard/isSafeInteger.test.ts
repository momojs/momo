import { describe, expect, expectTypeOf, mock, test } from 'bun:test';

import { isSafeInteger as exportedIsSafeInteger } from '../index';
import { hasOwn } from './hasOwn';
import type { SafeInteger } from './isSafeInteger';
import { isSafeInteger } from './isSafeInteger';

describe('isSafeInteger', () => {
  test('is exported from the root and direct module', () => {
    expect(exportedIsSafeInteger).toBe(isSafeInteger);
  });

  test('accepts primitive safe integers including zero and both limits', () => {
    for (const value of [
      Number.MIN_SAFE_INTEGER,
      -1,
      -0,
      0,
      1,
      Number.MAX_SAFE_INTEGER,
    ]) {
      expect(isSafeInteger(value)).toBe(true);
    }
  });

  test('rejects unsafe numbers and other types without coercion', () => {
    const coerce = mock(() => {
      throw new Error('Unexpected coercion');
    });

    for (const value of [
      Number.MIN_SAFE_INTEGER - 1,
      Number.MAX_SAFE_INTEGER + 1,
      -0.5,
      0.5,
      Number.NaN,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      '1',
      1n,
      Object(1),
      null,
      undefined,
      true,
      [],
      {},
      Symbol('integer'),
      () => 1,
      { valueOf: coerce, [Symbol.toPrimitive]: coerce },
    ]) {
      expect(isSafeInteger(value)).toBe(false);
    }

    expect(coerce).not.toHaveBeenCalled();
  });

  test('uses inclusive bounds and defaults each omitted bound', () => {
    for (const value of [-2, 0, 3]) {
      expect(isSafeInteger(value, { min: -2, max: 3 })).toBe(true);
    }
    for (const value of [-3, 4]) {
      expect(isSafeInteger(value, { min: -2, max: 3 })).toBe(false);
    }

    expect(isSafeInteger(3, { min: 3, max: 3 })).toBe(true);
    expect(isSafeInteger(Number.MIN_SAFE_INTEGER, { max: 0 })).toBe(true);
    expect(isSafeInteger(Number.MAX_SAFE_INTEGER, { min: 0 })).toBe(true);
    expect(isSafeInteger(-1, { min: 0 })).toBe(false);
    expect(isSafeInteger(1, { max: 0 })).toBe(false);
    expect(isSafeInteger(0, {})).toBe(true);
    expect(isSafeInteger(0, { min: undefined, max: undefined })).toBe(true);
  });

  test('allows fractional or infinite bounds without accepting unsafe data', () => {
    expect(isSafeInteger(1, { min: 0.5, max: 1.5 })).toBe(true);
    expect(isSafeInteger(0, { min: 0.5 })).toBe(false);
    expect(isSafeInteger(2, { max: 1.5 })).toBe(false);
    expect(isSafeInteger(0.5, { min: 0.5, max: 1.5 })).toBe(false);

    const options = {
      min: Number.NEGATIVE_INFINITY,
      max: Number.POSITIVE_INFINITY,
    };

    for (const value of [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]) {
      expect(isSafeInteger(value, options)).toBe(true);
    }
    for (const value of [
      Number.MIN_SAFE_INTEGER - 1,
      Number.MAX_SAFE_INTEGER + 1,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(isSafeInteger(value, options)).toBe(false);
    }
  });

  test('rejects reversed, NaN and non-number bounds without coercion', () => {
    expect(isSafeInteger(0, { min: 1, max: -1 })).toBe(false);
    expect(isSafeInteger(0, { min: Number.NaN })).toBe(false);
    expect(isSafeInteger(0, { max: Number.NaN })).toBe(false);

    const coerce = mock(() => {
      throw new Error('Unexpected boundary coercion');
    });
    const invalidBounds: unknown[] = [
      '0',
      null,
      0n,
      false,
      Object(0),
      [],
      {},
      Symbol('bound'),
      () => 0,
      { valueOf: coerce, [Symbol.toPrimitive]: coerce },
    ];

    for (const bound of invalidBounds) {
      for (const options of [{ min: bound }, { max: bound }]) {
        expect(
          isSafeInteger(0, options as { min?: number; max?: number }),
        ).toBe(false);
      }
    }

    expect(coerce).not.toHaveBeenCalled();
  });

  test('narrows an unknown value to a safe integer without bound options', () => {
    const value: unknown = 42;

    if (!isSafeInteger(value)) {
      throw new Error('Expected safe integer');
    }

    expectTypeOf(value).toEqualTypeOf<SafeInteger>();
    expect(value + 1).toBe(43);
    expect(isSafeInteger(value, { min: 0 })).toBe(true);

    const explicitDefault: unknown = 42;
    if (isSafeInteger(explicitDefault, undefined)) {
      expectTypeOf(explicitDefault).toEqualTypeOf<SafeInteger>();
    }
  });

  test('preserves numbers in the false branch of a union', () => {
    const check = (value: string | number) => {
      if (isSafeInteger(value)) {
        expectTypeOf(value).toEqualTypeOf<SafeInteger>();
        return value + 1;
      }

      expectTypeOf(value).toEqualTypeOf<string | number>();
      // @ts-expect-error Non-integer numbers can still reach this branch.
      const stringOnly: string = value;
      void stringOnly;
      return value;
    };

    expect(check(1)).toBe(2);
    expect(check(1.5)).toBe(1.5);
    expect(check('1')).toBe('1');
    expectTypeOf<number>().not.toMatchTypeOf<SafeInteger>();
  });

  test('keeps existing safe integers in both branches of a range check', () => {
    const value: unknown = 42;
    if (!isSafeInteger(value)) throw new Error('Expected safe integer');

    if (isSafeInteger(value, { max: 10 })) {
      expectTypeOf(value).toEqualTypeOf<SafeInteger>();
    } else {
      expectTypeOf(value).toEqualTypeOf<SafeInteger>();
      // @ts-expect-error A safe integer outside the range is still inhabited.
      const impossible: never = value;
      void impossible;
      expect<number>(value).toBe(42);
    }

    const checkUnion = (item: SafeInteger | string) => {
      if (isSafeInteger(item, { min: 0 })) {
        expectTypeOf(item).toEqualTypeOf<SafeInteger | string>();
      } else {
        expectTypeOf(item).toEqualTypeOf<SafeInteger | string>();
        // @ts-expect-error A negative safe integer also reaches this branch.
        const stringOnly: string = item;
        void stringOnly;
      }
    };
    checkUnion(value);
    checkUnion('42');

    const raw: unknown = 42;
    if (isSafeInteger(raw, { min: 0 })) {
      expectTypeOf(raw).toEqualTypeOf<unknown>();
    }

    const checkOptional = (
      item: SafeInteger | string,
      options?: { min?: number; max?: number },
    ) => {
      if (isSafeInteger(item, options)) {
        expectTypeOf(item).toEqualTypeOf<SafeInteger | string>();
      } else {
        expectTypeOf(item).toEqualTypeOf<SafeInteger | string>();
      }
    };
    checkOptional(value);
    checkOptional(value, { max: 10 });
  });

  test('filters to branded safe integers', () => {
    const values: (string | number)[] = [1, 1.5, '2', -2];
    const integers = values.filter(isSafeInteger);
    expectTypeOf(integers).toEqualTypeOf<SafeInteger[]>();
    expect<number[]>(integers).toEqual([1, -2]);
  });

  test('works as a hasOwn value guard and preserves existing properties', () => {
    const data: { label: string; count?: unknown } = {
      label: 'momo',
      count: 2,
    };

    if (!hasOwn(data, 'count', isSafeInteger)) {
      throw new Error('Expected own safe integer');
    }

    expectTypeOf(data.count).toEqualTypeOf<SafeInteger>();
    expectTypeOf(data.label).toEqualTypeOf<string>();
    expect<number>(data.count).toBe(2);
    expect(hasOwn({ count: '2' }, 'count', isSafeInteger)).toBe(false);
    expect(hasOwn({}, 'count', isSafeInteger)).toBe(false);
  });

  test('preserves rejected property types with hasOwn', () => {
    const data: { count: string | number } = { count: 1.5 };
    if (hasOwn(data, 'count', isSafeInteger)) {
      expectTypeOf(data.count).toEqualTypeOf<SafeInteger>();
    } else {
      expectTypeOf(data.count).toEqualTypeOf<string | number>();
      expect(data.count).toBe(1.5);
    }
  });
});
