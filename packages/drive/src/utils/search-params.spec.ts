import { describe, expect, test } from 'bun:test';

import { toSearchParams } from './search-params';

describe('toSearchParams', () => {
  test('keeps URLSearchParams values', () => {
    const source = new URLSearchParams('a=1');
    expect(toSearchParams(source)).toBe(source);
  });

  test('parses query strings', () => {
    expect(toSearchParams('a=1&b=2')?.get('a')).toBe('1');
  });

  test('treats array tokens without "=" as true flags', () => {
    const params = toSearchParams(['a=1', 'flag', ' b=2 ']);

    expect(params?.get('a')).toBe('1');
    expect(params?.get('flag')).toBe('true');
    expect(params?.get('b')).toBe('2');
  });

  test('serializes object values and drops undefined', () => {
    const at = new Date('2026-01-02T03:04:05.000Z');
    const params = toSearchParams({
      a: 1,
      b: undefined,
      c: false,
      empty: null,
      at,
      tags: ['momo', 'drive'],
      filter: { tag: 'momo' },
    });

    expect(params?.get('a')).toBe('1');
    expect(params?.has('b')).toBe(false);
    expect(params?.get('c')).toBe('false');
    expect(params?.get('empty')).toBe('null');
    expect(params?.get('at')).toBe(at.toISOString());
    expect(params?.get('tags')).toBe('momo,drive');
    expect(params?.get('filter')).toBe('{"tag":"momo"}');
  });

  test('returns undefined for unsupported values', () => {
    expect(toSearchParams(null)).toBeUndefined();
    expect(toSearchParams(1)).toBeUndefined();
    expect(toSearchParams(undefined)).toBeUndefined();
  });
});
