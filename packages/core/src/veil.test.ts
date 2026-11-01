import { describe, expect, expectTypeOf, test } from 'bun:test';

import type { VeilParams as RootVeilParams } from './index';
import { veil as rootVeil } from './index';
import type { VeilParams } from './veil';
import { veil } from './veil';

describe('veil', () => {
  test('masks every grapheme when params are omitted or undefined', () => {
    expect(veil('abcdefghij')).toBe('**********');
    expect(veil('张👨‍👩‍👧‍👦👍🏽🇨🇳e\u0301', undefined)).toBe('*****');
  });

  test('preserves the requested prefix and suffix', () => {
    expect(veil('abcdefghij', { fore: 2, tail: 3 })).toBe('ab*****hij');
    expect(veil('张三丰', { fore: 1, tail: 0 })).toBe('张**');
    expect(veil('abcdef', { fore: 0, tail: 2 })).toBe('****ef');
    expect(veil('abc', { fore: 0, tail: 0 })).toBe('***');
  });

  test.each([
    { fore: 2, tail: 3 },
    { fore: 3, tail: 3 },
    { fore: 5, tail: 0 },
    { fore: 0, tail: 5 },
    { fore: 20, tail: 0 },
    { fore: 0, tail: 20 },
  ])('returns the original string when retained ranges cover it: %j', (params) => {
    expect(veil('abcde', params)).toBe('abcde');
  });

  test('accepts integer counts beyond the safe integer range', () => {
    expect(veil('abc', { fore: Number.MAX_VALUE, tail: 0 })).toBe('abc');
    expect(veil('abc', { fore: 0, tail: Number.MAX_SAFE_INTEGER + 1 })).toBe(
      'abc',
    );
  });

  test('treats negative zero as zero', () => {
    expect(veil('abc', { fore: -0, tail: -0 })).toBe('***');
  });

  test('returns an empty string for empty input', () => {
    expect(veil('')).toBe('');
    expect(veil('', { fore: 0, tail: 0 })).toBe('');
    expect(veil('', { fore: 10, tail: 10, mask: '•' })).toBe('');
  });

  test.each([
    '张',
    '👨‍👩‍👧‍👦',
    '👍🏽',
    '🇨🇳',
    'e\u0301',
  ])('masks and retains %s as a complete grapheme', (grapheme) => {
    expect(veil(`A${grapheme}B`, { fore: 1, tail: 1, mask: '•' })).toBe('A•B');
    expect(veil(`${grapheme}AB${grapheme}`, { fore: 1, tail: 1 })).toBe(
      `${grapheme}**${grapheme}`,
    );
  });

  test('counts mixed Unicode text by graphemes', () => {
    expect(veil('甲👨‍👩‍👧‍👦👍🏽🇨🇳e\u0301乙', { fore: 1, tail: 1 })).toBe(
      '甲****乙',
    );
  });

  test.each([
    ['', 'abf'],
    ['xy', 'abxyxyxyf'],
    ['🙈', 'ab🙈🙈🙈f'],
    ['e\u0301', 'abe\u0301e\u0301e\u0301f'],
  ])('replaces each hidden grapheme once with mask %j', (mask, expected) => {
    expect(veil('abcdef', { fore: 2, tail: 1, mask })).toBe(expected);
  });

  test('does not mutate params', () => {
    const params: VeilParams = Object.freeze({ fore: 1, tail: 1, mask: '•' });

    expect(veil('A👨‍👩‍👧‍👦B', params)).toBe('A•B');
    expect(params).toEqual({ fore: 1, tail: 1, mask: '•' });
  });

  for (const field of ['fore', 'tail'] as const) {
    test.each([
      -1,
      -0.5,
      0.5,
      Number.NaN,
      Infinity,
      -Infinity,
    ])(`rejects invalid ${field} count %s even for empty or fully retained input`, (count) => {
      const params: VeilParams = { fore: 10, tail: 10, [field]: count };

      expect(() => veil('abcdefghijabcdefghijabcdefghij', params)).toThrow(
        RangeError,
      );
      expect(() => veil('abc', params)).toThrow(RangeError);
      expect(() => veil('', params)).toThrow(RangeError);
    });
  }

  test('exports the function and parameter type from the root entry', () => {
    expect(rootVeil).toBe(veil);
    expectTypeOf<RootVeilParams>().toEqualTypeOf<VeilParams>();
    expectTypeOf<typeof veil>().toEqualTypeOf<
      (value: string, params?: VeilParams) => string
    >();
    expectTypeOf<VeilParams>().toEqualTypeOf<{
      fore: number;
      tail: number;
      mask?: string;
    }>();
  });
});
