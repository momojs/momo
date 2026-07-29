import { isArray } from 'remeda';

import type { MaybeArray } from '../types.js';

/**
 * 将单个值或数组归一化为数组形态。
 *
 * 如果传入值已经是数组，则直接返回原数组；否则使用 `Array.of` 将其包成单元素数组。
 * 该函数不会展开字符串、Iterable 或类数组对象。
 *
 * @param value 单个值、可变数组或只读数组。
 * @returns 归一化后的只读数组视图。
 */
export const asArray = <T>(value: MaybeArray<T>): readonly T[] => {
  return isArray(value) ? value : Array.of(value);
};
