import { useCallback, useMemo, useSyncExternalStore } from 'react';

/** Both modes include the breakpoint, like CSS min-width and max-width. */
export type BreakpointMode = 'min' | 'max';

export interface UseIsBreakpointOptions {
  /** Server and hydration snapshot; also used without matchMedia. Default: false. */
  serverMatches?: boolean;
}

/**
 * Subscribes to a viewport width breakpoint in CSS pixels.
 *
 * @param mode `min` means width >= breakpoint; `max` means width <= breakpoint.
 * @param breakpoint A finite, non-negative width, including fractional pixels.
 * @param options Use the same serverMatches on the server and during hydration.
 * @returns The current match, or serverMatches during SSR and initial hydration.
 * @example
 * const compact = useIsBreakpoint('max', 768, { serverMatches: false });
 */
export function useIsBreakpoint(
  mode: BreakpointMode = 'max',
  breakpoint = 768,
  { serverMatches = false }: UseIsBreakpointOptions = {},
): boolean {
  if (!Number.isFinite(breakpoint) || breakpoint < 0) {
    throw new RangeError('breakpoint must be a finite, non-negative number');
  }

  const query = `(${mode}-width: ${breakpoint}px)`;
  const media = useMemo(
    () =>
      typeof window === 'undefined' || typeof window.matchMedia !== 'function'
        ? null
        : window.matchMedia(query),
    [query],
  );
  const subscribe = useCallback(
    (notify: () => void) => {
      media?.addEventListener('change', notify);
      return () => media?.removeEventListener('change', notify);
    },
    [media],
  );
  const getSnapshot = useCallback(
    () => media?.matches ?? serverMatches,
    [media, serverMatches],
  );
  const getServerSnapshot = useCallback(() => serverMatches, [serverMatches]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
