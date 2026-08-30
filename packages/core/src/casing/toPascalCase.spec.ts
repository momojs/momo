import { describe, expect, expectTypeOf, test } from 'bun:test';

import { toPascalCase } from './toPascalCase';

describe('toPascalCase', () => {
  test('converts strings to PascalCase', () => {
    expect(toPascalCase('hello world')).toBe('HelloWorld');
    expect(toPascalCase('momo-kit')).toBe('MomoKit');
  });

  test('matches TypeFest consecutive-uppercase options', () => {
    const normalized = toPascalCase('fooBAR');
    const preserved = toPascalCase('fooBAR', {
      preserveConsecutiveUppercase: true,
    });

    expect(normalized).toBe('FooBar');
    expect(preserved).toBe('FooBAR');
    expectTypeOf(normalized).toEqualTypeOf<'FooBar'>();
    expectTypeOf(preserved).toEqualTypeOf<'FooBAR'>();
  });
});
