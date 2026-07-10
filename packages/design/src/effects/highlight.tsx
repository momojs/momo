'use client';

import type { ComponentProps, RefCallback } from 'react';
import { useCallback, useRef, useState } from 'react';

import type { StyleKeyframesDefinition } from 'motion/react';
import { AnimatePresence, motion } from 'motion/react';

import { cx } from '../shared';

type HighlighterTrigger = 'hover' | 'click' | 'focus' | 'manual';

type HighlighterOptions = {
  trigger: HighlighterTrigger;
};

type Highlighter<
  TReference extends Element = HTMLElement,
  TContainer extends Element = HTMLElement,
> = {
  exit: () => void;
  flush: () => void;
  reference: RefCallback<TReference>;
  container: RefCallback<TContainer>;
  style: StyleKeyframesDefinition | undefined;
};

function useHighlighter<
  TReference extends Element = HTMLElement,
  TContainer extends Element = HTMLElement,
>({ trigger }: HighlighterOptions): Highlighter<TReference, TContainer> {
  const [style, setStyle] = useState<StyleKeyframesDefinition>();

  const containerRef = useRef<TContainer | null>(null);
  const referenceRef = useRef<TReference | null>(null);

  const flush = useCallback(() => {
    const container = containerRef.current;
    const reference = referenceRef.current;

    if (!container || !reference) return;

    const containerRect = container.getBoundingClientRect();
    const referenceRect = reference.getBoundingClientRect();

    setStyle({
      top: referenceRect.top - containerRect.top,
      left: referenceRect.left - containerRect.left,
      width: referenceRect.width,
      height: referenceRect.height,
      opacity: 1,
    });
  }, []);

  const exit = useCallback(() => {
    referenceRef.current = null;
    setStyle(undefined);
  }, []);

  const setCurrentReference = useCallback(
    (instance: TReference) => {
      referenceRef.current = instance;
      flush();
    },
    [flush],
  );

  const reference = useCallback<RefCallback<TReference>>(
    (instance) => {
      if (!instance) return;

      if (trigger === 'manual') {
        setCurrentReference(instance);

        return () => {
          if (referenceRef.current === instance) exit();
        };
      }

      if (trigger === 'hover') {
        const enter = () => setCurrentReference(instance);
        const leave = () => {
          if (referenceRef.current === instance) exit();
        };

        instance.addEventListener('pointerenter', enter);
        instance.addEventListener('pointerleave', leave);

        return () => {
          instance.removeEventListener('pointerenter', enter);
          instance.removeEventListener('pointerleave', leave);
          if (referenceRef.current === instance) exit();
        };
      }

      if (trigger === 'click') {
        const click = () => setCurrentReference(instance);

        instance.addEventListener('click', click);

        return () => {
          instance.removeEventListener('click', click);
          if (referenceRef.current === instance) exit();
        };
      }

      const focus = () => setCurrentReference(instance);
      const blur = () => {
        if (referenceRef.current === instance) exit();
      };

      instance.addEventListener('focus', focus);
      instance.addEventListener('blur', blur);

      return () => {
        instance.removeEventListener('focus', focus);
        instance.removeEventListener('blur', blur);
        if (referenceRef.current === instance) exit();
      };
    },
    [trigger, setCurrentReference, exit],
  );

  const container = useCallback<RefCallback<TContainer>>(
    (instance) => {
      containerRef.current = instance;
      flush();
    },
    [flush],
  );

  return {
    exit,
    style,
    flush,
    reference,
    container,
  };
}

type HighlightProps = ComponentProps<typeof motion.div> & {
  active?: boolean;
  exitDelay?: number;
  highlightStyle?: StyleKeyframesDefinition;
};

function Highlight({
  active,
  layoutId,
  className,
  transition,
  highlightStyle,
  exitDelay = 0,
  ...props
}: HighlightProps) {
  return (
    <AnimatePresence initial={false}>
      {active && (
        <motion.div
          data-slot='highlight'
          layoutId={layoutId}
          transition={transition}
          className={cx('absolute inset-0 rounded-md z-8', className)}
          initial={{
            ...highlightStyle,
            opacity: 0,
          }}
          animate={{
            opacity: 1,
            ...highlightStyle,
          }}
          exit={{
            opacity: 0,
            transition: {
              ...transition,
              delay: (transition?.delay ?? 0) + exitDelay / 1000,
            },
          }}
          {...props}
        />
      )}
    </AnimatePresence>
  );
}

export {
  Highlight,
  type Highlighter,
  type HighlighterOptions,
  type HighlighterTrigger,
  type HighlightProps,
  useHighlighter,
};
