import { isArray, isString } from 'remeda';

/**
 * 判断目标值是否是字符串数组。
 *
 * 空数组也会被视为合法字符串数组。
 *
 * @param data 待判断的值。
 * @returns 如果值是数组且每一项都是字符串，则返回 `true`。
 */
export function isStringArray(data: unknown): data is string[] {
  return isArray(data) && data.every(isString);
}
