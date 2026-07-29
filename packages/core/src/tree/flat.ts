import { merge, omit } from 'remeda';

import type { PlainObject } from '../types.js';
import { defs } from './defs.js';
import type { Fields, Names, TreeNode } from './types.js';
import { visit } from './visit.js';

/**
 * 将树结构扁平化为列表。
 *
 * 输出项会移除 children 字段，并补充 parent 字段指向父节点 id。
 * 根节点的 parent 字段为 `undefined`。
 *
 * @param tree 待扁平化的树节点列表。
 * @param params.names 自定义 id、parent、children 字段名。
 * @returns 扁平化后的节点列表。
 */
export function flat<
  T extends PlainObject,
  const C extends string = 'children',
  P extends string = 'parent',
>(
  tree: TreeNode<T, C>[],
  params: {
    names?: Names<T, C, P>;
  } = {},
) {
  const { names } = params;

  const {
    id: Id,
    parent: Parent,
    children: Children,
  } = merge(defs, names) as Fields<T, C, P>;

  type E = T & {
    [K in P]?: PropertyKey;
  };

  const source: E[] = [];

  visit<T, C, P>(
    tree,
    (item, _, parent) => {
      const rest = omit(
        {
          ...item,
          [Parent]: parent?.[Id],
        },
        [Children],
      );
      source.push(rest as E);
    },
    params,
  );

  return source;
}
