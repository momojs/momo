import { expectTypeOf } from 'bun:test';

import { useMemoize } from './use-memoize';

// The existing type contract is checked by typecheck:spec, without calling a hook in Bun.
export function preservesCallbackParameterAndResultTypes() {
  const cached = useMemoize(
    (value: number, prefix: string) => `${prefix}:${value}`,
    (value) => value,
  );
  expectTypeOf(cached).toEqualTypeOf<
    (value: number, prefix: string) => string
  >();
}
