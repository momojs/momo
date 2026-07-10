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
});
