import { describe, expect, test } from 'bun:test';

import { toKebabCaseKeys } from './toKebabCaseKeys';

describe('toKebabCaseKeys', () => {
  test('converts top-level keys to kebab-case', () => {
    expect(toKebabCaseKeys({ userName: 'Momo', UserAge: 1 })).toEqual({
      'user-name': 'Momo',
      'user-age': 1,
    });
  });
});
