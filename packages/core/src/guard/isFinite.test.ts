import { describe, expect, expectTypeOf, mock, test } from 'bun:test';

import type { FiniteNumber as ExportedFiniteNumber } from '../index';
import { isFinite as exportedIsFinite } from '../index';
import { hasOwn } from './hasOwn';
import type { FiniteNumber } from './isFinite';
import { isFinite } from './isFinite';

describe('isFinite', () => {
  test('exports the guard and branded type from the root entry point', () => {
    expect(exportedIsFinite).toBe(isFinite);
    expectTypeOf<ExportedFiniteNumber>().toEqualTypeOf<FiniteNumber>();
  });

  test('accepts finite primitives including fractions and unsafe integers', () => {
    for (const value of [
      -Number.MAX_VALUE,
      Number.MIN_SAFE_INTEGER - 1,
      -1,
      -0.5,
      -Number.MIN_VALUE,
      -0,
      0,
      Number.MIN_VALUE,
      0.5,
      1,
      Number.MAX_SAFE_INTEGER + 1,
      Number.MAX_VALUE,
    ]) {
      expect(isFinite(value)).toBe(true);
    }
  });

  test('rejects non-finite numbers and other types without coercion', () => {
    const coerce = mock(() => {
      throw new Error('Unexpected coercion');
    });

    for (const value of [
      Number.NaN,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      '',
      ' ',
      '0',
      '1.5',
      0n,
      null,
      undefined,
      false,
      true,
      Object(1),
      [],
      [1],
      {},
      Symbol('finite'),
      () => 1,
      { valueOf: coerce, toString: coerce, [Symbol.toPrimitive]: coerce },
    ]) {
      expect(isFinite(value)).toBe(false);
    }

    expect(coerce).not.toHaveBeenCalled();
  });

  test('narrows unknown values and composes with hasOwn', () => {
    const value: unknown = 1.5;
    if (!isFinite(value)) throw new Error('Expected a finite number');
    expectTypeOf(value).toEqualTypeOf<FiniteNumber>();
    expect(value.toFixed(1)).toBe('1.5');
    expectTypeOf<FiniteNumber>().toMatchTypeOf<number>();
    expectTypeOf<number>().not.toMatchTypeOf<FiniteNumber>();

    const data: { label: string; amount?: unknown } = {
      label: 'momo',
      amount: 1.5,
    };
    if (!hasOwn(data, 'amount', isFinite)) {
      throw new Error('Expected an own finite amount');
    }
    expectTypeOf(data.amount).toEqualTypeOf<FiniteNumber>();
    expectTypeOf(data.label).toEqualTypeOf<string>();
    expect<number>(data.amount).toBe(1.5);
    expect(hasOwn({ amount: '1.5' }, 'amount', isFinite)).toBe(false);
    expect(hasOwn({}, 'amount', isFinite)).toBe(false);
  });

  test('preserves numbers in the false branch of a union', () => {
    const check = (value: number | string) => {
      if (isFinite(value)) {
        expectTypeOf(value).toEqualTypeOf<FiniteNumber>();
        return value + 1;
      }

      expectTypeOf(value).toEqualTypeOf<number | string>();
      // @ts-expect-error NaN and infinite numbers can still reach this branch.
      const stringOnly: string = value;
      void stringOnly;
      return value;
    };

    expect(check(1.5)).toBe(2.5);
    expect(check(Number.NaN)).toBeNaN();
    expect(check(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(check('1.5')).toBe('1.5');
  });

  test('filters to branded numbers and preserves rejected property types', () => {
    const values: (number | string)[] = [1.5, Number.NaN, '2', -2, Infinity];
    const finite = values.filter(isFinite);
    expectTypeOf(finite).toEqualTypeOf<FiniteNumber[]>();
    expect<number[]>(finite).toEqual([1.5, -2]);

    const data: { amount: number | string } = { amount: Infinity };
    if (hasOwn(data, 'amount', isFinite)) {
      expectTypeOf(data.amount).toEqualTypeOf<FiniteNumber>();
    } else {
      expectTypeOf(data.amount).toEqualTypeOf<number | string>();
      expect(data.amount).toBe(Infinity);
    }
  });
});
