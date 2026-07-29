import { isFunction } from 'remeda';

import type { Realizable } from './types.js';

/**
 * 将惰性值具体化。
 *
 * 如果传入值是函数，则使用后续参数调用该函数并返回结果；否则直接返回该值。
 * 注意：函数值会被视为 thunk/resolver，而不是普通值。
 *
 * @param realizable 普通值或返回普通值的函数。
 * @param args 当 `realizable` 是函数时传入的参数。
 * @returns 具体化后的结果。
 */
export const realize = <T, Args extends unknown[]>(
  realizable: Realizable<T, Args>,
  ...args: Args
): T => {
  return isFunction(realizable) ? realizable(...args) : realizable;
};
