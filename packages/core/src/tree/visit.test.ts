import { describe, expect, test } from 'bun:test';

import type { TreeNode } from './types';
import { visit } from './visit';

describe('visit', () => {
  test('visits nodes breadth-first and returns max depth', () => {
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
    const seen: Array<[string, number, string | undefined]> = [];

    const depth = visit<Node>(tree, (node, currentDepth, parent) => {
      seen.push([node.id, currentDepth, parent?.id]);
    });

    expect(depth).toBe(2);
    expect(seen).toEqual([
      ['root', 0, undefined],
      ['a', 1, 'root'],
      ['b', 1, 'root'],
      ['a1', 2, 'a'],
    ]);
  });
});
