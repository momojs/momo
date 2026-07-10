import { mapKeys, toKebabCase } from 'remeda';
import type { KebabCasedProperties } from 'type-fest';

/**
 * 将对象自身可枚举键转换为 kebab-case。
 *
 * 仅转换第一层键，不会递归处理嵌套对象。值会按原引用保留。
 *
 * @param data 待转换键名的对象。
 * @returns 键名转换为 kebab-case 后的新对象。
 * @example
 * ```ts
 * const data = {
 *   USER_NAME: 'John',
 *   USER_AGE: 30,
 * };
 * const result = toKebabCaseKeys(data);
 * // { user-name: 'John', user-age: 30 }
 * ```
 */
export const toKebabCaseKeys = <T extends object>(data: T) => {
  return mapKeys(data, (key) => toKebabCase(key)) as KebabCasedProperties<
    T,
    { splitOnNumbers: true }
  >;
};
