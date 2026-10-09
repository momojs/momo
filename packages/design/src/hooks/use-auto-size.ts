'use client';

import { useCallback, useReducer, useRef, useState } from 'react';

import type { ControlValue } from '../shared/index.js';
import { useMemoize } from './use-memoize.js';
import type { ElementSize } from './use-resize.js';
import { EMPTY_SIZE, useResize } from './use-resize.js';

const getControlValueKey = (value: ControlValue) => value;
const sameKey = (left: unknown, right: unknown) =>
  left === right || Object.is(left, right);

export type AutoSizeState =
  | { status: 'idle'; rect: null }
  | { status: 'pending'; value: ControlValue; rect: null }
  | { status: 'ready'; value: ControlValue; rect: ElementSize };

export interface AutoSizeApi<T extends HTMLElement = HTMLDivElement> {
  state: AutoSizeState;
  width: number | 'auto';
  height: number | 'auto';
  /** Register a natural layout box, not a non-replaced inline or display: contents element. */
  register: (value: ControlValue) => React.RefCallback<T>;
  activate: (value: ControlValue) => void;
  clear: () => void;
}

type Registration<T> = { element: T };

type SizeTarget<T> = { element: T };
type SizeMeasurement<T> = { target: SizeTarget<T>; size: ElementSize };
type SizeMeasurementUpdate<T> = (
  previous: SizeMeasurement<T> | null,
) => SizeMeasurement<T> | null;

type SizeSnapshot<T extends HTMLElement> = {
  measurement: SizeMeasurement<T> | null;
  size: Readonly<{ width: number | 'auto'; height: number | 'auto' }>;
};

type SizeAction<T extends HTMLElement> =
  | { type: 'measurement'; update: SizeMeasurementUpdate<T> }
  | { type: 'clear' };

function reduceSize<T extends HTMLElement>(
  previous: SizeSnapshot<T>,
  action: SizeAction<T>,
): SizeSnapshot<T> {
  if (action.type === 'clear') {
    return previous.measurement === null &&
      previous.size.width === 0 &&
      previous.size.height === 0
      ? previous
      : { measurement: null, size: EMPTY_SIZE };
  }

  const measurement = action.update(previous.measurement);
  if (measurement === previous.measurement) return previous;
  return {
    measurement,
    // Invalidation changes availability, not the last valid animation target.
    size: measurement?.size ?? previous.size,
  };
}

function useSizeTarget<T extends HTMLElement>(invalidate: () => void) {
  const registry = useRef(new Map<ControlValue, Registration<T>>());
  const active = useRef<ControlValue | undefined>(undefined);
  const [value, setValue] = useState<ControlValue | undefined>(undefined);
  const [target, updateTarget] = useState<SizeTarget<T> | null>(null);
  const currentTarget = useRef(target);

  const setTarget = useCallback(
    (element: T | null) => {
      if ((currentTarget.current?.element ?? null) === element) return;
      const next = element ? { element } : null;
      // Invalidate queued measurements immediately, before React commits a retarget.
      currentTarget.current = next;
      updateTarget(next);
      invalidate();
    },
    [invalidate],
  );
  const isCurrent = useCallback(
    (binding: SizeTarget<T>) => binding === currentTarget.current,
    [],
  );

  const unregister = useCallback(
    (key: ControlValue, registration: Registration<T>) => {
      // A late cleanup belongs to its own mount, never to a replacement node.
      if (registry.current.get(key) !== registration) return;
      registry.current.delete(key);
      if (sameKey(active.current, key)) setTarget(null);
    },
    [setTarget],
  );

  const register = useMemoize(
    useCallback(
      (key: ControlValue): React.RefCallback<T> => {
        let attached: Registration<T> | null = null;
        return (instance) => {
          if (!instance) {
            if (attached) unregister(key, attached);
            attached = null;
            return;
          }

          const registration = { element: instance };
          attached = registration;
          registry.current.set(key, registration);
          if (sameKey(active.current, key)) setTarget(instance);

          return () => {
            unregister(key, registration);
            if (attached === registration) attached = null;
          };
        };
      },
      [setTarget, unregister],
    ),
    getControlValueKey,
  );

  const activate = useCallback(
    (key: ControlValue) => {
      active.current = key;
      setValue(key);
      setTarget(registry.current.get(key)?.element ?? null);
    },
    [setTarget],
  );

  const clear = useCallback(() => {
    active.current = undefined;
    setValue(undefined);
    setTarget(null);
  }, [setTarget]);

  return { value, target, isCurrent, register, activate, clear };
}

/**
 * Measures one registered target's natural border box.
 *
 * `state` describes the current measurement. `width` and `height` are the
 * presentation targets: initially auto, retained while pending, and zero after
 * clear(). Apply either or both axes to the animation container.
 * Keep the measured element independent of the container on each animated axis.
 * In particular, a stretched child cannot determine its parent's target width;
 * use an intrinsic or externally constrained width for width animations.
 * Targets must provide an observable layout box (e.g. block, inline-block,
 * flow-root, flex or grid). Non-replaced inline and display: contents targets
 * stay pending and warn in development builds; genuine zero and display: none are valid.
 */
export function useAutoSize<
  T extends HTMLElement = HTMLDivElement,
>(): AutoSizeApi<T> {
  const [{ measurement, size }, dispatch] = useReducer(reduceSize<T>, {
    measurement: null,
    size: { width: 'auto', height: 'auto' },
  });
  const invalidate = useCallback(() => {
    dispatch({ type: 'measurement', update: () => null });
  }, []);
  const {
    value,
    target,
    isCurrent,
    register,
    activate,
    clear: clearTarget,
  } = useSizeTarget<T>(invalidate);

  useResize(
    target?.element ?? null,
    (element, size) => {
      if (!target || target.element !== element || !isCurrent(target)) return;
      dispatch({
        type: 'measurement',
        update: (previous) => {
          // A valid notification can become obsolete while its update is queued.
          if (!isCurrent(target)) return previous;
          if (size === null) return null;
          if (
            previous?.target === target &&
            previous.size.width === size.width &&
            previous.size.height === size.height
          ) {
            return previous;
          }
          return { target, size };
        },
      });
    },
    { key: target },
  );

  const rect =
    measurement && isCurrent(measurement.target) ? measurement.size : null;
  const state: AutoSizeState =
    value === undefined
      ? { status: 'idle', rect: null }
      : rect === null
        ? { status: 'pending', value, rect: null }
        : { status: 'ready', value, rect };

  const clear = useCallback(() => {
    clearTarget();
    dispatch({ type: 'clear' });
  }, [clearTarget]);

  return {
    state,
    width: size.width,
    height: size.height,
    activate,
    register,
    clear,
  };
}
