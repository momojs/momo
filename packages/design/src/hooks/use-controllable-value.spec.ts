import {
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  mock,
  test,
} from 'bun:test';

import type { ControlOptions, SetValue } from './use-controllable-value';

type Callback = (...args: never[]) => unknown;

type HookSlot =
  | { kind: 'state'; value: unknown }
  | { kind: 'ref'; value: { current: unknown } }
  | { kind: 'effect'; deps: readonly unknown[] }
  | { kind: 'callback'; value: Callback; deps: readonly unknown[] };

const slots: HookSlot[] = [];
let cursor = 0;

function nextSlot() {
  const index = cursor;
  cursor += 1;
  return index;
}

function useState<State>(initial: State | (() => State)) {
  const index = nextSlot();
  let slot = slots[index];

  if (!slot) {
    slot = {
      kind: 'state',
      value:
        typeof initial === 'function' ? (initial as () => State)() : initial,
    };
    slots[index] = slot;
  }

  if (slot.kind !== 'state') throw new Error('Hook order changed');

  const setState = (next: State | ((previous: State) => State)) => {
    slot.value =
      typeof next === 'function'
        ? (next as (previous: State) => State)(slot.value as State)
        : next;
  };

  return [slot.value as State, setState] as const;
}

function useRef<Value>(initial: Value) {
  const index = nextSlot();
  let slot = slots[index];

  if (!slot) {
    slot = { kind: 'ref', value: { current: initial } };
    slots[index] = slot;
  }

  if (slot.kind !== 'ref') throw new Error('Hook order changed');
  return slot.value as { current: Value };
}

function useCallback<Fn extends Callback>(
  callback: Fn,
  deps: readonly unknown[],
): Fn {
  const index = nextSlot();
  let slot = slots[index];
  const previous = slot?.kind === 'callback' ? slot : undefined;
  const changed =
    !previous ||
    deps.length !== previous.deps.length ||
    deps.some(
      (value, dependencyIndex) =>
        !Object.is(value, previous.deps[dependencyIndex]),
    );

  if (changed) {
    slot = { kind: 'callback', value: callback, deps };
    slots[index] = slot;
  }

  if (slot.kind !== 'callback') throw new Error('Hook order changed');
  return slot.value as Fn;
}

function useEffect(effect: () => void, deps?: readonly unknown[]) {
  const index = nextSlot();
  const slot = slots[index];
  const previous = slot?.kind === 'effect' ? slot : undefined;
  const changed =
    deps === undefined ||
    !previous ||
    deps.length !== previous.deps.length ||
    deps.some(
      (value, dependencyIndex) =>
        !Object.is(value, previous.deps[dependencyIndex]),
    );

  if (changed) effect();
  slots[index] = { kind: 'effect', deps: deps ?? [] };
}

function useReducer<State>(
  reducer: (state: State) => State,
  initial: State,
): readonly [State, () => void] {
  const [state, setState] = useState(initial);

  return [state, () => setState((previous) => reducer(previous))];
}

mock.module('react', () => ({
  useCallback,
  useEffect,
  useLayoutEffect: useEffect,
  useReducer,
  useRef,
  useState,
}));

const { useControllableValue } = await import('./use-controllable-value');

function render<Value, const Args extends unknown[] = unknown[]>(
  options: ControlOptions<Value, Args>,
) {
  cursor = 0;
  return useControllableValue(options);
}

beforeEach(() => {
  slots.length = 0;
  cursor = 0;
});

