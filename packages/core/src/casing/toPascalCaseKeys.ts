import { mapKeys } from 'remeda';
import type { PascalCasedProperties } from 'type-fest';

import { toPascalCase } from './toPascalCase.js';

/**
 * 将对象自身可枚举键转换为 PascalCase。
 *
 * 仅转换第一层键，不会递归处理嵌套对象。值会按原引用保留。
 *
 * @param data 待转换键名的对象。
 * @returns 键名转换为 PascalCase 后的新对象。
 * @example
 * ```ts
 * const data = {
 *   user_name: 'John',
 *   user_age: 30,
 * };
 * const result = toPascalCaseKeys(data);
 * // { UserName: 'John', UserAge: 30 }
 * ```
 */
export const toPascalCaseKeys = <T extends object>(data: T) => {
  return mapKeys(data, (key) => toPascalCase(key)) as PascalCasedProperties<T>;
};
