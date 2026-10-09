import { expectTypeOf } from 'bun:test';

import type { SetValue } from './use-controllable-value';
import { useControllableValue } from './use-controllable-value';

// Compile-only contracts; runtime cases now mount React in browser-tests.
// narrows the value when a defined fallback guarantees it
export function narrowsDefinedFallback() {
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
}

// separates readable previous values from writable values
export function separatesReadableAndWritableValues() {
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
}

// preserves optional controlled writes and their previous request type
export function preservesOptionalControlledWrites() {
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

  setDate((previous) => {
    expectTypeOf(previous).toEqualTypeOf<Date | undefined>();
    return restored;
  }, 'restore');
}

// preserves declared writable types when inferring controlled mode
export function preservesInferredControlledWrites() {
  const [date, setDate] = useControllableValue<Date | undefined>({
    value: new Date(),
  });
  const [, setRequiredDate] = useControllableValue<Date>({
    value: new Date(),
  });

  expectTypeOf(date).toEqualTypeOf<Date>();
  expectTypeOf(setDate).toEqualTypeOf<SetValue<Date | undefined>>();
  expectTypeOf(setRequiredDate).toEqualTypeOf<SetValue<Date>>();
}

// keeps defined defaults nonempty even with an optional value type
export function keepsDefinedDefaultsNonempty() {
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
}
