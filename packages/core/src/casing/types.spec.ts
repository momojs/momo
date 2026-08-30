import { describe, expectTypeOf, test } from 'bun:test';

import type { LowerCasedProperties, UpperCasedProperties } from './types';

describe('casing types', () => {
  test('exports key casing utility types', () => {
    type Upper = UpperCasedProperties<{
      readonly name: string;
      readonly user_id: number;
    }>;
    type Lower = LowerCasedProperties<{
      readonly NAME: string;
      readonly USER_ID: number;
    }>;

    expectTypeOf<Upper>().toEqualTypeOf<{
      readonly NAME: string;
      readonly USER_ID: number;
    }>();
    expectTypeOf<Lower>().toEqualTypeOf<{
      readonly name: string;
      readonly user_id: number;
    }>();
    expectTypeOf<UpperCasedProperties<readonly ['name']>>().toEqualTypeOf<
      readonly ['name']
    >();

    class Example {}
    expectTypeOf<UpperCasedProperties<typeof Example>>().toEqualTypeOf<
      typeof Example
    >();
  });
});
