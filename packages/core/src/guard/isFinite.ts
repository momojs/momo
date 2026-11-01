import { isNumber } from 'remeda';

declare const finiteNumberBrand: unique symbol;

/** 有限数值原始值；通过 `isFinite` 校验后获得。 */
export type FiniteNumber = number & {
  readonly [finiteNumberBrand]: true;
};

/**
 * 判断目标值是否为有限数值原始值，不进行类型转换。
 *
 * 接受整数、小数、正零和负零；拒绝 NaN、正负无穷与非数值类型。
 * 不要求数值为安全整数。
 *
 * @param data 待判断的值。
 * @returns 值为有限数时返回 true，并收窄为 `FiniteNumber`；false
 * 分支仍保留可能为 NaN 或无穷值的 number。
 * @example
 * isFinite(1.5); // true
 * isFinite(-0); // true
 * isFinite(Infinity); // false
 * isFinite('1.5'); // false
 */
export function isFinite(data: unknown): data is FiniteNumber {
  return isNumber(data) && Number.isFinite(data);
}
