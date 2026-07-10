import { mapKeys, toSnakeCase } from 'remeda';
import type { SnakeCasedProperties } from 'type-fest';

/**
 * 将对象自身可枚举键转换为 snake_case。
 *
 * 仅转换第一层键，不会递归处理嵌套对象。值会按原引用保留。
 *
 * @param data 待转换键名的对象。
 * @returns 键名转换为 snake_case 后的新对象。
 * @example
 * ```ts
 * const data = {
 *   userName: 'John',
 *   userAge: 30,
 * };
 * const result = toSnakeCaseKeys(data);
 * // { user_name: 'John', user_age: 30 }
 * ```
 */
export const toSnakeCaseKeys = <T extends object>(data: T) => {
  return mapKeys(data, (key) => toSnakeCase(key)) as SnakeCasedProperties<
    T,
    { splitOnNumbers: true }
  >;
};
