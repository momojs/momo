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

  test('handles a node with a very large number of children', () => {
    type Node = { id: number };
    const children = Array.from({ length: 200_000 }, (_, id) => ({
      id,
      children: [],
    }));
    expect(leaves<Node>([{ id: -1, children }])).toHaveLength(200_000);
  });
});
