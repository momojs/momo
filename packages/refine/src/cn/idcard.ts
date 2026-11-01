import {
  differenceInYears,
  formatDate,
  isAfter,
  isValid,
  parse,
} from 'date-fns';

import { mod11_2 } from '../iso7064/mod11-2.js';

/** 最早接受的出生年份，用于拒绝 0001 年等校验位碰巧正确的无意义日期。 */
const minBirthYear = 1800;

declare const chinaIdCardBrand: unique symbol;

/** 通过 isValidChinaIdCard 检查的 18 位公民身份号码。 */
export type ChinaIdCard = string & { readonly [chinaIdCardBrand]: true };

/** 18 位公民身份号码中编码的信息；region 保留原始六位地址码。 */
export interface ChinaIdCardInfo {
  region: string;
  /** 出生日期，格式为 yyyy-MM-dd。 */
  birthDate: string;
  /** 相对于 referenceDate 的周岁。 */
  age: number;
  /** 顺序码奇偶性表示的性别码。 */
  gender: 'M' | 'F';
}

function readChinaIdCard(code: unknown, referenceDate: Date) {
  if (typeof code !== 'string' || !isValid(referenceDate)) return undefined;
  const match = /^([1-9]\d{5})(\d{8})(\d{3})[\dXx]$/.exec(code);
  if (!match || !mod11_2(code)) return undefined;

  const [, region, birthday, sequence] = match;
  const date = parse(birthday, 'yyyyMMdd', referenceDate);
  if (
    !isValid(date) ||
    date.getFullYear() < minBirthYear ||
    isAfter(date, referenceDate)
  ) {
    return undefined;
  }
  return { region, date, sequence };
}

/**
 * 解析通过格式、出生日期和校验位检查的 18 位公民身份号码。
 * 支持末位 x/X；非法号码、早于 1800 年或晚于参考日期的生日、无效参考日期抛出 RangeError。
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
    birthDate: formatDate(date, 'yyyy-MM-dd'),
    age: differenceInYears(referenceDate, date),
    gender: Number(sequence) % 2 === 0 ? 'F' : 'M',
  };
};

/**
 * 检查 18 位公民身份号码的格式、出生日期及校验位，非法输入返回 false。
 * 支持 x/X；出生年份不早于 1800，referenceDate 默认当前时间，用于拒绝未来出生日期。
 * true 分支收窄为 ChinaIdCard；false 分支保留原类型。
 * 不支持旧 15 位号码，不核验行政区划、实际发证或身份真实性。
 * @example isValidChinaIdCard('11010519491231002x'); // true
 */
export const isValidChinaIdCard = (
  code: unknown,
  referenceDate: Date = new Date(),
): code is ChinaIdCard => readChinaIdCard(code, referenceDate) !== undefined;
