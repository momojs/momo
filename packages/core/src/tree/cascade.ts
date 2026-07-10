import { isArray, merge } from 'remeda';

import type { PlainObject } from '../types';
import { defs } from './defs';
import type { Names, TreeNode } from './types';

/**
 * 按层级从树中选择一条级联路径。
 *
 * 每一层都会从当前兄弟节点列表中找到第一个让 `predicate` 返回真值的节点，
 * 将该节点去掉 children 后加入结果，然后继续在它的子节点中查找下一层。
 *
 * @param tree 待查找的树节点列表。
 * @param predicate 用于选择每一层节点的谓词函数。
 * @param params.names 自定义 id、parent、children 字段名。
 * @returns 从根到最后一个命中节点的路径；每个节点都会移除 children 字段。
 */
export function cascade<
  T extends PlainObject,
  const C extends string = 'children',
  P extends string = 'parent',
>(
  tree: TreeNode<T, C>[],
  predicate: (
    curr: TreeNode<T, C>,
    index: number,
    depth: number,
    parent?: TreeNode<T, C>,
  ) => unknown,
  params: {
    names?: Names<T, C, P>;
  } = {},
) {
  type CNode = TreeNode<T, C>;

  type Node = Omit<CNode, C>;

  const { names } = params;

  const state = { depth: 0, res: [] as Node[] };

  const { children: Children = 'children' } = merge(defs, names);

  function run(data: CNode[], parent?: CNode) {
    const { depth } = state;
    const current = data.find((e, idx) => predicate(e, idx, depth, parent));
    if (current) {
      const { [Children as C]: children, ...rest } = current;
      state.depth = Math.max(state.depth, depth + 1);
      state.res.push(rest as Node);
      if (isArray(children)) {
        run(children, current);
      }
    }
  }

  run(tree);

  return state.res;
}
