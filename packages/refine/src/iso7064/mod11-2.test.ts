import { describe, expect, test } from 'bun:test';

import { iso7064 } from './index';
import { mod11_2 } from './mod11-2';

// 用 GB 11643 的权重表与余数映射独立计算，交叉验证递推实现。
const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
function idCardCheck(body: string) {
  const sum = Array.from(body).reduce(
    (total, digit, index) => total + Number(digit) * weights[index],
    0,
  );
  return codes[sum % 11];
}

describe('ISO 7064 MOD 11-2', () => {
  test.each([
    '11010519491231002X',
    '11010519491231002x',
    '440524188001010014',
    '0000000218250097',
    '000000021694233X',
    '01',
    '1X',
  ])('accepts known checksum vectors: %s', (value) =>
    expect(mod11_2(value)).toBe(true));

  test.each([
    '110105194912310020',
    '0000000218250098',
    'A1010519491231002X',
    '1101051949123100X2',
    '11010519491231002Ｘ',
    '',
    'X',
    '1',
    ' 1X',
    '1X ',
    '1X\n',
    undefined,
    null,
    18,
  ])('rejects invalid input: %j', (value) =>
    expect(mod11_2(value)).toBe(false));

  test('matches the GB 11643 weight table for every check digit', () => {
    for (let index = 0; index < 2000; index += 1) {
      const body = String(index * 7919 + 110105194912310).padStart(17, '0');
      const check = idCardCheck(body);
      expect(mod11_2(`${body}${check}`)).toBe(true);
      const wrong = check === '0' ? '1' : '0';
      expect(mod11_2(`${body}${wrong}`)).toBe(false);
    }
  });

  test('exposes the namespace member', () => {
    expect(iso7064.mod11_2).toBe(mod11_2);
  });
});
