import { isString } from 'remeda';

declare const nonEmptyStringBrand: unique symbol;

/** 包含非空白字符的原始字符串；通过 `isNonEmptyString` 校验后获得。 */
export type NonEmptyString = string & {
  readonly [nonEmptyStringBrand]: true;
};

/**
 * 判断目标值是否为包含非空白字符的原始字符串。
 *
 * 使用 trim 后的长度进行判断，不转换类型，也不修改字符串原文。
 *
 * @param data 待判断的值。
 * @returns 值为原始字符串且 trim 后长度大于 0 时返回 true，并收窄为
 * `NonEmptyString`；false 分支仍保留可能为空或纯空白的字符串。
 * @example
 * isNonEmptyString('momo'); // true
 * isNonEmptyString(''); // false
 * isNonEmptyString(' '); // false
 * isNonEmptyString(' momo '); // true
 */
export function isNonEmptyString(data: unknown): data is NonEmptyString {
  return isString(data) && data.trim().length > 0;
}
