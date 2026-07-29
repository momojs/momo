import type { PlainObject } from '../types.js';

/**
 * 从对象类型中提取可以作为节点 id 的字段名。
 */
export type IDKeys<T> = {
  [K in keyof T]: T[K] extends PropertyKey ? K : never;
}[keyof T];

/**
 * 从对象类型中提取可以作为父节点 id 的字段名。
 */
export type ParentKeys<T> = {
  [K in keyof T]: Extract<T[K], PropertyKey> extends never ? never : K;
}[keyof T];

/**
 * 树工具使用的字段名配置。
 */
export type Fields<T extends PlainObject, C, P = ParentKeys<T>> = {
  id: IDKeys<T>;
  children: C;
  parent: P;
};

/**
 * 可选字段名映射，用于适配不同数据结构中的 id、parent 和 children 字段。
 */
export type Names<T extends PlainObject, C, P = ParentKeys<T>> = Partial<
  Fields<T, C, P>
>;

/**
 * 带 children 字段的树节点类型。
 */
export type TreeNode<T, C extends string = 'children'> = T &
  Record<C, TreeNode<T, C>[]>;
