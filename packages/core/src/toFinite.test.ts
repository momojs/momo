import { describe, expect, expectTypeOf, mock, test } from 'bun:test';

import { toFinite as exportedToFinite } from './index';
import { toFinite } from './toFinite';

describe('toFinite', () => {
  test('exports the same function with an unknown input and optional result', () => {
    expect(exportedToFinite).toBe(toFinite);
    expectTypeOf(toFinite).toEqualTypeOf<
      (value: unknown) => number | undefined
    >();
    expectTypeOf(exportedToFinite('12')).toEqualTypeOf<number | undefined>();
    expect(Reflect.apply(toFinite, undefined, [])).toBeUndefined();
  });

  test('preserves every finite primitive number, including signed zero', () => {
    for (const value of [
      0,
      -0,
      0.5,
      -12.75,
      Number.MIN_VALUE,
      -Number.MIN_VALUE,
      Number.MAX_VALUE,
      -Number.MAX_VALUE,
      Number.MAX_SAFE_INTEGER + 1,
      Number.MIN_SAFE_INTEGER - 1,
    ]) {
      expect(Object.is(toFinite(value), value)).toBe(true);
    }
  });

  test('accepts complete ASCII decimal forms with optional signs and exponents', () => {
    const cases: [string, number][] = [
      ['42', 42],
      ['+42', 42],
      ['-42', -42],
      ['00042', 42],
      ['+000.50', 0.5],
      ['.5', 0.5],
      ['-.5', -0.5],
      ['+.5', 0.5],
      ['12.', 12],
      ['-12.', -12],
      ['1e3', 1000],
      ['1E+03', 1000],
      ['-1.25e-2', -0.0125],
      ['.5E2', 50],
      ['1.e3', 1000],
      ['000.5e+001', 5],
    ];

    for (const [value, expected] of cases) {
      expect(toFinite(value)).toBe(expected);
    }
  });

  test('trims ECMAScript whitespace at both ends and rejects whitespace alone', () => {
    const whitespace = [
      '\u0009',
      '\u000a',
      '\u000b',
      '\u000c',
      '\u000d',
      '\u0020',
      '\u00a0',
      '\u1680',
      '\u2000',
      '\u2001',
      '\u2002',
      '\u2003',
      '\u2004',
      '\u2005',
      '\u2006',
      '\u2007',
      '\u2008',
      '\u2009',
      '\u200a',
      '\u2028',
      '\u2029',
      '\u202f',
      '\u205f',
      '\u3000',
      '\ufeff',
    ];

    for (const space of whitespace) {
      expect(toFinite(`${space}-12.5e+1${space}`)).toBe(-125);
      expect(toFinite(space)).toBeUndefined();
    }

    const padding = whitespace.join('');
    expect(toFinite(`${padding}+12.${padding}`)).toBe(12);
    expect(toFinite(padding)).toBeUndefined();
  });

  test('rejects partial decimal forms and internal whitespace', () => {
    for (const value of [
      '',
      '+',
      '-',
      '.',
      '+.',
      '-.',
      'e3',
      '.e3',
      '1e',
      '1e+',
      '1e-',
      '1.e+',
      '1e1.5',
      '1ee2',
      '1.2.3',
      '--1',
      '+-1',
      '1-2',
      '+ 1',
      '1 2',
      '1 e3',
      '1e +3',
      '1\t2',
      '1\n2',
      '1\r\n2',
      '1\u00a02',
    ]) {
      expect(toFinite(value)).toBeUndefined();
    }
  });

  test('rejects alternate notations, suffixes and non-ASCII numeric characters', () => {
    for (const value of [
      '0x10',
      '+0X10',
      '0b10',
      '-0B10',
      '0o10',
      '0O10',
      '1_000',
      '1,000',
      '1,5',
      '12%',
      '12px',
      '12n',
      '12foo',
      '１２',
      '١٢',
      '−12',
      '＋12',
      '1．5',
      '1e２',
      '\u00851',
      '1\u180e',
      '\u200b1',
      '1\u0000',
    ]) {
      expect(toFinite(value)).toBeUndefined();
    }
  });

  test('rejects non-finite numbers, their spellings and overflowing decimals', () => {
    for (const value of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      'NaN',
      '+NaN',
      'Infinity',
      '+Infinity',
      '-Infinity',
      'infinity',
      '1e309',
      '-1e309',
      '1.7976931348623159e308',
      `1${'0'.repeat(400)}`,
    ]) {
      expect(toFinite(value)).toBeUndefined();
    }
  });

  test('retains Number rounding, finite limits and signed underflow', () => {
    const cases: [string, number][] = [
      ['0', 0],
      ['+0.0e-12', 0],
      ['-0', -0],
      ['-000.0e+12', -0],
      ['9007199254740993', 9007199254740992],
      ['-9007199254740993', -9007199254740992],
      ['5e-324', Number.MIN_VALUE],
      ['-5e-324', -Number.MIN_VALUE],
      ['1e-400', 0],
      ['-1e-400', -0],
      ['1.7976931348623157e308', Number.MAX_VALUE],
      ['-1.7976931348623157e308', -Number.MAX_VALUE],
      ['1.7976931348623158e308', Number.MAX_VALUE],
      [`${'0'.repeat(20_000)}1.5`, 1.5],
    ];

    for (const [value, expected] of cases) {
      expect(Object.is(toFinite(value), expected)).toBe(true);
    }

    expect(toFinite(`${'0'.repeat(20_000)}1.5x`)).toBeUndefined();
  });

  test('rejects other types without invoking coercion methods or getters', () => {
    const coerce = mock(() => {
      throw new Error('Unexpected coercion');
    });
    const access = mock(() => {
      throw new Error('Unexpected property access');
    });
    const callable = mock(() => 12);
    const getters = Object.defineProperties(
      {},
      {
        valueOf: { get: access },
        toString: { get: access },
        [Symbol.toPrimitive]: { get: access },
        [Symbol.toStringTag]: { get: access },
      },
    );

    for (const value of [
      null,
      undefined,
      true,
      false,
      12n,
      Symbol('12'),
      [],
      [12],
      ['12'],
      {},
      Object.create(null),
      Object(12),
      Object('12'),
      Object(true),
      Object(12n),
      Object(Symbol('12')),
      { valueOf: coerce, toString: coerce, [Symbol.toPrimitive]: coerce },
      getters,
      callable,
    ]) {
      expect(toFinite(value)).toBeUndefined();
    }

    expect(coerce).not.toHaveBeenCalled();
    expect(access).not.toHaveBeenCalled();
    expect(callable).not.toHaveBeenCalled();
  });

  test('rejects object and callable proxies without triggering traps', () => {
    const trap = mock(() => {
      throw new Error('Unexpected proxy trap');
    });

    for (const target of [{}, [], Object(12), () => 12]) {
      const proxy = new Proxy(target, {
        get: trap,
        getPrototypeOf: trap,
        getOwnPropertyDescriptor: trap,
        has: trap,
        ownKeys: trap,
        apply: trap,
      });
      const revoked = Proxy.revocable(target, {});
      revoked.revoke();

      expect(toFinite(proxy)).toBeUndefined();
      expect(toFinite(revoked.proxy)).toBeUndefined();
    }

    expect(trap).not.toHaveBeenCalled();
  });
});
