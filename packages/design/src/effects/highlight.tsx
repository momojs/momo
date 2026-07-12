'use client';

import type { ComponentProps, RefCallback } from 'react';
import { useCallback, useRef, useState } from 'react';

import type { StyleKeyframesDefinition } from 'motion/react';
import { AnimatePresence, motion } from 'motion/react';

import { cx } from '../shared';

export type HighlighterTrigger = 'hover' | 'click' | 'focus' | 'manual';

type MeasuredHighlightStyle = StyleKeyframesDefinition &
  Record<'height' | 'width' | 'x' | 'y' | 'zIndex', number>;

type HighlighterOptions = {
  enabled?: boolean;
  trigger?: HighlighterTrigger;
};

export type Highlighter<
  TReference extends Element = HTMLElement,
  TContainer extends Element = HTMLElement,
> = {
  exit: () => void;
  flush: () => void;
  reference: RefCallback<TReference>;
  container: RefCallback<TContainer>;
  style: StyleKeyframesDefinition | null;
};

export function useHighlighter<
  TReference extends Element = HTMLElement,
  TContainer extends Element = HTMLElement,
>({
  enabled = true,
  trigger = 'hover',
}: HighlighterOptions = {}): Highlighter<TReference, TContainer> {
  const [style, setStyle] = useState<StyleKeyframesDefinition | null>(null);

  const containerRef = useRef<TContainer | null>(null);
  const referenceRef = useRef<TReference | null>(null);

  const flush = useCallback(() => {
    const container = containerRef.current;
    const reference = referenceRef.current;
    if (container && reference && enabled) {
      const containerRect = container.getBoundingClientRect();
      const referenceRect = reference.getBoundingClientRect();
      const nextStyle: MeasuredHighlightStyle = {
        zIndex: 0,
        width: referenceRect.width,
        height: referenceRect.height,
        y: referenceRect.top - containerRect.top,
        x: referenceRect.left - containerRect.left,
      };

      setStyle((current) => {
        if (isSameMeasuredStyle(current, nextStyle)) return current;
        return nextStyle;
      });
    } else {
      setStyle(null);
    }
  }, [enabled]);

  const exit = useCallback(() => {
    referenceRef.current = null;
    setStyle(null);
  }, []);

  const setReference = useCallback(
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
        setReference(instance);

        return () => {
          if (referenceRef.current === instance) exit();
        };
      }

      if (trigger === 'hover') {
        const enter = () => {
          setReference(instance);
        };
        const leave = () => {
          if (referenceRef.current === instance) exit();
        };

        instance.addEventListener('pointerenter', enter);
        instance.addEventListener('pointerleave', leave);

        return () => {
          instance.removeEventListener('pointerenter', enter);
          instance.removeEventListener('pointerleave', leave);
        };
      }

      if (trigger === 'click') {
        const click = () => {
          setReference(instance);
        };

        instance.addEventListener('click', click);

        return () => {
          instance.removeEventListener('click', click);
          if (referenceRef.current === instance) exit();
        };
      }

      const focus = () => {
        setReference(instance);
      };
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
    [exit, setReference, trigger],
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

function isSameMeasuredStyle(
  current: StyleKeyframesDefinition | null,
  next: MeasuredHighlightStyle,
) {
  const measured = current as Partial<MeasuredHighlightStyle> | null;

  return (
    measured?.zIndex === next.zIndex &&
    measured.width === next.width &&
    measured.height === next.height &&
    measured.x === next.x &&
    measured.y === next.y
  );
}

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
            scale: 0,
            opacity: 0,
            ...highlightStyle,
          }}
          animate={{
            scale: 1,
            opacity: 1,
            ...highlightStyle,
          }}
          exit={{
            scale: 0,
            opacity: 0,
            ...highlightStyle,
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
