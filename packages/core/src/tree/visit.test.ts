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

  test('handles a node with a very large number of children', () => {
    type Node = { id: number };
    const children = Array.from({ length: 200_000 }, (_, id) => ({
      id,
      children: [],
    }));
    let count = 0;

    const depth = visit<Node>([{ id: -1, children }], () => {
      count++;
    });

    expect(depth).toBe(1);
    expect(count).toBe(200_001);
  });
});
