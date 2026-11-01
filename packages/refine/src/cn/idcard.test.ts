import { describe, expect, test } from 'bun:test';

import type { ChinaIdCard } from './idcard';
import { fromChinaIdCard, isValidChinaIdCard } from './idcard';

const referenceDate = new Date(2026, 0, 1);
const sample = '11010519491231002X';

// 从左到右的递推余数独立生成测试校验位，不复用被测函数的权重表。
function withChecksum(body: string) {
  const remainder = Array.from(body).reduce(
    (sum, digit) => ((sum + Number(digit)) * 2) % 11,
    0,
  );
  const check = (12 - remainder) % 11;
  return `${body}${check === 10 ? 'X' : check}`;
}

describe('China ID card', () => {
  test('parses the fields of the standard example', () => {
    expect(fromChinaIdCard(sample, referenceDate)).toEqual({
      region: '110105',
      birthDate: '1949-12-31',
      age: 76,
      gender: 'F',
    });
    expect(isValidChinaIdCard(sample, referenceDate)).toBe(true);
    expect(fromChinaIdCard(sample.toLowerCase(), referenceDate)).toEqual(
      fromChinaIdCard(sample, referenceDate),
    );
    expect(fromChinaIdCard('440524188001010014', referenceDate).gender).toBe(
      'M',
    );
  });

  test.each([
    undefined,
    null,
    {},
    11010519491231002,
    '',
    '110105491231002',
    '110105194912310020',
    ` ${sample}`,
    `${sample} `,
    `${sample}\n`,
    `prefix${sample}`,
    '11010519491231002Ｘ',
  ])('rejects invalid input without throwing: %j', (value) => {
    expect(isValidChinaIdCard(value, referenceDate)).toBe(false);
  });

  test.each([
    '20010229',
    '19000229',
    '20001301',
    '20010431',
    '20010001',
    '20010100',
    '00000101',
    '00010101',
    '17991231',
    '20260102',
  ])('rejects invalid or future birthdays even with a matching checksum: %s', (birthday) => {
    const code = withChecksum(`110105${birthday}001`);
    expect(isValidChinaIdCard(code, referenceDate)).toBe(false);
    expect(() => fromChinaIdCard(code, referenceDate)).toThrow(RangeError);
  });

  test('checks leap days and birthday age boundaries', () => {
    const leap = withChecksum('11010520000229001');
    expect(isValidChinaIdCard(leap, referenceDate)).toBe(true);
    const code = withChecksum('11010520000615001');
    expect(fromChinaIdCard(code, new Date(2026, 5, 14, 23, 59)).age).toBe(25);
    expect(fromChinaIdCard(code, new Date(2026, 5, 15)).age).toBe(26);
    const newborn = withChecksum('11010520260101002');
    expect(fromChinaIdCard(newborn, referenceDate).age).toBe(0);
    const earliest = withChecksum('11010518000101001');
    expect(fromChinaIdCard(earliest, referenceDate).birthDate).toBe(
      '1800-01-01',
    );
  });

  test('narrows only the true branch', () => {
    const input: string = sample;
    if (isValidChinaIdCard(input, referenceDate)) {
      const code: ChinaIdCard = input;
      expect(code.length).toBe(18);
    } else {
      // false 分支保留 string；收窄成 never 时这里无法通过类型检查。
      expect(input.length).toBeNumber();
    }
  });

  test('rejects invalid reference dates and invalid parsing input', () => {
    expect(isValidChinaIdCard(sample, new Date(NaN))).toBe(false);
    expect(() => fromChinaIdCard(sample, new Date(NaN))).toThrow(RangeError);
    expect(() => fromChinaIdCard('invalid', referenceDate)).toThrow(RangeError);
    expect(() => fromChinaIdCard('110105194912310020', referenceDate)).toThrow(
      RangeError,
    );
  });

  test('does not mutate the reference date', () => {
    const date = new Date(2026, 0, 1, 12, 30);
    const time = date.getTime();
    fromChinaIdCard(sample, date);
    expect(date.getTime()).toBe(time);
  });
});
