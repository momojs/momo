import { describe, expect, test } from 'bun:test';

import type { Fields, IDKeys, Names, ParentKeys, TreeNode } from './types';

describe('tree types', () => {
  test('exports public tree utility types', () => {
    type Node = { id: string; parent?: string };
    type _IDKeys = IDKeys<Node>;
    type _ParentKeys = ParentKeys<Node>;
    type _Fields = Fields<Node, 'children'>;
    type _Names = Names<Node, 'children'>;
    type _TreeNode = TreeNode<Node>;

    expect(true).toBe(true);
  });
});
