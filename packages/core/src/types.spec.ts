import { describe, expect, test } from 'bun:test';

import type {
  Cast,
  Emptyish,
  MaybeArray,
  Nil,
  NonEmptyish,
  NonFalseish,
  OmitOf,
  PartialPick,
  PartialRecord,
  PlainObject,
  Realizable,
  RequiredPick,
  Stringifiable,
} from './types';

describe('types', () => {
  test('exports public utility types', () => {
    type _Nil = Nil;
    type _Cast = Cast<'a', string>;
    type _PartialPick = PartialPick<{ a: string; b: number }, 'a'>;
    type _RequiredPick = RequiredPick<{ a?: string }, 'a'>;
    type _PartialRecord = PartialRecord<'a', string>;
    type _PlainObject = PlainObject;
    type _OmitOf = OmitOf<{ a: string; b: number }, 'a'>;
    type _Realizable = Realizable<string>;
    type _MaybeArray = MaybeArray<string>;
    type _Emptyish = Emptyish<''>;
    type _NonEmptyish = NonEmptyish<string | ''>;
    type _NonFalseish = NonFalseish<string | '' | false>;
    type _EmptyMap = Emptyish<Map<never, never>>;
    type _EmptySet = Emptyish<ReadonlySet<never>>;
    type _EmptyDate = Emptyish<Date>;
    type _EmptyRegexp = Emptyish<RegExp>;
    type _SizedObject = Emptyish<{ size: 0; label: string }>;
    type _NonemptyArray = Emptyish<readonly [1]>;
    type _Stringifiable = Stringifiable;

    expect(true).toBe(true);
  });
});
