import { describe, expect, test } from 'bun:test';

import { defs } from './defs';

describe('defs', () => {
  test('provides default tree field names', () => {
    expect(defs).toEqual({
      id: 'id',
      parent: 'parent',
      children: 'children',
    });
  });
});
