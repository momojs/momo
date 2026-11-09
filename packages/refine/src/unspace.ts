/**
 * 删除字符串中的 ASCII 空格（U+0020）。
 *
 * 不删除制表符、换行、不间断空格、全角空格或连字符。
 *
 * @param value 原始字符串。
 * @returns 删除空格后的字符串。
 * @example unspace('4111 1111'); // '41111111'
 */
export const unspace = (value: string): string => value.replaceAll(' ', '');
