import { mapKeys, toCamelCase } from 'remeda';
import type { CamelCasedProperties } from 'type-fest';

/**
 * 将对象自身可枚举键转换为小驼峰命名。
 *
 * 仅转换第一层键，不会递归处理嵌套对象。值会按原引用保留。
 *
 * @param data 待转换键名的对象。
 * @returns 键名转换为小驼峰后的新对象。
 * @example
 * ```ts
 * const data = {
 *   user_name: 'John',
 *   user_age: 30,
 * };
 * const result = toCamelCaseKeys(data);
 * // { userName: 'John', userAge: 30 }
 * ```
 */
export const toCamelCaseKeys = <T extends object>(data: T) => {
  return mapKeys(data, (key) => toCamelCase(key)) as CamelCasedProperties<T>;
};
