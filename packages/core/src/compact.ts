import { isEmptyish, isNot } from 'remeda';

import type { NonFalseish } from './types';

/**
 * 从数组中移除所有 falseish 值。
 *
 * falseish 的语义来自 Remeda `isEmptyish` 再额外排除 `false`，包括 `null`、`undefined`、
 * 空字符串、空数组、空普通对象、空 Map/Set、Date、RegExp 等。该函数会返回一个新数组，
 * 不会修改输入数组。
 *
 * 与 lodash `compact` 的语义不同，请勿混用：
 *
 * | 值 | `compact` | lodash `compact` |
 * | --- | --- | --- |
 * | `0` | 保留 | 过滤 |
 * | `false` | 过滤 | 过滤 |
 * | `NaN` | 保留 | 过滤 |
 * | `''` | 过滤 | 过滤 |
 * | `[]` / `{}` | 过滤 | 保留 |
 *
 * @param source 要压缩的输入数组。
 * @returns 移除 falseish 值后的新数组。
 */
export function compact<const T extends ReadonlyArray<unknown>>(
  source: T,
): NonFalseish<T[number]>[];
export function compact<T>(source: ReadonlyArray<T>): NonFalseish<T>[];
export function compact(source: ReadonlyArray<unknown>): unknown[] {
  return source.filter((item) => isNot(isEmptyish)(item) && item !== false);
}
