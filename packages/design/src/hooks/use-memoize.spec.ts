import {
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  mock,
  test,
} from 'bun:test';

type Callback = (...args: never[]) => unknown;

type HookSlot = {
  deps: readonly unknown[];
  value: unknown;
};

const slots: HookSlot[] = [];
let cursor = 0;

function dependenciesChanged(
  previous: readonly unknown[] | undefined,
  next: readonly unknown[],
) {
  return (
    !previous ||
    previous.length !== next.length ||
    next.some((value, index) => !Object.is(value, previous[index]))
  );
}

function useMemo<Value>(factory: () => Value, deps: readonly unknown[]) {
  const index = cursor;
  cursor += 1;

  const previous = slots[index];
  if (dependenciesChanged(previous?.deps, deps)) {
    slots[index] = { deps, value: factory() };
  }

  return slots[index].value as Value;
}

function useCallback<Fn extends Callback>(
  callback: Fn,
  deps: readonly unknown[],
): Fn {
  return useMemo(() => callback, deps);
}

mock.module('react', () => ({ useCallback, useMemo }));

const { useMemoize } = await import('./use-memoize');

function render<Args extends unknown[], Result, Key>(
  callback: (...args: Args) => Result,
  hash: (...args: Args) => Key,
) {
  cursor = 0;
  return useMemoize(callback, hash);
}

beforeEach(() => {
  slots.length = 0;
  cursor = 0;
});

describe('useMemoize', () => {
  test('creates one result per hash key', () => {
    let calls = 0;
    const callback = (value: string) => ({ id: ++calls, value });
    const hash = (value: string) => value;
    const cached = render(callback, hash);

    const first = cached('first');
    const second = cached('second');

    expect(cached('first')).toBe(first);
    expect(cached('second')).toBe(second);
    expect(second).not.toBe(first);
    expect(calls).toBe(2);
  });

  test('uses exact Map keys and caches undefined results', () => {
    type Key = string | number | null;

    let calls = 0;
    const callback = (value: Key) => {
      calls += 1;
      return value === null ? undefined : { value };
    };
    const hash = (value: Key) => value;
    const cached = render(callback, hash);

    expect(cached(null)).toBeUndefined();
    expect(cached(null)).toBeUndefined();
    expect(cached('null')).toEqual({ value: 'null' });
    expect(cached(0)).toEqual({ value: 0 });
    expect(calls).toBe(3);
  });

  test('keeps the cache and returned callback stable with stable inputs', () => {
    let calls = 0;
    const callback = (value: string) => ({ id: ++calls, value });
    const hash = (value: string) => value;

    const firstRender = render(callback, hash);
    const firstResult = firstRender('value');
    const secondRender = render(callback, hash);

    expect(secondRender).toBe(firstRender);
    expect(secondRender('value')).toBe(firstResult);
    expect(calls).toBe(1);
  });

  test('invalidates cached results when the callback changes', () => {
    const hash = (value: string) => value;
    const firstRender = render((value: string) => `first:${value}`, hash);

    expect(firstRender('value')).toBe('first:value');

    const secondRender = render((value: string) => `second:${value}`, hash);

    expect(secondRender).not.toBe(firstRender);
    expect(secondRender('value')).toBe('second:value');
  });

  test('invalidates cached results when the hash changes', () => {
    let calls = 0;
    const callback = (_value: string) => ++calls;
    const firstRender = render(callback, (value: string) => value);

    expect(firstRender('value')).toBe(1);

    const secondRender = render(callback, (value: string) => value.length);

    expect(secondRender('value')).toBe(2);
  });

  test('preserves callback parameter and result types', () => {
    const cached = render(
      (value: number, prefix: string) => `${prefix}:${value}`,
      (value) => value,
    );

    expectTypeOf(cached).toEqualTypeOf<
      (value: number, prefix: string) => string
    >();
  });
});
