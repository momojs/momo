/**
 * 校验包含校验位的十进制字符串是否满足 Luhn（MOD 10）。
 * 至少两位，不自动删除空格或分隔符；数字输入必须是非负安全整数。
 * 仅检查校验和，不判断发卡机构、账号长度或账号是否存在。
 * @example mod10('79927398713'); // true
 */
export const mod10 = (value: unknown): boolean => {
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
    if ((digits.length - index) % 2 === 1) return total + number;
    // 两位数的各位和等于减 9：2 × 9 = 18 → 1 + 8 = 9。
    const doubled = number * 2;
    return total + (doubled > 9 ? doubled - 9 : doubled);
  }, 0);

  return sum % 10 === 0;
};
