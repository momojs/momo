import { describe, expect, test } from 'bun:test';

import { luhn } from './luhn';

describe('Luhn', () => {
  test.each([
    '79927398713',
    '4111111111111111',
    '378282246310005',
    '059',
    '18',
    '00',
    '4111 1111 1111 1111',
    '18 ',
    ' 18',
    '1 8',
  ])('accepts a valid checksum: %s', (value) => expect(luhn(value)).toBe(true));

  test.each(
    [
      '79927398714',
      '4111111111111112',
      '',
      '0',
      '18\n',
      '18\r\n',
      '18\t',
      '18\u00A0',
      '18\u3000',
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
    expect(luhn(value)).toBe(false);
  });

  test('supports safe integer inputs', () => {
    expect(luhn(79927398713)).toBe(true);
  });
});
