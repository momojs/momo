import { describe, expect, test } from 'bun:test';

import { leaves } from './leaves';
import type { TreeNode } from './types';

describe('leaves', () => {
  test('returns all leaf nodes in breadth-first order', () => {
    type Node = { id: string };
    const tree: TreeNode<Node>[] = [
      {
        id: 'root',
        children: [
          { id: 'a', children: [{ id: 'a1', children: [] }] },
          { id: 'b', children: [] },
        ],
      },
    ];

    expect(leaves<Node>(tree).map((node) => node.id)).toEqual(['b', 'a1']);
  });
});
