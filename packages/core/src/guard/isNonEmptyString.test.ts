import { describe, expect, expectTypeOf, test } from 'bun:test';

import { isNonEmptyString as exportedIsNonEmptyString } from '../index';
import { hasOwn } from './hasOwn';
import type { NonEmptyString } from './isNonEmptyString';
import { isNonEmptyString } from './isNonEmptyString';

describe('isNonEmptyString', () => {
  test('is exported from the root entry point', () => {
    expect(exportedIsNonEmptyString).toBe(isNonEmptyString);
  });

  test('accepts strings containing non-whitespace characters', () => {
    for (const value of ['momo', ' momo ', '\n中文\t', '🥭', '\0', '\u200B']) {
      expect(isNonEmptyString(value)).toBe(true);
    }
  });

  test('rejects empty strings and ECMAScript trim whitespace', () => {
    for (const value of ['', ' ', '\n\t\r', '\u00A0', '\u3000', '\uFEFF']) {
      expect(isNonEmptyString(value)).toBe(false);
    }
  });

  test('rejects non-string values and boxed strings without coercion', () => {
    const values: unknown[] = [
      undefined,
      null,
      false,
      true,
      0,
      1,
      NaN,
      1n,
      Symbol('momo'),
      [],
      ['momo'],
      {},
      { length: 1 },
      new String('momo'),
      () => 'momo',
      {
        get length(): never {
          throw new Error('Must not read non-string lengths');
        },
        [Symbol.toPrimitive](): never {
          throw new Error('Must not coerce non-string values');
        },
      },
    ];
    for (const value of values) {
      expect(isNonEmptyString(value)).toBe(false);
    }
  });

  test('narrows unknown values and composes with hasOwn', () => {
    const value: unknown = ' momo ';
    if (!isNonEmptyString(value)) throw new Error('Expected a string');
    expectTypeOf(value).toEqualTypeOf<NonEmptyString>();
    expect(value.toUpperCase()).toBe(' MOMO ');

    const data: object = { name: 'momo' };
    if (!hasOwn(data, 'name', isNonEmptyString)) {
      throw new Error('Expected a nonempty name');
    }
    expectTypeOf(data.name).toEqualTypeOf<NonEmptyString>();
    expect<string>(data.name).toBe('momo');
    expect(hasOwn({ name: '' }, 'name', isNonEmptyString)).toBe(false);
    expect(hasOwn({ name: ' \n ' }, 'name', isNonEmptyString)).toBe(false);
  });

  test('preserves strings in the false branch of a union', () => {
    const check = (value: string | number) => {
      if (isNonEmptyString(value)) {
        expectTypeOf(value).toEqualTypeOf<NonEmptyString>();
        return value.toUpperCase();
      }

      expectTypeOf(value).toEqualTypeOf<string | number>();
      // @ts-expect-error Empty and whitespace-only strings can reach this branch.
      const numberOnly: number = value;
      void numberOnly;
      return value;
    };

    expect(check('momo')).toBe('MOMO');
    expect(check('')).toBe('');
    expect(check(' \n ')).toBe(' \n ');
    expect(check(1)).toBe(1);
    expectTypeOf<string>().not.toMatchTypeOf<NonEmptyString>();
  });

  test('filters to branded strings and preserves rejected property types', () => {
    const values: (string | number)[] = ['momo', '', ' ', '\n', 1];
    const nonempty = values.filter(isNonEmptyString);
    expectTypeOf(nonempty).toEqualTypeOf<NonEmptyString[]>();
    expect<string[]>(nonempty).toEqual(['momo']);

    const data: { name: string | number } = { name: '' };
    if (hasOwn(data, 'name', isNonEmptyString)) {
      expectTypeOf(data.name).toEqualTypeOf<NonEmptyString>();
    } else {
      expectTypeOf(data.name).toEqualTypeOf<string | number>();
      expect(data.name).toBe('');
    }
  });
});
