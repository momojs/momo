import { describe, expect, test } from 'bun:test';

import { toPascalCase } from './toPascalCase';

describe('toPascalCase', () => {
  test('converts strings to PascalCase', () => {
    expect(toPascalCase('hello world')).toBe('HelloWorld');
    expect(toPascalCase('momo-kit')).toBe('MomoKit');
  });
});
