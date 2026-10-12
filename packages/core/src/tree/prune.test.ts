import { describe, expect, test } from 'bun:test';

import { prune } from './prune';
import type { TreeNode } from './types';

describe('prune', () => {
  test('keeps matching leaves and their ancestors', () => {
    type Node = { id: string };
    const tree: TreeNode<Node>[] = [
      {
        id: 'root',
        children: [
          { id: 'keep', children: [] },
          { id: 'drop', children: [] },
        ],
      },
    ];

    expect(
      prune<Node>(tree, (node) => node.id === 'keep') as unknown[],
    ).toEqual([
      {
        id: 'root',
        children: [{ id: 'keep', children: [] }],
      },
    ]);
  });

  test('does not mutate the original tree', () => {
    type Node = { id: string };
    const tree: TreeNode<Node>[] = [
      {
        id: 'root',
        children: [
          { id: 'keep', children: [] },
          { id: 'drop', children: [] },
        ],
      },
    ];

    prune<Node>(tree, (node) => node.id === 'keep');

    expect(tree[0]?.children.map((node) => node.id)).toEqual(['keep', 'drop']);
  });
});
