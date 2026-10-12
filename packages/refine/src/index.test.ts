import { expect, test } from 'bun:test';

import * as refine from './index';
import { mod11_2 } from './iso/mod11-2';
import { card } from './luhn/card';

test('exposes the public entry without wrapping the underlying validators', () => {
  expect(Object.keys(refine).sort()).toEqual([
    'ISO',
    'fromChinaIdCard',
    'isValidChinaIdCard',
    'luhn',
  ]);
  expect(refine.luhn.card).toBe(card);
  expect(refine.ISO.mod11_2).toBe(mod11_2);
  expect(refine.isValidChinaIdCard('11010519491231002X')).toBe(true);
});
