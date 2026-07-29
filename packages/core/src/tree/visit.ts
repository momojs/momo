import { isArray, merge } from 'remeda';

import type { PlainObject } from '../types.js';
import { defs } from './defs.js';
import type { Names, TreeNode } from './types.js';

/**
 * 广度优先遍历整棵树。
 *
 * 回调会接收当前节点、深度和父节点。根节点深度为 0。
 *
 * @param tree 待遍历的树节点列表。
 * @param callback 每个节点的访问回调。
 * @param params.names 自定义 children 字段名。
 * @returns 遍历过程中遇到的最大深度。
 */
export function visit<
  T extends PlainObject,
  const C extends string = 'children',
  P extends string = 'parent',
>(
  tree: TreeNode<T, C>[],
  callback?: (
    item: TreeNode<T, C>,
    depth: number,
    parent?: TreeNode<T, C>,
  ) => void,
  params: {
    names?: Names<T, C, P>;
  } = {},
) {
  type CNode = TreeNode<T, C>;

  type QueueNode = { node: CNode; depth: number; parent?: CNode };

  const { names } = params;

  const state = { depth: 0 };

  const { children: Children = 'children' } = merge(defs, names);

  const queue: QueueNode[] = tree.map((node) => ({
    node,
    depth: 0,
    parent: undefined,
  }));

  for (let head = 0; head < queue.length; head++) {
    const { node, depth, parent } = queue[head]!;
    state.depth = Math.max(state.depth, depth);
    const children = node[Children as C];
    if (isArray(children)) {
      // 将子节点添加到队列
      queue.push(
        ...children.map((item) => ({
          node: item,
          parent: node,
          depth: depth + 1,
        })),
      );
    }
    callback?.(node, depth, parent);
  }
  return state.depth;
}
