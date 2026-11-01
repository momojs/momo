import { isString } from 'remeda';

import { isFinite } from './guard/isFinite.js';

const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u;

/**
 * 将有限数或完整的十进制数字字符串转换为 number。
 *
 * 字符串可含首尾空白、正负号、小数和科学计数法。拒绝空白输入、
 * 其他进制、分隔符、单位及不完整格式，不转换其他类型。
 * 结果保留 Number 的舍入、下溢与负零，不保证安全整数或十进制精度。
 *
 * @param value 待转换的未知值。
 * @returns 有限数原样返回；合法十进制字符串返回转换结果，其余返回 undefined。
 * @example
 * toFinite(' -12.50 '); // -12.5
 * toFinite('.5e2'); // 50
 * toFinite('0x10'); // undefined
 */
export function toFinite(value: unknown): number | undefined {
  if (isFinite(value)) {
    return value;
  } else if (isString(value)) {
    const text = value.trim();
    if (DECIMAL.test(text)) {
      const number = Number(text);
      if (isFinite(number)) return number;
    }
  }
  return undefined;
}
