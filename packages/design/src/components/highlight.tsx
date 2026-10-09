'use client';

import type { ComponentProps } from 'react';

import type { StyleKeyframesDefinition } from 'motion/react';
import { AnimatePresence, motion } from 'motion/react';

import { pose, useFeel } from '../motion/index.js';
import { cx } from '../tailwind/index.js';

export type HighlightProps = ComponentProps<typeof motion.div> & {
  active?: boolean;
  exitDelay?: number;
  highlightStyle?: StyleKeyframesDefinition | null;
};

export function Highlight({
  active,
  className,
  transition,
  highlightStyle,
  exitDelay = 0,
  ...props
}: HighlightProps) {
  const visible = active || !!highlightStyle;
  const preset = useFeel('snap');
  const resolvedTransition = preset.reduced
    ? preset.transition
    : (transition ?? preset.transition);
  const opacityTransition =
    'opacity' in resolvedTransition ? resolvedTransition.opacity : undefined;

  const exitTransition = {
    ...resolvedTransition,
    delay:
      preset.mode === 'off'
        ? 0
        : (resolvedTransition.delay ?? 0) + exitDelay / 1000,
    ...(opacityTransition && {
      opacity: {
        ...opacityTransition,
        delay:
          preset.mode === 'off'
            ? 0
            : (opacityTransition.delay ?? resolvedTransition.delay ?? 0) +
              exitDelay / 1000,
      },
    }),
  };

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          data-slot='highlight'
          className={cx(
            'absolute pointer-events-none inset-0 rounded-md z-8',
            className,
          )}
          initial={{
            scale: preset.reduced ? 1 : 0,
            opacity: 0,
            ...highlightStyle,
          }}
          animate={pose(
            {
              scale: 1,
              opacity: 1,
              ...highlightStyle,
            },
            preset.mode,
          )}
          transition={resolvedTransition}
          exit={{
            scale: preset.reduced ? 1 : 0,
            opacity: 0,
            ...highlightStyle,
            transition: exitTransition,
          }}
          {...props}
        />
      )}
    </AnimatePresence>
  );
}
