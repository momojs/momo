import { isDefined, isNot } from 'remeda';

/**
 * 判断目标值是否为 `undefined`。
 *
 * @param data 待判断的值。
 * @returns 如果值是 `undefined`，则返回 `true`。
 */
export const isUndefined: (data: unknown) => data is undefined =
  isNot(isDefined);