describe('useControllableValue', () => {
  test('narrows the value when a defined fallback guarantees it', () => {
    const value = undefined as Date | undefined;

    const [date, setDate] = useControllableValue({
      value,
      defaultValue: new Date(),
    });
    const [controlledDate] = useControllableValue({
      controlled: true,
      value,
      defaultValue: new Date(),
    });
    const [definedControlledDate] = useControllableValue({
      controlled: true,
      value: new Date(),
    });
    const [ignoredControlledDate] = useControllableValue({
      controlled: false,
      value: new Date(),
    });

    expectTypeOf(date).toEqualTypeOf<Date>();
    expectTypeOf(setDate).toEqualTypeOf<SetValue<Date>>();
    expectTypeOf(controlledDate).toEqualTypeOf<Date | undefined>();
    expectTypeOf(definedControlledDate).toEqualTypeOf<Date>();
    expectTypeOf(ignoredControlledDate).toEqualTypeOf<Date | undefined>();
  });

  test('updates an uncontrolled value and forwards resolved values and args', () => {
    const changes: Array<[number, string]> = [];
    const options: ControlOptions<number, [string]> = {
      defaultValue: 1,
      onChange: (value, source) => changes.push([value, source]),
    };

    const [, setValue] = render(options);
    setValue((previous) => (previous ?? 0) + 1, 'first');
    setValue((previous) => (previous ?? 0) + 1, 'second');

    expect(render(options)[0]).toBe(3);
    expect(changes).toEqual([
      [2, 'first'],
      [3, 'second'],
    ]);
  });

  test('treats undefined as uncontrolled', () => {
    const options: ControlOptions<number> = {
      value: undefined,
      defaultValue: 4,
    };
    const [value, setValue] = render(options);

    expect(value).toBe(4);
    setValue(5);
    expect(render(options)[0]).toBe(5);
  });

  test('supports explicitly controlled undefined values', () => {
    const changes: number[] = [];
    const options: ControlOptions<number> = {
      controlled: true,
      value: undefined,
      defaultValue: 4,
      onChange: (value) => changes.push(value),
    };
    const [value, setValue] = render(options);

    expect(value).toBeUndefined();
    setValue(5);
    expect(render(options)[0]).toBeUndefined();
    expect(changes).toEqual([5]);
  });

  test('resolves controlled updates without changing the controlled value', () => {
    const changes: Array<[number, { source: string }]> = [];
    const details = { source: 'pointer' };
    const options: ControlOptions<number, [typeof details]> = {
      value: 2,
      onChange: (value, nextDetails) => changes.push([value, nextDetails]),
    };
    const [, setValue] = render(options);

    setValue((previous) => (previous ?? 0) + 3, details);

    expect(render(options)[0]).toBe(2);
    expect(changes).toEqual([[5, details]]);
  });

  test('queues controlled functional updates within the same batch', () => {
    const changes: number[] = [];
    const options: ControlOptions<number> = {
      value: 1,
      onChange: (value) => changes.push(value),
    };
    const [, setValue] = render(options);

    setValue((previous) => (previous ?? 0) + 1);
    setValue((previous) => (previous ?? 0) + 1);

    expect(changes).toEqual([2, 3]);
    expect(render(options)[0]).toBe(1);

    setValue((previous) => (previous ?? 0) + 1);
    expect(changes).toEqual([2, 3, 2]);
  });

  test('deduplicates repeated controlled values within the same batch', () => {
    const changes: number[] = [];
    const options: ControlOptions<number> = {
      value: 1,
      onChange: (value) => changes.push(value),
    };
    const [, setValue] = render(options);

    setValue(2);
    setValue(2);

    expect(changes).toEqual([2]);
  });

  test('skips unchanged values', () => {
    const changes: number[] = [];
    const options: ControlOptions<number> = {
      defaultValue: 1,
      onChange: (value) => changes.push(value),
    };
    const [, setValue] = render(options);

    setValue(1);

    expect(changes).toEqual([]);
    expect(render(options)[0]).toBe(1);
  });

  test('keeps the setter stable and reads the latest props', () => {
    const firstChanges: number[] = [];
    const secondChanges: number[] = [];
    const first = render({
      value: 1,
      onChange: (value) => firstChanges.push(value),
    });
    const second = render({
      value: 5,
      onChange: (value) => secondChanges.push(value),
    });

    expect(second[1]).toBe(first[1]);
    first[1]((previous) => (previous ?? 0) + 1);
    expect(firstChanges).toEqual([]);
    expect(secondChanges).toEqual([6]);
  });

  test('keeps the initial mode and warns when the inferred mode changes', () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(String(message));

    try {
      const [, setValue] = render<number>({ defaultValue: 1 });

      expect(render<number>({ value: 5 })[0]).toBe(1);
      setValue(2);
      expect(render<number>({ value: 5 })[0]).toBe(2);
      expect(warnings).toEqual([
        'useControllableValue changed from uncontrolled to controlled. The control mode is fixed on the first render.',
      ]);
    } finally {
      console.warn = originalWarn;
    }
  });
});
