import { mapKeys, toUpperCase } from 'remeda';

import type { UpperCasedProperties } from './types';

/**
 * 将对象自身可枚举键转换为大写。
 *
 * 仅转换第一层键，不会递归处理嵌套对象。值会按原引用保留。
 *
 * @param data 待转换键名的对象。
 * @returns 键名转换为大写后的新对象。
 * @example
 * ```ts
 * const data = {
 *   userName: 'John',
 *   userAge: 30,
 * };
 * const result = toUpperCaseKeys(data);
 * // { USER_NAME: 'John', USER_AGE: 30 }
 * ```
 */
export const toUpperCaseKeys = <T extends object>(data: T) =>
  mapKeys(data, (key) => toUpperCase(key)) as UpperCasedProperties<T>;
