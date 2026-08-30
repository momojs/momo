'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { resize } from 'motion/react';
import { isStrictEqual } from 'remeda';

import { useCacheCallback } from '../hooks/use-cache-callback.js';
import type { ControlValue } from '../shared/index.js';

const getControlValueKey = (value: ControlValue) => value;

export function useAutoHeight<T extends HTMLElement = HTMLDivElement>() {
  const [ref, setRef] = useState<T | null>(null);

  const [rect, setRect] = useState({
    width: 0,
    height: 0,
  });

  const registry = useRef(new Map<ControlValue, T>());
  const active = useRef<ControlValue | undefined>(undefined);

  const register = useCacheCallback(
    useCallback(
      (value: ControlValue): React.RefCallback<T> =>
        (instance) => {
          const { current } = registry;

          if (!instance) {
            const prev = current.get(value);
            current.delete(value);
            if (prev) {
              setRef((curr) => (curr === prev ? null : curr));
            }
            return;
          }

          current.set(value, instance);

          if (active.current === value) {
            setRef(instance);
          }

          return () => {
            current.delete(value);
            setRef((active) => (active === instance ? null : active));
          };
        },
      [],
    ),
    getControlValueKey,
  );

  const activate = useCallback((value: ControlValue) => {
    active.current = value;
    const instance = registry.current.get(value);
    if (instance) setRef(instance);
  }, []);

  useLayoutEffect(() => {
    if (!ref) return;

    const rect = ref.getBoundingClientRect();

    setRect((prev) => (isStrictEqual(prev, rect) ? prev : rect));

    return resize(ref, (_, info) => {
      setRect((prev) => (isStrictEqual(prev, info) ? prev : info));
    });
  }, [ref]);

  return { rect, activate, register };
}
