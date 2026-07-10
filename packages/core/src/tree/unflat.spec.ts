import { describe, expect, test } from 'bun:test';

import { unflat } from './unflat';

describe('unflat', () => {
  test('restores a tree from flat nodes', () => {
    const data = [
      { id: 'root', parent: null, label: 'Root' },
      { id: 'a', parent: 'root', label: 'A' },
      { id: 'b', parent: 'root', label: 'B' },
    ];

    expect(unflat(data)).toEqual([
      {
        id: 'root',
        parent: null,
        label: 'Root',
        children: [
          { id: 'a', parent: 'root', label: 'A', children: [] },
          { id: 'b', parent: 'root', label: 'B', children: [] },
        ],
      },
    ]);
  });

  test('promotes orphan nodes to root by default', () => {
    expect(unflat([{ id: 'child', parent: 'missing' }])).toEqual([
      { id: 'child', parent: 'missing', children: [] },
    ]);
  });

  test('promotes multiple orphan nodes with the same missing parent', () => {
    expect(
      unflat([
        { id: 'a', parent: 'missing' },
        { id: 'b', parent: 'missing' },
      ]),
    ).toEqual([
      { id: 'a', parent: 'missing', children: [] },
      { id: 'b', parent: 'missing', children: [] },
    ]);
  });

  test('throws for orphan nodes when requested', () => {
    expect(() =>
      unflat([{ id: 'child', parent: 'missing' }], { orphan: 'throw' }),
    ).toThrow('missing');
  });

  test('discards orphan nodes when requested', () => {
    expect(
      unflat([{ id: 'child', parent: 'missing' }], { orphan: 'discard' }),
    ).toEqual([]);
  });
});
