import { isEmptyish, isNot, merge } from 'remeda';

import type { PlainObject } from '../types';
import { defs } from './defs';
import type { Names, TreeNode } from './types';

/**
 * 获取树中的所有叶节点。
 *
 * 没有 children，或 children 为空的节点会被视为叶节点。
 *
 * @param tree 待查找叶节点的树节点列表。
 * @param params.names 自定义 children 字段名。
 * @returns 所有叶节点，按广度优先遍历顺序返回。
 */
export function leaves<
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

  const { names } = params;

  const { children: Children = 'children' } = merge(defs, names);

  const res: CNode[] = [];

  const queue: CNode[] = [...tree];

  for (let head = 0; head < queue.length; head++) {
    const node = queue[head]!;
    const children = node[Children as C];
    if (isNot(isEmptyish)(children)) {
      queue.push(...(children as CNode[]));
      continue;
    }
    res.push(node);
  }

  return res;
}
