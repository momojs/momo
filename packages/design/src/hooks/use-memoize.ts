import { useCallback, useMemo } from 'react';

export function useMemoize<Args extends unknown[], Result, Key>(
  callback: (...args: Args) => Result,
  hash: (...args: Args) => Key,
) {
  const cache = useMemo(() => new Map<Key, Result>(), [callback, hash]);

  return useCallback(
    (...args: Args): Result => {
      const key = hash(...args);
      if (cache.has(key)) {
        return cache.get(key) as Result;
      }

      const result = callback(...args);
      cache.set(key, result);
      return result;
    },
    [cache, callback, hash],
  );
}
