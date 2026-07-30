import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

import type { Updater } from '@momots/core';
import { realize } from '@momots/core';

/** Receives a resolved value after it changes. */
export type ChangeHandler<Value, Args extends unknown[] = unknown[]> = (
  value: Value,
  ...args: Args
) => void;

/** Sets a value directly or derives it from the current value. */
export type SetValue<Value, Args extends unknown[] = unknown[]> = (
  updater: Updater<Value>,
  ...args: Args
) => void;

/** Options for a value that may be controlled by its caller. */
export interface ControlOptions<Value, Args extends unknown[] = unknown[]> {
  /** Overrides the inferred mode when `undefined` is a controlled value. */
  readonly controlled?: boolean;
  readonly value?: Value;
  readonly defaultValue?: Value;
  readonly onChange?: ChangeHandler<Value, Args>;
}

type Defined<Value> = Exclude<Value, undefined>;

/**
 * Manages a value that can be either controlled or uncontrolled.
 *
 * By default, `undefined` means the value is uncontrolled. The `controlled`
 * option can override that inference. The returned setter accepts a value or a
 * function updater, while `onChange` always receives the resolved value and
 * the original trailing arguments. The control mode is fixed on the first
 * render. A statically defined controlled value or uncontrolled fallback
 * narrows both the returned value and setter to exclude `undefined`.
 */
export function useControllableValue<
  Value,
  const Args extends unknown[] = unknown[],
>(
  options: ControlOptions<Value, Args> & {
    readonly controlled?: true;
    readonly value: Defined<Value>;
  },
): [Defined<Value>, SetValue<Defined<Value>, Args>];
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
): [Value | undefined, SetValue<Value, Args>];
export function useControllableValue<
  Value,
  const Args extends unknown[] = unknown[],
>({
  controlled,
  value: controlledValue,
  defaultValue,
  onChange,
}: ControlOptions<Value, Args>): [Value | undefined, SetValue<Value, Args>] {
  const controlledMode = controlled ?? controlledValue !== undefined;
  const controlledRef = useRef(controlledMode);
  const previousControlledRef = useRef(controlledMode);
  const isControlled = controlledRef.current;
  const [uncontrolledValue, setUncontrolledValue] = useState<Value | undefined>(
    () => defaultValue,
  );
  const value = isControlled ? controlledValue : uncontrolledValue;

  const valueRef = useRef(value);
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

  // A controlled update is optimistic within the current batch. Committing a
  // render resets it to the value accepted by the caller.
  useLayoutEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  const [, forceControlledReset] = useReducer(
    (version: number) => version + 1,
    0,
  );

  const setValue = useCallback<SetValue<Value, Args>>((updater, ...args) => {
    const previous = valueRef.current;
    const next = realize(updater, previous);

    if (Object.is(previous, next)) return;

    valueRef.current = next;

    if (controlledRef.current) {
      forceControlledReset();
    } else {
      setUncontrolledValue(() => next);
    }

    onChangeRef.current?.(next, ...args);
  }, []);

  return [value, setValue];
}
