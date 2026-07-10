/**
 * 计算数字序列中每一位数字的和。
 *
 * 输入会先被转换成字符串，再逐字符转成数字累加。
 * 如果字符串中包含非数字字符，当前实现会得到 `NaN`。
 *
 * @param digits 待求和的数字或数字字符串。
 * @returns 每一位数字相加后的结果。
 */
export const sumdig = (digits: string | number): number =>
  Array.from(digits.toString()).reduce(
    (sum, number) => sum + Number(number),
    0,
  );
