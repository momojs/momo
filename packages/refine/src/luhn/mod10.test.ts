import { describe, expect, test } from 'bun:test';

import { luhn } from './index';
import { mod10 } from './mod10';

describe('Luhn MOD 10', () => {
  test.each([
    '79927398713',
    '4111111111111111',
    '378282246310005',
    '059',
    '18',
    '00',
  ])('accepts a valid checksum: %s', (value) =>
    expect(mod10(value)).toBe(true));

  test.each(
    [
      '79927398714',
      '4111111111111112',
      '',
      '0',
      '18 ',
      ' 18',
      '18\n',
      '18\r\n',
      '4111-1111-1111-1111',
      '１８',
      'abc',
      '1.8',
      '-18',
      undefined,
      null,
      {},
      [],
      1.8,
      -18,
      Infinity,
      NaN,
      Number.MAX_SAFE_INTEGER + 1,
    ].map((value) => ({ value })),
  )('rejects an invalid input: %j', ({ value }) => {
    expect(mod10(value)).toBe(false);
  });

  test('supports safe integer inputs and preserves the namespace API', () => {
    expect(mod10(79927398713)).toBe(true);
    expect(luhn.mod10).toBe(mod10);
  });
});
