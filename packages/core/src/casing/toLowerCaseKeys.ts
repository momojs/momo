import { mapKeys, toLowerCase } from 'remeda';

import type { LowerCasedProperties } from './types.js';

/**
 * 将对象自身可枚举键转换为小写。
 *
 * 仅转换第一层键，不会递归处理嵌套对象。值会按原引用保留。
 *
 * @param data 待转换键名的对象。
 * @returns 键名转换为小写后的新对象。
 * @example
 * ```ts
 * const data = {
 *   AppID: 'wx7f3f0032b6e6f0cc',
 *   USER_NAME: 'John',
 *   USER_AGE: 30,
 * };
 * const result = toLowerCaseKeys(data);
 * // { appid: 'wx7f3f0032b6e6f0cc', user_name: 'John', user_age: 30 }
 * ```
 */
export const toLowerCaseKeys = <T extends object>(data: T) =>
  mapKeys(data, (key) => toLowerCase(key)) as LowerCasedProperties<T>;
