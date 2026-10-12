import { describe, expect, test } from 'bun:test';

import { runInNewContext } from 'node:vm';

import type { SearchParamsInput } from './search-params';
import { toSearchParams } from './search-params';

const fromUnknown = (value: unknown) =>
  toSearchParams(value as SearchParamsInput);

describe('toSearchParams', () => {
  test('clones URLSearchParams without changing its repeated keys', () => {
    const source = new URLSearchParams('a=1');
    source.append('a', '2');
    const params = toSearchParams(source);

    expect(params).not.toBe(source);
    expect(params.getAll('a')).toEqual(['1', '2']);
    params.set('a', '3');
    expect(source.getAll('a')).toEqual(['1', '2']);
  });

  test('parses query strings', () => {
    expect(toSearchParams('a=1&b=2').get('a')).toBe('1');
  });

  test('serializes scalars and omits undefined values', () => {
    const at = new Date('2026-01-02T03:04:05.000Z');
    const params = toSearchParams({
      a: 1,
      b: undefined,
      c: false,
      empty: null,
      big: 42n,
      at,
    });

    expect(params.get('a')).toBe('1');
    expect(params.has('b')).toBe(false);
    expect(params.get('c')).toBe('false');
    expect(params.get('empty')).toBe('null');
    expect(params.get('big')).toBe('42');
    expect(params.get('at')).toBe(at.toISOString());
  });

  test('uses repeated keys for arrays and preserves special characters', () => {
    const params = toSearchParams({
      tags: ['a,b', 'c&d', 'e=f'],
      empty: [] as string[],
      blank: '',
      '': '空 格+&=',
    });

    expect(params.getAll('tags')).toEqual(['a,b', 'c&d', 'e=f']);
    expect(params.has('empty')).toBe(false);
    expect(params.get('blank')).toBe('');
    expect(params.get('')).toBe('空 格+&=');
    expect(new URLSearchParams(params.toString()).getAll('tags')).toEqual([
      'a,b',
      'c&d',
      'e=f',
    ]);
  });

  test('accepts cross-realm plain objects and dates', () => {
    const source = runInNewContext('({ at: new Date(0), page: 2 })');
    expect(toSearchParams(source).toString()).toBe(
      'at=1970-01-01T00%3A00%3A00.000Z&page=2',
    );
  });

  test('only reads own enumerable string keys', () => {
    const source = Object.create(null);
    Object.defineProperty(source, 'hidden', { value: 2 });
    source.visible = 3;
    source[Symbol('symbol')] = 4;

    expect(fromUnknown(source).toString()).toBe('visible=3');
    expect(() => fromUnknown(Object.create({ inherited: 1 }))).toThrow(
      TypeError,
    );
  });

  test('rejects unsupported top-level inputs', () => {
    for (const value of [null, undefined, 1, ['a=1'], new Map()]) {
      expect(() => fromUnknown(value)).toThrow(TypeError);
    }
  });

  test('rejects unsupported values instead of losing data', () => {
    for (const value of [
      NaN,
      Infinity,
      -Infinity,
      new Date(NaN),
      { tag: 'momo' },
      new Map(),
      Symbol('tag'),
      () => 'tag',
      [undefined],
      [[1]],
    ]) {
      expect(() => fromUnknown({ value })).toThrow(TypeError);
    }
  });

  test('accepts readonly arrays and interface-shaped objects at compile time', () => {
    interface Query {
      readonly tags: readonly string[];
      page?: number;
    }
    const query: Query = { tags: ['a', 'b'], page: 2 };
    expect(toSearchParams(query).getAll('tags')).toEqual(['a', 'b']);

    const invalidInputTypes = () => {
      // @ts-expect-error nested objects require explicit serialization
      toSearchParams({ filter: { tag: 'momo' } });
      // @ts-expect-error string arrays are not query-fragment inputs
      toSearchParams(['a=1', 'flag']);
      // @ts-expect-error functions are not query objects
      toSearchParams(() => 'a=1');
    };
    void invalidInputTypes;
  });
});
