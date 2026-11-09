import { isSafeInteger } from '@momots/core';
import { isString } from 'remeda';

import { unspace } from './unspace.js';

/**
 * 校验包含校验位的十进制字符串是否满足 Luhn（MOD 10）。
 * 字符串会先删除 ASCII 空格（U+0020）；至少两位，不删除其他空白或分隔符。
 * 数字输入必须是非负安全整数。仅检查校验和，不判断发卡机构、账号长度或账号是否存在。
 * @example luhn('4111 1111 1111 1111'); // true
 */
export const luhn = (value: unknown): boolean => {
  const digits = isString(value)
    ? unspace(value)
    : isSafeInteger(value, { min: 0 })
      ? String(value)
      : undefined;
  if (digits !== undefined && digits.length >= 2 && !/\D/.test(digits)) {
    const sum = Array.from(digits).reduceRight((total, digit, index) => {
      const number = Number(digit);
      if ((digits.length - index) % 2 === 1) {
        return total + number;
      } else {
        // 两位数的各位和等于减 9：2 × 9 = 18 → 1 + 8 = 9。
        const doubled = number * 2;
        return total + (doubled > 9 ? doubled - 9 : doubled);
      }
    }, 0);
    return sum % 10 === 0;
  }
  return false;
};
