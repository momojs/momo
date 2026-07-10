import {
  differenceInYears,
  formatDate,
  isAfter,
  isValid,
  parse,
} from "date-fns";

import { isNonEmptyString } from "../guard";

export const parseIdCard = (idCard: string) => {
  const reg = /(\d{6})(\d{4})(\d{2})(\d{2})(\d{3})([0-9]|X)/;
  const match = idCard.match(reg) ?? null;
  const format = "yyyy-MM-dd";
  if (!match) {
    throw new Error(`Invalid id: ${idCard}`);
  }
  const [, region, year, month, day, seq] = match;
  const timestr = `${year}-${month}-${day}`;
  try {
    const date = parse(timestr, format, new Date());
    if (!isValid(date) || Number(month) > 12 || Number(day) > 31) {
      throw new Error(`Invalid date: ${timestr}`);
    }
    return {
      region,
      date: formatDate(date, format),
      age: differenceInYears(new Date(), date),
      gender: Number(seq) % 2 === 0 ? "F" : "M",
    };
  } catch (_) {
    throw new Error(`Invalid date: ${timestr}`);
  }
};

/**
 * TODO: 行政区划代码对比
 * By ISO 7064:1983.MOD 11-2
 */
export const isValidIdCard = (idCard?: string): idCard is string => {
  if (!isNonEmptyString(idCard)) return false;
  if (!/^\d{15}$|^\d{17}(\d|x|X)$/.test(idCard)) return false;
  const weight = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const sum = Array.from(idCard.slice(0, 17)).reduce(
    (acc, char, index) => acc + Number(char) * weight[index],
    0,
  );
  const checkCodeMap = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
  const res = checkCodeMap[sum % 11] === idCard.slice(-1).toUpperCase();
  if (res) {
    const { date } = parseIdCard(idCard);
    // 不得大于当前日期
    return isAfter(new Date(), date);
  }
  return false;
};
