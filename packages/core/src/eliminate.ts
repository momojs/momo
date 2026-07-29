import { cardinality } from './cardinality.js';

/**
 * 当输入值与指定哨兵值相同时，将其消除为替代值。
 * 常用于将 `cond && value` 的短路结果规范为可选值，替代 `cond ? value : undefined`。
 * 使用 `Object.is` 判断 `source` 与 `sentinel` 是否相同，因此能够正确区分
 * `0` 和 `-0`，并认为 `NaN` 与 `NaN` 相同。
 *
 * @param source 待消除的输入值。
 * @param sentinel 需要被替换的哨兵值，默认为 `false`。
 * @param otherwise 命中哨兵值时返回的替代值，默认为 `undefined`。
 * @returns 如果 `source` 与 `sentinel` 相同则返回 `otherwise`，否则返回 `source`。
 *
 * @example
 * ```ts
 * const endDate = new Date();
 * const startDate = new Date() as Date | null;
 * eliminate(endDate && startDate && differenceInCalendarYears(endDate, startDate)); // number | undefined
 * ```
 */
export function eliminate<const T>(
  source: T,
): T extends false ? Exclude<T, false> | undefined : T;
export function eliminate<const T, const P, D = undefined>(
  source: T,
  sentinel: P,
  otherwise?: D,
): T extends P ? Exclude<T, P> | D : T;
export function eliminate(
  source: unknown,
  ...args: [sentinel?: unknown, otherwise?: unknown]
) {
  const [sentinel, otherwise] = args;
  const current = cardinality(args) > 0 ? sentinel : false;
  return Object.is(source, current) ? otherwise : source;
}
