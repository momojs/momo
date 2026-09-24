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
  useInsertionEffect: useEffect,
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

    setDate((previous) => {
      expectTypeOf(previous).toEqualTypeOf<Date>();
      return new Date(previous.getTime() + 1_000);
    });
  });

  test('separates readable previous values from writable values', () => {
    const [value, setValue] = useControllableValue<number>({});
    const [, setOptional] = useControllableValue<number | undefined>({
      controlled: true,
    });
    const [, setControlled] = useControllableValue({
      controlled: true,
      value: undefined as Date | undefined,
      defaultValue: new Date(),
      onChange: (_value: Date, _source: string) => undefined,
    });
    const [forcedDate, setForcedDate] = useControllableValue({
      controlled: false,
      value: undefined as Date | undefined,
      defaultValue: new Date(),
    });

    expectTypeOf(value).toEqualTypeOf<number | undefined>();
    expectTypeOf(setValue).toEqualTypeOf<
      SetValue<number, unknown[], number | undefined>
    >();
    expectTypeOf(setOptional).toEqualTypeOf<SetValue<number | undefined>>();
    expectTypeOf(setControlled).toEqualTypeOf<
      SetValue<Date, [string], Date | undefined>
    >();
    expectTypeOf(forcedDate).toEqualTypeOf<Date>();
    expectTypeOf(setForcedDate).toEqualTypeOf<SetValue<Date>>();
  });

  test('preserves optional controlled writes and their previous request type', () => {
    const initial = new Date(0);
    const restored = new Date(1_000);
    const changes: Array<[Date | undefined, string]> = [];
    const [date, setDate] = useControllableValue<Date | undefined, [string]>({
      controlled: true,
      value: initial,
      defaultValue: new Date(2_000),
      onChange: (next, source) => changes.push([next, source]),
    });

    expectTypeOf(date).toEqualTypeOf<Date>();
    expectTypeOf(setDate).toEqualTypeOf<SetValue<Date | undefined, [string]>>();

    setDate(undefined, 'clear');
    setDate((previous) => {
      expectTypeOf(previous).toEqualTypeOf<Date | undefined>();
      expect(previous).toBeUndefined();
      return restored;
    }, 'restore');

    expect(date).toBe(initial);
    expect(changes).toEqual([
      [undefined, 'clear'],
      [restored, 'restore'],
    ]);
  });

  test('preserves declared writable types when inferring controlled mode', () => {
    const [date, setDate] = useControllableValue<Date | undefined>({
      value: new Date(),
    });
    const [, setRequiredDate] = useControllableValue<Date>({
      value: new Date(),
    });

    expectTypeOf(date).toEqualTypeOf<Date>();
    expectTypeOf(setDate).toEqualTypeOf<SetValue<Date | undefined>>();
    expectTypeOf(setRequiredDate).toEqualTypeOf<SetValue<Date>>();
  });

  test('keeps defined defaults nonempty even with an optional value type', () => {
    const [date, setDate] = useControllableValue<Date | undefined>({
      defaultValue: new Date(),
    });
    const [forcedDate, setForcedDate] = useControllableValue<Date | undefined>({
      controlled: false,
      value: new Date(),
      defaultValue: new Date(),
    });

    expectTypeOf(date).toEqualTypeOf<Date>();
    expectTypeOf(setDate).toEqualTypeOf<SetValue<Date>>();
    expectTypeOf(forcedDate).toEqualTypeOf<Date>();
    expectTypeOf(setForcedDate).toEqualTypeOf<SetValue<Date>>();
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

  test('uses only the initial default and ignores forced-uncontrolled props', () => {
    const [, setValue] = render({
      controlled: false,
      value: 10,
      defaultValue: 1,
    });
    setValue(2);

    expect(render({ controlled: false, value: 20, defaultValue: 3 })[0]).toBe(
      2,
    );
  });

  test('falls back to the initial default when an implicit value disappears', () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(String(message));

    try {
      const initialDefault = new Date(0);
      const changes: Date[] = [];
      const [, setValue] = render({
        value: new Date(1_000),
        defaultValue: initialDefault,
      });
      const [value] = render<Date>({
        value: undefined,
        defaultValue: new Date(2_000),
        onChange: (next) => changes.push(next),
      });

      expect(value).toBe(initialDefault);
      setValue((previous) => new Date((previous?.getTime() ?? -1) + 1));
      expect(changes[0]?.getTime()).toBe(1);
      expect(warnings).toHaveLength(1);
    } finally {
      console.warn = originalWarn;
    }
  });

  test('preserves an explicit controlled clear despite a defined default', () => {
    render({ controlled: true, value: 1, defaultValue: 4 });

    expect(
      render<number>({
        controlled: true,
        value: undefined,
        defaultValue: 4,
      })[0],
    ).toBeUndefined();
  });

  test('does not treat null as a missing controlled value', () => {
    render<number | null>({ value: 1, defaultValue: 4 });

    expect(
      render<number | null>({ value: null, defaultValue: 4 })[0],
    ).toBeNull();
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

  test('notifies a request that returns to the rendered value', () => {
    const changes: number[] = [];
    const [, setValue] = render({
      value: 0,
      onChange: (value) => changes.push(value),
    });

    setValue(1);
    setValue(0);

    expect(changes).toEqual([1, 0]);
  });

  test('records requests before a reentrant onChange call', () => {
    const changes: number[] = [];
    const options: ControlOptions<number> = {
      defaultValue: 0,
      onChange(value) {
        changes.push(value);
        if (value === 1) setValue((previous) => (previous ?? 0) + 1);
      },
    };
    const [, setValue] = render(options);

    setValue((previous) => (previous ?? 0) + 1);

    expect(changes).toEqual([1, 2]);
    expect(render(options)[0]).toBe(2);
  });

  test('deduplicates using Object.is and keeps the first request arguments', () => {
    const changes: Array<[number, string]> = [];
    const [, setValue] = render<number, [string]>({
      defaultValue: Number.NaN,
      onChange: (value, source) => changes.push([value, source]),
    });

    setValue(Number.NaN, 'unchanged');
    setValue(0, 'first');
    setValue(0, 'duplicate');
    setValue(-0, 'negative');

    expect(changes).toEqual([
      [0, 'first'],
      [-0, 'negative'],
    ]);
  });

  test('does not notify when props or defaults change', () => {
    const changes: number[] = [];
    const onChange = (value: number) => changes.push(value);
    render({ value: 1, defaultValue: 0, onChange });
    render({ value: 2, defaultValue: 3, onChange });

    expect(changes).toEqual([]);
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
