import { describe, expect, test } from 'bun:test';

import { toSnakeCaseKeys } from './toSnakeCaseKeys';

describe('toSnakeCaseKeys', () => {
  test('converts top-level keys to snake_case', () => {
    expect(toSnakeCaseKeys({ userName: 'Momo', UserAge: 1 })).toEqual({
      user_name: 'Momo',
      user_age: 1,
    });
  });
});
