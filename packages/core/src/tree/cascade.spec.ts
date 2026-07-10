import { describe, expect, test } from 'bun:test';

import { cascade } from './cascade';
import type { TreeNode } from './types';

describe('cascade', () => {
  test('returns the first matching path across levels', () => {
    type Node = { id: string; active: boolean };
    const tree: TreeNode<Node>[] = [
      {
        id: 'root',
        active: true,
        children: [
          { id: 'a', active: false, children: [] },
          {
            id: 'b',
            active: true,
            children: [{ id: 'b1', active: true, children: [] }],
          },
        ],
      },
    ];

    expect(cascade(tree, (node) => node.active)).toEqual([
      { id: 'root', active: true },
      { id: 'b', active: true },
      { id: 'b1', active: true },
    ]);
  });
});
