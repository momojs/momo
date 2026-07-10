import { describe, expect, test } from 'bun:test';

import { toUpperCaseKeys } from './toUpperCaseKeys';

describe('toUpperCaseKeys', () => {
  test('converts top-level keys to upper case', () => {
    expect(toUpperCaseKeys({ userName: 'Momo', user_age: 1 })).toEqual({
      USERNAME: 'Momo',
      USER_AGE: 1,
    });
  });
});
