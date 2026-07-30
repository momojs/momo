'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { resize } from 'motion/react';

import type { ControlValue } from '../shared';

export function useAutoHeight<T extends HTMLElement = HTMLDivElement>() {
  const [ref, setRef] = useState<T | null>(null);

  const [rect, setRect] = useState({
    width: 0,
    height: 0,
  });

  const activeValue = useRef<ControlValue | undefined>(undefined);
  const registerRef = useRef(new Map<ControlValue, React.RefCallback<T>>());
  const registry = useRef(new Map<ControlValue, T>());

  const register = useCallback((value: ControlValue): React.RefCallback<T> => {
    const { current: caches } = registerRef;
    const cached = caches.get(value);
    if (cached) return cached;

    const callback: React.RefCallback<T> = (instance) => {
      const { current } = registry;

      if (!instance) {
        const prev = current.get(value);
        current.delete(value);
        if (prev) {
          setRef((active) => (active === prev ? null : active));
        }
        return;
      }

      current.set(value, instance);

      if (activeValue.current === value) {
        setRef(instance);
      }

      return () => {
        current.delete(value);
        setRef((active) => (active === instance ? null : active));
      };
    };

    caches.set(value, callback);
    return callback;
  }, []);

  const activate = useCallback((value: ControlValue) => {
    activeValue.current = value;
    const instance = registry.current.get(value);
    if (instance) {
      setRef(instance);
    }
  }, []);

  useLayoutEffect(() => {
    if (!ref) return;

    const { width, height } = ref.getBoundingClientRect();
    setRect((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );

    return resize(ref, (_, info) => {
      setRect((prev) =>
        prev.width === info.width && prev.height === info.height ? prev : info,
      );
    });
  }, [ref]);

  return { rect, activate, register };
}
