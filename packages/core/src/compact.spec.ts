import { describe, expect, test } from 'bun:test';

import { compact } from './compact';

type Assert<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;
type NotNever<T> = IsNever<T> extends true ? false : true;

describe('compact', () => {
  test('removes emptyish values', () => {
    const result = compact([
      0,
      1,
      '',
      'momo',
      null,
      undefined,
      [],
      {},
      [1],
      { a: 1 },
    ]);

    expect(result as unknown[]).toEqual([0, 1, 'momo', [1], { a: 1 }]);
  });

  test('removes false', () => {
    expect(compact([false, true, 0, 'momo'])).toEqual([true, 0, 'momo']);
  });

  test('keeps NaN unlike lodash compact', () => {
    const nan = Number.NaN;

    expect(compact([nan, 'momo'])).toEqual([nan, 'momo']);
  });

  test('removes empty collections and object-like emptyish values', () => {
    const date = new Date();
    const regexp = /abc/;

    expect(
      compact([
        new Map(),
        new Set(),
        new WeakMap(),
        new WeakSet(),
        date,
        regexp,
        { size: 0, label: 'ignored by runtime' },
      ]) as unknown[],
    ).toEqual([]);
  });

  test('does not mutate the input array', () => {
    const source = ['momo', ''] as const;

    expect(compact(source)).toEqual(['momo']);
    expect(source).toEqual(['momo', '']);
  });

  test('narrows literal tuple types', () => {
    const result = compact(['momo', '', null, false] as const);

    result satisfies ('momo')[];
    expect(result).toEqual(['momo']);
  });

  test('does not narrow broad object arrays to never', () => {
    const result = compact([{ a: 1 }] as object[]);

    type _ElementIsStillUsable = Assert<NotNever<(typeof result)[number]>>;
    result satisfies object[];
    expect(result).toEqual([{ a: 1 }]);
  });
});
