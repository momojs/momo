import { describe, expect, expectTypeOf, mock, test } from 'bun:test';

import { isString } from 'remeda';

import { hasOwn as exportedHasOwn } from '../index';
import { hasOwn } from './hasOwn';

describe('hasOwn', () => {
  test('is exported from the root entry point', () => {
    expect(exportedHasOwn).toBe(hasOwn);
  });

  test('detects own properties including undefined values', () => {
    expect(hasOwn({ name: 'momo' }, 'name')).toBe(true);
    expect(hasOwn({ name: undefined }, 'name')).toBe(true);
    expect(hasOwn({}, 'name')).toBe(false);
    expect(hasOwn({}, 'toString')).toBe(false);
    expect(hasOwn(Object.create({ name: 'momo' }), 'name')).toBe(false);
  });

  test('supports null prototypes, shadowed methods and non-enumerable properties', () => {
    const data = Object.create(null);
    Object.defineProperty(data, 'name', { value: 'momo' });

    expect(hasOwn(data, 'name', isString)).toBe(true);
    expect(hasOwn(data, 'missing')).toBe(false);
    expect(hasOwn({ hasOwnProperty: false }, 'hasOwnProperty')).toBe(true);
  });

  test('adds an unknown property while preserving existing types', () => {
    const data: { id: number; name?: unknown } = { id: 1, name: 'momo' };

    if (!hasOwn(data, 'name')) throw new Error('Expected own property');

    expectTypeOf(data.id).toEqualTypeOf<number>();
    expectTypeOf(data.name).toEqualTypeOf<unknown>();
    expectTypeOf(data).toMatchTypeOf<{ name: unknown }>();
    expect(data.name).toBe('momo');
  });

  test('validates and narrows the property value with a guard', () => {
    const data: { id: number; name?: string | number } = {
      id: 1,
      name: 'momo',
    };

    if (!hasOwn(data, 'name', isString)) throw new Error('Expected string');

    expectTypeOf(data.id).toEqualTypeOf<number>();
    expectTypeOf(data.name).toEqualTypeOf<string>();
    expect(data.name).toBe('momo');
    expect(hasOwn({ name: 1 }, 'name', isString)).toBe(false);
    expect(hasOwn({ name: undefined }, 'name', isString)).toBe(false);
    expect(
      hasOwn(
        { name: undefined },
        'name',
        (value): value is undefined => value === undefined,
      ),
    ).toBe(true);
  });

  test('supports numeric and symbol keys with type narrowing', () => {
    const key = Symbol('name');
    const data: object = { 0: 'first', [key]: 'momo' };

    if (!hasOwn(data, 0)) throw new Error('Expected numeric property');
    if (!hasOwn(data, key, isString))
      throw new Error('Expected symbol property');

    expectTypeOf(data[0]).toEqualTypeOf<unknown>();
    expectTypeOf(data[key]).toEqualTypeOf<string>();
    expect(data[0]).toBe('first');
    expect(data[key]).toBe('momo');
  });

  test('does not add index signatures for broad keys', () => {
    const symbol = Symbol('name');
    const data: { id: number } = {
      id: 1,
      ...{ name: 'momo', 0: 'first', [symbol]: 'symbol' },
    };
    const keys: [string, number, symbol] = ['name', 0, symbol];
    const [stringKey, numberKey, symbolKey] = keys;

    if (hasOwn(data, stringKey, isString)) {
      expectTypeOf(data).toEqualTypeOf<{ id: number }>();
      // @ts-expect-error Checking one string key does not establish other properties.
      expect(data.missing).toBeUndefined();
    } else {
      throw new Error('Expected own string property');
    }

    if (hasOwn(data, numberKey, isString)) {
      expectTypeOf(data).toEqualTypeOf<{ id: number }>();
      // @ts-expect-error Checking one numeric key does not establish every index.
      expect(data[1]).toBeUndefined();
    } else {
      throw new Error('Expected own numeric property');
    }

    if (hasOwn(data, symbolKey, isString)) {
      expectTypeOf(data).toEqualTypeOf<{ id: number }>();
      // @ts-expect-error Checking one symbol key does not establish every symbol.
      expect(data[Symbol('missing')]).toBeUndefined();
    } else {
      throw new Error('Expected own symbol property');
    }

    for (const key of keys) {
      if (hasOwn(data, key)) {
        expectTypeOf(data).toEqualTypeOf<{ id: number }>();
        // @ts-expect-error A broad key does not add an index signature.
        expect(data[key]).toBeDefined();
      } else {
        throw new Error('Expected own property');
      }
    }
  });

  test('does not assume every member of a union key exists', () => {
    const check = (key: 'name' | 'other') => {
      const data: { id: number } = { id: 1, ...{ [key]: 'momo' } };

      if (hasOwn(data, key, isString)) {
        expectTypeOf(data).toEqualTypeOf<{ id: number }>();
        // @ts-expect-error Only one of the union keys was checked.
        expect(data.name).toBe(key === 'name' ? 'momo' : undefined);
        // @ts-expect-error The other union key need not exist.
        expect(data.other).toBe(key === 'other' ? 'momo' : undefined);
      } else {
        throw new Error('Expected own string property');
      }

      const ownData: { id: number } = { id: 1, ...{ [key]: 'momo' } };
      if (hasOwn(ownData, key)) {
        expectTypeOf(ownData).toEqualTypeOf<{ id: number }>();
      } else {
        throw new Error('Expected own property');
      }
    };

    check('name');
    check('other');
  });

  test('keeps mixed and template literal keys conservative', () => {
    const check = (key: 'name' | number | `user-${string}`) => {
      const data: object = { [key]: 'momo' };

      if (!hasOwn(data, key, isString)) throw new Error('Expected string');

      expectTypeOf(data).toMatchTypeOf<object>();
      // @ts-expect-error A mixed key cannot establish a string index signature.
      expect(data.missing).toBeUndefined();
      // @ts-expect-error The literal member is not guaranteed to be the checked key.
      expect(data.name).toBe(key === 'name' ? 'momo' : undefined);
    };

    check('name');
    check(0);
    check('user-momo');
  });

  test('preserves the object in false branches for broad and union keys', () => {
    const data = { id: 1 };
    const check = (key: string | number | symbol) => {
      if (!hasOwn(data, key, isString)) {
        expectTypeOf(data).toEqualTypeOf<{ id: number }>();
        expect(data.id).toBe(1);
      } else {
        throw new Error('Expected a missing property');
      }
    };
    const checkUnion = (key: 'name' | 'other') => {
      if (!hasOwn(data, key)) {
        expectTypeOf(data).toEqualTypeOf<{ id: number }>();
        expect(data.id).toBe(1);
      } else {
        throw new Error('Expected a missing property');
      }
    };

    check('missing');
    check(0);
    check(Symbol('missing'));
    checkUnion('name');
    checkUnion('other');
  });

  test('accepts explicit and partial type arguments with broad keys', () => {
    const data: object = { name: 'momo' };
    const key: string = 'name';
    const checked = hasOwn<object, string, string>(data, key, isString);
    const partial = hasOwn<object, string>(data, key, isString);
    const own = hasOwn<object, string>(data, key);

    expectTypeOf(checked).toEqualTypeOf<boolean>();
    expectTypeOf(partial).toEqualTypeOf<boolean>();
    expectTypeOf(own).toEqualTypeOf<boolean>();
    expect(checked).toBe(true);
    expect(partial).toBe(true);
    expect(own).toBe(true);
    expect(hasOwn<object, string>(data, 'missing')).toBe(false);
  });

  test('skips the guard for missing or inherited properties', () => {
    const check = mock(isString);
    const guard = (value: unknown): value is string => check(value);

    expect(hasOwn({}, 'name', guard)).toBe(false);
    expect(hasOwn(Object.create({ name: 'momo' }), 'name', guard)).toBe(false);
    expect(check).not.toHaveBeenCalled();
    expect(hasOwn({ name: 'momo' }, 'name', guard)).toBe(true);
    expect(check).toHaveBeenCalledTimes(1);
    expect(check).toHaveBeenCalledWith('momo');
  });

  test('reads getters only when a guard is provided', () => {
    const get = mock(() => 'momo');
    const data = Object.defineProperty({}, 'name', { get });

    expect(hasOwn(data, 'name')).toBe(true);
    expect(hasOwn(data, 'name', undefined)).toBe(true);
    expect(get).not.toHaveBeenCalled();
    expect(hasOwn(data, 'name', isString)).toBe(true);
    expect(get).toHaveBeenCalledTimes(1);
  });

  test('keeps the property unknown when the guard may be undefined', () => {
    const check = (guard?: (value: unknown) => value is string) => {
      const data: object = { name: 1 };

      if (!hasOwn(data, 'name', guard)) return false;

      expectTypeOf(data.name).toEqualTypeOf<unknown>();
      return true;
    };

    expect(check()).toBe(true);
    expect(check(isString)).toBe(false);
  });
});
