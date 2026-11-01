import { expect, test } from 'bun:test';

import * as refine from './index';
import { mod11_2 } from './iso7064/mod11-2';
import { mod10 } from './luhn/mod10';

test('exposes the public entry without wrapping the underlying validators', () => {
  expect(Object.keys(refine).sort()).toEqual([
    'fromChinaIdCard',
    'isValidChinaIdCard',
    'iso7064',
    'luhn',
  ]);
  expect(refine.luhn.mod10).toBe(mod10);
  expect(refine.iso7064.mod11_2).toBe(mod11_2);
  expect(refine.isValidChinaIdCard('11010519491231002X')).toBe(true);
});
