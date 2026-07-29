import { isArray, merge } from 'remeda';

import type { PlainObject } from '../types.js';
import { defs } from './defs.js';
import type { Names, TreeNode } from './types.js';

/**
 * 获取树的最大深度。
 *
 * 根节点深度为 0。空树的深度返回 0。
 *
 * @param tree 待计算深度的树节点列表。
 * @param params.names 自定义 children 字段名。
 * @returns 树中最深节点的深度。
 */
export function height<
  T extends PlainObject,
  const C extends string = 'children',
  P extends string = 'parent',
>(
  tree: TreeNode<T, C>[],
  params: {
    names?: Names<T, C, P>;
  } = {},
) {
  type CNode = TreeNode<T, C>;

  type QueueNode = { node: CNode; depth: number };

  const { names } = params;

  let depth = 0;

  const { children: Children = 'children' } = merge(defs, names);

  const queue: QueueNode[] = tree.map((node) => ({ node, depth: 0 }));

  for (let head = 0; head < queue.length; head++) {
    const { node, depth: current } = queue[head]!;
    depth = Math.max(depth, current);
    const children = node[Children as C];
    if (isArray(children)) {
      queue.push(
        ...children.map((item) => ({
          node: item,
          depth: current + 1,
        })),
      );
    }
  }

  return depth;
}
