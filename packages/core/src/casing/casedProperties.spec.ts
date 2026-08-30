import { describe, expect, expectTypeOf, test } from 'bun:test';

import type {
  CamelCasedProperties,
  KebabCasedProperties,
  PascalCasedProperties,
  SnakeCasedProperties,
} from 'type-fest';

import { toCamelCasedProperties } from './toCamelCasedProperties';
import { toKebabCasedProperties } from './toKebabCasedProperties';
import { toLowerCasedProperties } from './toLowerCasedProperties';
import { toPascalCasedProperties } from './toPascalCasedProperties';
import { toSnakeCasedProperties } from './toSnakeCasedProperties';
import { toUpperCasedProperties } from './toUpperCasedProperties';
import type { LowerCasedProperties, UpperCasedProperties } from './types';

describe('shallow cased properties', () => {
  test('matches TypeFest camelCase and PascalCase defaults', () => {
    const input = { fooBAR: 1, user_name: 'Momo' } as const;
    const camel = toCamelCasedProperties(input);
    const pascal = toPascalCasedProperties(input);

    expect(camel).toEqual({ fooBar: 1, userName: 'Momo' });
    expect(pascal).toEqual({ FooBar: 1, UserName: 'Momo' });
    expectTypeOf(camel).toEqualTypeOf<CamelCasedProperties<typeof input>>();
    expectTypeOf(pascal).toEqualTypeOf<PascalCasedProperties<typeof input>>();
  });

  test('matches numeric splitting used by Remeda', () => {
    const input = { version1Value: 1, p2pNetwork: true } as const;
    const snake = toSnakeCasedProperties(input);
    const kebab = toKebabCasedProperties(input);

    expect(snake).toEqual({ p_2_p_network: true, version_1_value: 1 });
    expect(kebab).toEqual({ 'p-2-p-network': true, 'version-1-value': 1 });
    expectTypeOf(snake).toEqualTypeOf<
      SnakeCasedProperties<typeof input, { splitOnNumbers: true }>
    >();
    expectTypeOf(kebab).toEqualTypeOf<
      KebabCasedProperties<typeof input, { splitOnNumbers: true }>
    >();
  });

  test('converts keys to upper and lower case', () => {
    const upperInput = { userName: 'Momo', user_age: 1 } as const;
    const lowerInput = { AppID: 'wx', USER_NAME: 'Momo' } as const;
    const upper = toUpperCasedProperties(upperInput);
    const lower = toLowerCasedProperties(lowerInput);

    expect(upper).toEqual({ USERNAME: 'Momo', USER_AGE: 1 });
    expect(lower).toEqual({ appid: 'wx', user_name: 'Momo' });
    expectTypeOf(upper).toEqualTypeOf<
      UpperCasedProperties<typeof upperInput>
    >();
    expectTypeOf(lower).toEqualTypeOf<
      LowerCasedProperties<typeof lowerInput>
    >();
  });

  test('preserves symbol keys and nested values', () => {
    const symbol = Symbol('id');
    const nested = { first_name: 'Momo' };
    const result = toCamelCasedProperties({
      [symbol]: 1,
      user_profile: nested,
    });

    expect(result).toEqual({ [symbol]: 1, userProfile: nested });
    expect(result.userProfile).toBe(nested);
  });

  test('includes non-enumerable own keys represented by the input type', () => {
    const input = Object.defineProperty(
      {} as { hidden_key: number },
      'hidden_key',
      { value: 1 },
    );
    const result = toCamelCasedProperties(input);

    expect(result).toEqual({ hiddenKey: 1 });
    expectTypeOf(result).toEqualTypeOf<{ hiddenKey: number }>();
  });

  test('creates __proto__ as a safe own property', () => {
    const result = toLowerCasedProperties({ __PROTO__: { polluted: true } });

    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Reflect.get(result, '__proto__')).toEqual({ polluted: true });
  });

  test('keeps arrays and functions unchanged like TypeFest', () => {
    const array = [{ user_name: 'Momo' }];
    const fn = Object.assign(() => undefined, { user_name: 'Momo' });

    expect(toCamelCasedProperties(array)).toBe(array);
    expect(toCamelCasedProperties(fn)).toBe(fn);
    expectTypeOf(toCamelCasedProperties(array)).toEqualTypeOf<typeof array>();
    expectTypeOf(toCamelCasedProperties(fn)).toEqualTypeOf<typeof fn>();
  });
});
