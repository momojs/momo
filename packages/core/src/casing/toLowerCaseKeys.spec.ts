import { describe, expect, test } from 'bun:test';

import { toLowerCaseKeys } from './toLowerCaseKeys';

describe('toLowerCaseKeys', () => {
  test('converts top-level keys to lower case', () => {
    expect(toLowerCaseKeys({ AppID: 'wx', USER_NAME: 'Momo' })).toEqual({
      appid: 'wx',
      user_name: 'Momo',
    });
  });
});
