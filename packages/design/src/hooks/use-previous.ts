import { useEffect, useRef } from 'react';

/**
 * Reads the value recorded by the most recent completed effect.
 * Unrelated renders may return the current value, not the last distinct value.
 *
 * @param value The value to record after commit; objects are retained by reference.
 * @returns null on the first render, then the last effect's value.
 * @example
 * const previous = usePrevious(page);
 * const direction = previous === null ? 0 : Math.sign(page - previous);
 */
export function usePrevious<T>(value: T): T | null {
  const previous = useRef<T | null>(null);

  useEffect(() => {
    previous.current = value;
  }, [value]);

  return previous.current;
}
