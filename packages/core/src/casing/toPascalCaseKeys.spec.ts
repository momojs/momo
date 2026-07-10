import { describe, expect, test } from 'bun:test';

import { toPascalCaseKeys } from './toPascalCaseKeys';

describe('toPascalCaseKeys', () => {
  test('converts top-level keys to PascalCase', () => {
    expect(toPascalCaseKeys({ user_name: 'Momo', user_age: 1 })).toEqual({
      UserName: 'Momo',
      UserAge: 1,
    });
  });
});
