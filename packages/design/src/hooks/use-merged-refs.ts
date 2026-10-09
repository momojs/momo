import type { Ref, RefCallback } from 'react';
import { useCallback, useLayoutEffect, useRef } from 'react';

function attachRefs<Value>(refs: Array<Ref<Value> | undefined>, value: Value) {
  const cleanups = refs.map((ref) => {
    if (typeof ref === 'function') {
      const cleanup = ref(value);
      return typeof cleanup === 'function' ? cleanup : () => ref(null);
    }
    if (ref) {
      ref.current = value;
      return () => {
        ref.current = null;
      };
    }
    return undefined;
  });
  return () => {
    for (const cleanup of cleanups) cleanup?.();
  };
}

/**
 * Composes object and callback refs, preserving React callback ref cleanups.
 * Changes to the input refs detach the old set and attach the new set on commit.
 *
 * @param refs Refs for the same value; null and undefined entries are ignored.
 * @returns A stable callback ref. Cleanup functions are called when detached;
 * callbacks without cleanup receive null, and object refs are reset to null.
 * @example
 * const mergedRef = useMergedRefs(localRef, props.ref);
 * // <input ref={mergedRef} />
 */
export function useMergedRefs<Value>(
  ...refs: Array<Ref<Value> | undefined>
): RefCallback<Value> {
  const state = useRef({
    refs,
    value: null as Value | null,
    cleanup: undefined as (() => void) | undefined,
  });

  // Motion retains its DOM ref callback across external ref changes, so the
  // committed refs must be synchronized independently of callback identity.
  useLayoutEffect(() => {
    const current = state.current;
    if (
      refs.length === current.refs.length &&
      refs.every((ref, index) => ref === current.refs[index])
    )
      return;
    current.cleanup?.();
    current.refs = refs;
    current.cleanup =
      current.value === null ? undefined : attachRefs(refs, current.value);
  });

  return useCallback<RefCallback<Value>>((value) => {
    const current = state.current;
    current.cleanup?.();
    current.value = value;
    current.cleanup =
      value === null ? undefined : attachRefs(current.refs, value);
    return () => {
      current.cleanup?.();
      current.cleanup = undefined;
      current.value = null;
    };
  }, []);
}
