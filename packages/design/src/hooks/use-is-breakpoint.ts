import { useLayoutEffect, useState } from 'react';

import { isSSR } from '@momots/host';

type BreakpointMode = 'min' | 'max';

const toQuery = (mode: BreakpointMode, breakpoint: number) => {
  if (isSSR()) return null;
  const offset = mode === 'max' ? 1 : 0;
  const width = breakpoint - offset;
  const selector = `(${mode}-width: ${width}px)`;
  return globalThis.matchMedia(selector);
};

export function useIsBreakpoint(
  mode: BreakpointMode = 'max',
  breakpoint = 768,
) {
  const [matches, setMatches] = useState(
    () => toQuery(mode, breakpoint)?.matches,
  );

  useLayoutEffect(() => {
    const query = toQuery(mode, breakpoint);
    if (query) {
      setMatches(query.matches);

      const onChange = ({ matches }: MediaQueryListEvent) => {
        setMatches(matches);
      };

      query.addEventListener('change', onChange);

      return () => {
        query.removeEventListener('change', onChange);
      };
    }
  }, [mode, breakpoint]);

  return matches;
}
