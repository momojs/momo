import { useLayoutEffect, useRef, useState } from 'react';

import type { IconInput } from 'morphicons';
import type { Morph } from 'morphicons/dom';
import { canonicalD, createMorph } from 'morphicons/dom';

import { useFeel } from '../motion/index.js';

/** One owner for path writes, including a handoff from a running loader. */
export function useIconPath(
  icon: IconInput | undefined,
  morph = true,
  from?: () => IconInput | undefined,
) {
  const { theme, reduced } = useFeel('snap');
  const { stiffness, damping } = theme.transitions.snap;
  const ref = useRef<SVGPathElement>(null);
  const driver = useRef<Morph | null>(null);
  // Keep React's SSR value stable while the driver owns subsequent d writes.
  const [d] = useState(() => (icon === undefined ? '' : canonicalD(icon)));

  useLayoutEffect(() => {
    const path = ref.current;
    if (!path) return;
    if (icon === undefined) {
      driver.current?.destroy();
      driver.current = null;
      return;
    }
    if (!driver.current) {
      const source = morph && !reduced ? from?.() : undefined;
      driver.current = createMorph(path, source ?? icon);
      if (source !== undefined) {
        driver.current.morphTo(icon, { stiffness, damping });
      }
    } else if (!morph || reduced) {
      driver.current.set(icon);
    } else {
      driver.current.morphTo(icon, { stiffness, damping });
    }
  }, [icon, morph, reduced, stiffness, damping, from]);

  useLayoutEffect(
    () => () => {
      driver.current?.destroy();
      driver.current = null;
    },
    [],
  );

  return { ref, d };
}
