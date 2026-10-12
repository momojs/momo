import { describe, expect, test } from 'bun:test';

import { ISO } from './index';
import { mod11_2 } from './mod11-2';

const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2] as const;
const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'] as const;

describe('MOD 11-2', () => {
  test.each([
    '11010519491231002X',
    '11010519491231002x',
    '440524188001010014',
  ])('accepts known checksum vectors: %s', (value) =>
    expect(mod11_2(value, weights, codes)).toBe(true));

  test.each([
    '110105194912310020',
    'A1010519491231002X',
    '',
    'X',
    '11010519491231002X\n',
    undefined,
    18,
  ])('rejects invalid input: %j', (value) =>
    expect(mod11_2(value, weights, codes)).toBe(false));

  test('validates weights and remainder mappings', () => {
    expect(mod11_2('A1', [1], codes)).toBe(false);
    expect(mod11_2('1X', [2], codes)).toBe(true);
    expect(
      mod11_2('1x', [2], [...codes.slice(0, 2), 'x', ...codes.slice(3)]),
    ).toBe(true);
    for (const invalid of [
      [],
      [2, 1],
      [-2],
      [NaN],
      [Infinity],
      [1.5],
      [Number.MAX_SAFE_INTEGER + 1],
    ]) {
      expect(mod11_2('1X', invalid, codes)).toBe(false);
    }
    expect(mod11_2('1X', [2], codes.slice(1))).toBe(false);
    expect(mod11_2('1X', [2], [...codes, 'A'])).toBe(false);
    expect(mod11_2('1X', [2], ['XX', ...codes.slice(1)])).toBe(false);
  });

  test('reduces large weights before multiplying', () => {
    const weight = Number.MAX_SAFE_INTEGER;
    const remainder = Number((9n * BigInt(weight)) % 11n);
    expect(mod11_2(`9${codes[remainder]}`, [weight], codes)).toBe(true);
    expect(ISO.mod11_2).toBe(mod11_2);
  });
});
