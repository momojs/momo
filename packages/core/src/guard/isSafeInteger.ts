import { isNumber } from 'remeda';

declare const safeIntegerBrand: unique symbol;

/** JavaScript 安全整数；通过无边界选项的 `isSafeInteger` 校验后获得。 */
export type SafeInteger = number & {
  readonly [safeIntegerBrand]: true;
};

/**
 * 判断目标值是否为指定闭区间内的安全整数，不进行类型转换。
 *
 * 自定义边界不扩大 JavaScript 的安全整数范围。反向区间、NaN 或
 * 非数字边界返回 false；边界本身可以是小数或无穷值。
 * 省略边界选项时收窄为 `SafeInteger`；传入选项时只返回 boolean，
 * 因为已有的安全整数也可能处于指定区间之外。
 * 对 unknown 值同时做类型和范围校验时，先无选项调用，再检查范围。
 *
 * @param data 待判断的值。
 * @param options 可选的包含式上下界，默认使用完整安全整数范围。
 * @returns 值为安全整数且处于闭区间内时返回 true。
 * @example
 * isSafeInteger(10, { min: 0, max: 10 }); // true
 * isSafeInteger(1.5); // false
 * isSafeInteger('10'); // false
 *
 * const value: unknown = 10;
 * if (isSafeInteger(value) && isSafeInteger(value, { min: 0 })) {
 *   value; // SafeInteger
 * }
 */
export function isSafeInteger(
  data: unknown,
  options: undefined,
): data is SafeInteger;
export function isSafeInteger(
  data: unknown,
  options: { min?: number; max?: number } | undefined,
): boolean;
export function isSafeInteger(data: unknown): data is SafeInteger;
export function isSafeInteger(
  data: unknown,
  {
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
  }: { min?: number; max?: number } = {},
): boolean {
  return (
    isNumber(data) &&
    Number.isSafeInteger(data) &&
    isNumber(min) &&
    isNumber(max) &&
    data >= min &&
    data <= max
  );
}
