import { isNullish, merge } from 'remeda';

import type { Nil, PlainObject } from '../types.js';
import { defs } from './defs.js';
import type { Fields, Names, TreeNode } from './types.js';

/**
 * 扁平列表还原为树时遇到孤儿节点的处理策略。
 *
 * - `root`: 将孤儿节点提升为根节点。
 * - `throw`: 抛出缺失父节点错误。
 * - `discard`: 丢弃孤儿节点。
 */
type OrphanStrategy = 'root' | 'throw' | 'discard';

/**
 * 将带 id/parent 关系的扁平列表还原为树。
 *
 * 默认字段名为 `id`、`parent` 和 `children`，可通过 `params.names` 覆盖。
 * parent 为空值的节点会作为根节点。
 *
 * 该函数假设输入数据不存在循环引用；若需要严格数据完整性，可配合
 * `orphan: 'throw'` 处理缺失父节点。
 *
 * @param data 待还原的扁平节点列表。
 * @param params.names 自定义 id、parent、children 字段名。
 * @param params.orphan 孤儿节点处理策略，默认提升为根节点。
 * @returns 还原后的树节点列表。
 */
export function unflat<
  T extends PlainObject,
  const C extends string = 'children',
>(
  data: T[],
  params: {
    names?: Names<T, C>;
    orphan?: OrphanStrategy;
  } = {},
) {
  type CNode = TreeNode<T, C>;

  const { names, orphan = 'root' } = params;

  const {
    id: Id,
    parent: Parent,
    children: Children,
  } = merge(defs, names) as Fields<T, C>;

  const tree: CNode[] = [];

  const map = new Map<PropertyKey, CNode>();

  const temp = new Map<PropertyKey, CNode[]>();

  for (const item of data) {
    if (Id in item) {
      const id = item[Id] as PropertyKey;
      const pid = item[Parent] as PropertyKey | Nil;
      const children = temp.get(id) ?? [];
      temp.delete(id);
      const cur = { ...item, [Children]: children };

      map.set(id, cur);

      if (isNullish(pid)) {
        tree.push(cur);
        continue;
      }

      const parent = map.get(pid);

      if (isNullish(parent)) {
        const temporary = temp.get(pid);

        if (isNullish(temporary)) {
          temp.set(pid, [cur]);
          continue;
        }

        temporary.push(cur);
        continue;
      }

      parent?.[Children].push(cur);
    }
  }

  if (temp.size > 0) {
    if (orphan === 'throw') {
      const ids = Array.from(temp.keys()).join(', ');
      throw new Error(`unflat: missing parent node(s): ${ids}`);
    }

    if (orphan === 'root') {
      tree.push(...Array.from(temp.values()).flat());
    }
  }

  temp.clear();
  map.clear();

  return tree;
}
