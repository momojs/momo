import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

import { realize } from '@momots/core';

/** Synchronously receives a changed request, not a commit confirmation. */
export type ChangeHandler<Value, Args extends unknown[] = unknown[]> = (
  value: Value,
  ...args: Args
) => void;

/** Requests a value directly or derives it from the latest request result. */
export type SetValue<
  Value,
  Args extends unknown[] = unknown[],
  Previous = Value,
> = (updater: Value | ((previous: Previous) => Value), ...args: Args) => void;

/** Options for a value that may be controlled by its caller. */
export interface ControlOptions<Value, Args extends unknown[] = unknown[]> {
  /** Overrides the inferred mode when `undefined` is a controlled value. */
  readonly controlled?: boolean;
  readonly value?: Value;
  /** Initial value; also the fallback if an implicitly controlled value vanishes. */
  readonly defaultValue?: Value;
  readonly onChange?: ChangeHandler<Value, Args>;
}

type Defined<Value> = Exclude<Value, undefined>;

/**
 * Manages a value that can be either controlled or uncontrolled.
 *
 * By default, `undefined` means the value is uncontrolled. The `controlled`
 * option can override that inference. The returned setter accepts a value or a
 * function updater. Requests compose until a controlled commit realigns them
 * with the caller's value; uncontrolled requests survive unrelated commits.
 * `onChange` synchronously receives each changed request and its trailing args.
 * The setter is stable and the control mode is fixed on the first render.
 *
 * A defined controlled value narrows the result, but preserves the declared
 * writable type and updater's previous type. The defined-default overload
 * excludes `undefined` from all three. Explicitly controlled `undefined` is
 * preserved, even with a default.
 *
 * @example
 * const [date, setDate] = useControllableValue({ defaultValue: new Date() });
 * setDate(previous => new Date(previous.getTime() + 1_000));
 */
export function useControllableValue<
  Value,
  const Args extends unknown[] = unknown[],
>(
  options: ControlOptions<Value, Args> & {
    readonly controlled?: true;
    readonly value: Defined<Value>;
  },
): [Defined<Value>, SetValue<Value, Args>];
export function useControllableValue<
  Value,
  const Args extends unknown[] = unknown[],
>(
  options: ControlOptions<Value, Args> & {
    readonly controlled?: false;
    readonly defaultValue: Defined<Value>;
  },
): [Defined<Value>, SetValue<Defined<Value>, Args>];
export function useControllableValue<
  Value,
  const Args extends unknown[] = unknown[],
>(
  options: ControlOptions<Value, Args>,
): [Value | undefined, SetValue<Value, Args, Value | undefined>];
export function useControllableValue<
  Value,
  const Args extends unknown[] = unknown[],
>({
  controlled,
  value: controlledValue,
  defaultValue,
  onChange,
}: ControlOptions<Value, Args>): [
  Value | undefined,
  SetValue<Value, Args, Value | undefined>,
] {
  const controlledMode = controlled ?? controlledValue !== undefined;
  const initial = useRef({
    isControlled: controlledMode,
    explicitlyControlled: controlled === true,
    defaultValue,
  }).current;
  const previousControlledRef = useRef(controlledMode);
  const [uncontrolledValue, setUncontrolledValue] = useState<Value | undefined>(
    () => initial.defaultValue,
  );
  const value = initial.isControlled
    ? controlledValue !== undefined || initial.explicitlyControlled
      ? controlledValue
      : initial.defaultValue
    : uncontrolledValue;

  const requestedValueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    const wasControlled = previousControlledRef.current;

    if (wasControlled !== controlledMode) {
      console.warn(
        `useControllableValue changed from ${wasControlled ? 'controlled' : 'uncontrolled'} to ${controlledMode ? 'controlled' : 'uncontrolled'}. The control mode is fixed on the first render.`,
      );
    }

    previousControlledRef.current = controlledMode;
  }, [controlledMode]);

  // Publish only committed props, before descendant layout effects can call
  // the setter. Never reset uncontrolled requests: their state writes may
  // still be pending in a lower-priority render.
  useInsertionEffect(() => {
    if (initial.isControlled) requestedValueRef.current = value;
    onChangeRef.current = onChange;
  });

  const [, realignControlledValue] = useReducer(
    (version: number) => version + 1,
    0,
  );

  const setValue = useCallback<SetValue<Value, Args, Value | undefined>>(
    (updater, ...args) => {
      const previous = requestedValueRef.current;
      const next = realize(updater, previous);

      if (Object.is(previous, next)) return;

      requestedValueRef.current = next;

      if (initial.isControlled) {
        // Realign even when the caller rejects the request without rerendering.
        realignControlledValue();
      } else {
        setUncontrolledValue(() => next);
      }

      onChangeRef.current?.(next, ...args);
    },
    [initial],
  );

  return [value, setValue];
}
