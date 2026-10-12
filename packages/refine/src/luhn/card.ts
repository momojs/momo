import { sumdig } from '@momots/core/sumdig';

/**
 * 校验包含校验位的十进制字符串是否满足 Luhn（MOD 10）。
 * 至少两位，不自动删除空格或分隔符；数字输入必须是非负安全整数。
 * 仅检查校验和，不判断发卡机构、账号长度或账号是否存在。
 * @example card('79927398713'); // true
 */
export const card = (value: unknown): boolean => {
  if (
    typeof value !== 'string' &&
    (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
  ) {
    return false;
  }
  const digits = String(value);
  if (digits.length < 2 || /\D/.test(digits)) return false;

  const sum = Array.from(digits).reduceRight((total, digit, index) => {
    const number = Number(digit);
    const position = digits.length - index;
    return total + (position % 2 === 0 ? sumdig(number * 2) : number);
  }, 0);

  return sum % 10 === 0;
};
