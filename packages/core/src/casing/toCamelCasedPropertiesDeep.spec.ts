import { describe, expect, expectTypeOf, test } from 'bun:test';

import type { CamelCasedPropertiesDeep } from 'type-fest';

import { toCamelCasedPropertiesDeep } from './toCamelCasedPropertiesDeep';

describe('toCamelCasedPropertiesDeep', () => {
  test('recursively converts objects, arrays, and sets', () => {
    const input = {
      fooBAR: 1,
      user_list: [{ user_name: 'Momo' }],
      user_set: new Set([{ user_id: 1 }]),
    };
    const result = toCamelCasedPropertiesDeep(input);

    expect(result).toEqual({
      fooBar: 1,
      userList: [{ userName: 'Momo' }],
      userSet: new Set([{ userId: 1 }]),
    });
    expectTypeOf(result).toEqualTypeOf<
      CamelCasedPropertiesDeep<typeof input>
    >();
  });

  test('preserves cycles and symbol keys', () => {
    const symbol = Symbol('metadata');
    const input: {
      child_value: { parent_ref?: unknown };
      [symbol]: { symbol_key: boolean };
    } = {
      child_value: {},
      [symbol]: { symbol_key: true },
    };
    input.child_value.parent_ref = input;

    const result = toCamelCasedPropertiesDeep(input);

    expect(result.childValue.parentRef).toBe(result);
    expect(result[symbol]).toEqual({ symbolKey: true });
  });

  test('preserves sparse arrays', () => {
    const input = new Array<{ user_name: string }>(2);
    input[1] = { user_name: 'Momo' };

    const result = toCamelCasedPropertiesDeep(input);

    expect(0 in result).toBe(false);
    expect(result[1]).toEqual({ userName: 'Momo' });
  });

  test('keeps TypeFest non-recursive values unchanged', () => {
    const date = new Date(0);
    const regexp = /momo/u;
    const promise = Promise.resolve({ user_name: 'Momo' });
    const fn = () => ({ user_name: 'Momo' });

    const result = toCamelCasedPropertiesDeep({ date, fn, promise, regexp });

    expect(result.date).toBe(date);
    expect(result.regexp).toBe(regexp);
    expect(result.promise).toBe(promise);
    expect(result.fn).toBe(fn);
  });
});
