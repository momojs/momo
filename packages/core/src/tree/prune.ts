import { clone, isEmptyish, isNot, merge } from 'remeda';

import type { PlainObject } from '../types.js';
import { defs } from './defs.js';
import type { Fields, Names, TreeNode } from './types.js';

/**
 * 对树进行剪枝。
 *
 * 函数会先递归处理子节点，再判断当前节点是否保留。只要某个节点剪枝后仍有子节点，
 * 该节点会被保留；否则由 `predicate` 决定是否保留当前节点。
 *
 * 输入树会先被克隆，原始树不会被直接修改。
 *
 * 当前策略固定为保留命中节点以及命中节点的祖先；更细粒度的剪枝策略
 * 应通过 `predicate` 显式表达。
 *
 * @param tree 待剪枝的树节点列表。
 * @param predicate 判断叶节点或空父节点是否保留的谓词函数。
 * @param params.names 自定义 children 字段名。
 * @param params.parent 当前递归层的父节点，主要供内部递归传递。
 * @returns 剪枝后的新树。
 */
export function prune<
  T extends PlainObject,
  const C extends string = 'children',
>(
  tree: TreeNode<T, C>[],
  predicate: (val: TreeNode<T, C>, parent?: TreeNode<T, C>) => unknown,
  params: {
    names?: Names<T, C>;
    parent?: TreeNode<T, C>;
  } = {},
): TreeNode<T, C>[] {
  type CNode = TreeNode<T, C>;

  const { names, parent } = params;

  const { children: Children } = merge(defs, params.names) as Fields<T, C>;

  return clone(tree).filter((item) => {
    const children = item[Children] as CNode[];
    if (isNot(isEmptyish)(children)) {
      const params = { names, parent: item };
      const current = prune(children, predicate, params);
      item[Children] = current as CNode[C];
      if (isNot(isEmptyish)(current)) return true;
    }
    return predicate(item, parent);
  });
}
