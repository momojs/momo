/**
 * 校验 ISO 7064 MOD 11-2 校验位，输入为十进制本体码加末位校验字符。
 * 校验字符为 0–9 或 X（大小写不敏感），不自动删除空格或分隔符。
 * 用于 18 位公民身份号码、ORCID、ISNI 等编码；仅检查校验和，不判断号码长度。
 * @example mod11_2('0000000218250097'); // true
 */
// biome-ignore lint/style/useNamingConvention: Keep the ISO 7064 algorithm name MOD 11-2.
export function mod11_2(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d+[\dXx]$/.test(value)) return false;

  // 纯系统递推：P = (P + d) × 2 mod 11，等价于从右往左按 2^i mod 11 加权。
  const remainder = Array.from(value.slice(0, -1)).reduce(
    (sum, digit) => ((sum + Number(digit)) * 2) % 11,
    0,
  );
  const check = (12 - remainder) % 11;
  return (check === 10 ? 'X' : String(check)) === value.slice(-1).toUpperCase();
}
