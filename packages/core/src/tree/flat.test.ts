import { describe, expect, test } from 'bun:test';

import { flat } from './flat';
import type { TreeNode } from './types';

describe('flat', () => {
  test('flattens a tree and writes parent ids', () => {
    type Node = { id: string; label: string };
    const tree: TreeNode<Node>[] = [
      {
        id: 'root',
        label: 'Root',
        children: [
          { id: 'a', label: 'A', children: [] },
          { id: 'b', label: 'B', children: [] },
        ],
      },
    ];

    expect(flat<Node>(tree) as unknown[]).toEqual([
      { id: 'root', label: 'Root', parent: undefined },
      { id: 'a', label: 'A', parent: 'root' },
      { id: 'b', label: 'B', parent: 'root' },
    ]);
  });

  test('uses custom field names', () => {
    type Node = { key: string };
    const tree: TreeNode<Node, 'nodes'>[] = [
      {
        key: 'root',
        nodes: [{ key: 'child', nodes: [] }],
      },
    ];

    expect(
      flat<Node, 'nodes', 'parentKey'>(tree, {
        names: { id: 'key', parent: 'parentKey', children: 'nodes' },
      }) as unknown[],
    ).toEqual([
      { key: 'root', parentKey: undefined },
      { key: 'child', parentKey: 'root' },
    ]);
  });
});
