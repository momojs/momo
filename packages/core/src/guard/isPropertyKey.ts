import { isNumber, isString, isSymbol } from 'remeda';

/**
 * 判断目标值是否是 JavaScript 属性键。
 *
 * 属性键只能是 `string`、`number` 或 `symbol`。`bigint` 不能作为对象属性键。
 *
 * @param data 待判断的值。
 * @returns 如果值可以作为属性键使用，则返回 `true`。
 */
export function isPropertyKey(data: unknown): data is PropertyKey {
  return isString(data) || isNumber(data) || isSymbol(data);
}
