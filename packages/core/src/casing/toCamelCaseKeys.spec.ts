import { describe, expect, test } from 'bun:test';

import { toCamelCaseKeys } from './toCamelCaseKeys';

describe('toCamelCaseKeys', () => {
  test('converts top-level keys to camelCase', () => {
    expect(toCamelCaseKeys({ user_name: 'Momo', 'user-age': 1 })).toEqual({
      userName: 'Momo',
      userAge: 1,
    });
  });

  test('does not recursively convert nested objects', () => {
    expect(toCamelCaseKeys({ user_profile: { first_name: 'Momo' } })).toEqual({
      userProfile: { first_name: 'Momo' },
    });
  });
});
