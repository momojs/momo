'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { useCacheCallback } from '../hooks/use-cache-callback.js';
import type { ElementSize } from '../hooks/use-element-size.js';
import { EMPTY_SIZE, useElementSize } from '../hooks/use-element-size.js';
import type { ControlValue } from '../shared/index.js';

const getControlValueKey = (value: ControlValue) => value;
const sameKey = (left: unknown, right: unknown) =>
  left === right || Object.is(left, right);

export type AutoHeightState =
  | { status: 'idle'; rect: null }
  | { status: 'pending'; value: ControlValue; rect: null }
  | { status: 'ready'; value: ControlValue; rect: ElementSize };

export interface AutoHeightApi<T extends HTMLElement = HTMLDivElement> {
  state: AutoHeightState;
  rect: ElementSize;
  height: number | 'auto';
  register: (value: ControlValue) => React.RefCallback<T>;
  activate: (value: ControlValue) => void;
  clear: () => void;
}

type Registration<T> = { element: T };

function useHeightTarget<T extends HTMLElement>(
  setTarget: (element: T | null) => void,
) {
  const registry = useRef(new Map<ControlValue, Registration<T>>());
  const active = useRef<ControlValue | undefined>(undefined);
  const [value, setValue] = useState<ControlValue | undefined>(undefined);

  const unregister = useCallback(
    (key: ControlValue, registration: Registration<T>) => {
      // A late cleanup belongs to its own mount, never to a replacement node.
      if (registry.current.get(key) !== registration) return;
      registry.current.delete(key);
      if (sameKey(active.current, key)) setTarget(null);
    },
    [setTarget],
  );

  const register = useCacheCallback(
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

  return { value, register, activate, clear };
}

/**
 * Measures one registered target's natural border box.
 *
 * `state` describes the current measurement. `height` is the presentation
 * target: initially auto, retained while pending, and zero after clear().
 * Keep the measured element independent of the animated container's height.
 */
export function useAutoHeight<
  T extends HTMLElement = HTMLDivElement,
>(): AutoHeightApi<T> {
  const { measurement, isCurrent, setTarget } = useElementSize<T>();
  const {
    value,
    register,
    activate,
    clear: clearTarget,
  } = useHeightTarget(setTarget);
  const [retainedHeight, setRetainedHeight] = useState<number | 'auto'>('auto');

  const size = isCurrent(measurement) ? measurement.size : null;
  const state: AutoHeightState =
    value === undefined
      ? { status: 'idle', rect: null }
      : size === null
        ? { status: 'pending', value, rect: null }
        : { status: 'ready', value, rect: size };

  useLayoutEffect(() => {
    // A descendant can change the target before this layout effect runs.
    if (isCurrent(measurement)) setRetainedHeight(measurement.size.height);
  }, [isCurrent, measurement]);

  const clear = useCallback(() => {
    clearTarget();
    setRetainedHeight(0);
  }, [clearTarget]);

  return {
    state,
    // Compatibility snapshot; state distinguishes unavailable from genuine zero.
    rect: state.rect ?? EMPTY_SIZE,
    height: state.rect?.height ?? retainedHeight,
    activate,
    register,
    clear,
  };
}
