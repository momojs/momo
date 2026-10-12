import {
  differenceInYears,
  formatDate,
  isAfter,
  isValid,
  parse,
} from 'date-fns';

import { mod11_2 } from '../iso/mod11-2.js';

const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

/** 18 位公民身份号码中编码的信息；region 保留原始六位地址码。 */
export interface ChinaIdCardInfo {
  region: string;
  /** 出生日期，格式为 yyyy-MM-dd。 */
  date: string;
  /** 相对于 referenceDate 的周岁。 */
  age: number;
  /** 顺序码奇偶性表示的性别码。 */
  gender: 'M' | 'F';
}

function readChinaIdCard(code: unknown, referenceDate: Date) {
  if (typeof code !== 'string' || !isValid(referenceDate)) return undefined;
  const match = /^([1-9]\d{5})(\d{8})(\d{3})[\dXx]$/.exec(code);
  if (!match || !mod11_2(code, weights, codes)) return undefined;

  const [, region, birthday, sequence] = match;
  const date = parse(birthday, 'yyyyMMdd', referenceDate);
  if (!isValid(date) || isAfter(date, referenceDate)) return undefined;
  return { region, date, sequence };
}

/**
 * 解析通过格式、出生日期和校验位检查的 18 位公民身份号码。
 * 支持末位 x/X；非法号码、未来生日或无效参考日期抛出 RangeError。
 * referenceDate 默认当前时间，年龄按运行环境的本地日历计算。
 * 不支持旧 15 位号码，不核验地址码是否真实分配或号码是否存在。
 * @example fromChinaIdCard('11010519491231002X', new Date(2026, 0, 1));
 */
export const fromChinaIdCard = (
  code: string,
  referenceDate: Date = new Date(),
): ChinaIdCardInfo => {
  const info = readChinaIdCard(code, referenceDate);
  if (!info) throw new RangeError('Invalid China ID card or reference date');
  const { region, date, sequence } = info;
  return {
    region,
    date: formatDate(date, 'yyyy-MM-dd'),
    age: differenceInYears(referenceDate, date),
    gender: Number(sequence) % 2 === 0 ? 'F' : 'M',
  };
};

/**
 * 检查 18 位公民身份号码的格式、出生日期及校验位，非法输入返回 false。
 * 支持 x/X；referenceDate 默认当前时间，用于拒绝未来出生日期。
 * 不支持旧 15 位号码，不核验行政区划、实际发证或身份真实性。
 * @example isValidChinaIdCard('11010519491231002x'); // true
 */
export const isValidChinaIdCard = (
  code: unknown,
  referenceDate: Date = new Date(),
): code is string => readChinaIdCard(code, referenceDate) !== undefined;
