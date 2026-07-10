import { useEffect, useRef } from 'react';

/**
 *
 * @param value the value to track
 */
export function usePrevious<T>(value: T): T | null {
  const previous = useRef<T | null>(null);

  useEffect(() => {
    previous.current = value;
  }, [value]);

  return previous.current;
}
