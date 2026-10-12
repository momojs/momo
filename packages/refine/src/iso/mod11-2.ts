/**
 * 按给定权重和余数映射校验十进制本体码的 MOD 11-2 校验位。
 * weights 与本体码等长，codes 为余数 0–10 对应的 11 个单字符校验码。
 * 非法输入或参数返回 false；校验码按大小写不敏感比较。
 * @example mod11_2('1X', [2], ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']);
 */
// biome-ignore lint/style/useNamingConvention: Preserve the existing ISO.mod11_2 algorithm name.
export function mod11_2(
  value: unknown,
  weights: readonly number[],
  codes: readonly string[],
): boolean {
  if (
    typeof value !== 'string' ||
    !/^\d+[\dA-Za-z]$/.test(value) ||
    weights.length !== value.length - 1 ||
    !weights.every((weight) => Number.isSafeInteger(weight) && weight >= 0) ||
    codes.length !== 11 ||
    !codes.every((code) => code.length === 1 && /^[\dA-Za-z]$/.test(code))
  ) {
    return false;
  }

  // 先对权重和累加值取模，避免长输入或大权重溢出安全整数范围。
  const remainder = weights.reduce(
    (sum, weight, index) => (sum + Number(value[index]) * (weight % 11)) % 11,
    0,
  );
  return codes[remainder].toUpperCase() === value.slice(-1).toUpperCase();
}
