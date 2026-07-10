/**
 * 基于 ISO 7064:1983.MOD 11-2 的通用校验算法
 * @param value 待校验的字符串
 * @param weights 权重因子数组
 * @param checkCodes 校验码映射表
 */
const N7064Y1983M112 = (
  value: string,
  weights: number[],
  checkCodes: string[],
): boolean => {
  const chars = value.toUpperCase().split("");
  const len = weights.length;

  // 基础长度校验
  if (chars.length !== len + 1) return false;

  // 计算加权总和
  const sum = weights.reduce((acc, weight, i) => {
    const digit = parseInt(chars[i], 10);
    return acc + (isNaN(digit) ? 0 : digit * weight);
  }, 0);

  // 取模并比对
  const remainder = sum % 11;
  return checkCodes[remainder] === chars[len];
};

export const ISO = {
  N7064Y1983M112,
};
