import { describe, expect, test } from 'bun:test';

import { height } from './height';
import type { TreeNode } from './types';

describe('height', () => {
  test('returns the max depth of the tree', () => {
    type Node = { id: string };
    const tree: TreeNode<Node>[] = [
      {
        id: 'root',
        children: [{ id: 'child', children: [{ id: 'leaf', children: [] }] }],
      },
    ];

    expect(height<Node>(tree)).toBe(2);
  });

  test('returns zero for an empty tree', () => {
    expect(height([])).toBe(0);
  });

  test('handles a node with a very large number of children', () => {
    const children = Array.from({ length: 200_000 }, (_, id) => ({
      id,
      children: [],
    }));
    expect(height<{ id: number }>([{ id: -1, children }])).toBe(1);
  });
});
