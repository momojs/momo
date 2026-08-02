'use client';

import type { ComponentProps } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { StyleKeyframesDefinition } from 'motion/react';
import { AnimatePresence, motion } from 'motion/react';

import { useIsMobile } from '../hooks/use-is-mobile.js';
import type { ControlValue } from '../shared/index.js';
import { cx } from '../tailwind/index.js';

export type HighlightTriggerType = 'hover' | 'click' | 'focus';

type MeasuredHighlightStyle = StyleKeyframesDefinition &
  Record<'height' | 'width' | 'x' | 'y' | 'zIndex', number>;

type HighlightLayerOptions = {
  enabled?: boolean;
};

export type HighlightLayer<TReference extends Element = HTMLElement> = {
  clear: (target?: TReference | null) => void;
  flush: () => void;
  setTarget: (target: TReference) => () => void;
  style: StyleKeyframesDefinition | null;
};

export type HighlightRegistrar<TReference extends Element = HTMLElement> = {
  activate: (value: ControlValue) => void;
  clear: () => void;
  register: (value: ControlValue) => React.RefCallback<TReference>;
};

type HighlightTriggerProps<TReference extends Element> = Pick<
  React.HTMLAttributes<TReference>,
  'onBlur' | 'onClick' | 'onFocus' | 'onPointerEnter' | 'onPointerLeave'
>;

export type HighlightTrigger<TReference extends Element = HTMLElement> = {
  getReferenceProps: (
    props?: HighlightTriggerProps<TReference>,
  ) => HighlightTriggerProps<TReference>;
};

export function useHighlightLayer<
  TReference extends Element = HTMLElement,
  TContainer extends Element = HTMLElement,
>(
  containerRef: React.RefObject<TContainer | null>,
  { enabled = true }: HighlightLayerOptions = {},
): HighlightLayer<TReference> {
  const [style, setStyle] = useState<StyleKeyframesDefinition | null>(null);

  const targetRef = useRef<TReference | null>(null);

  const flush = useCallback(() => {
    const container = containerRef.current;
    const target = targetRef.current;
    if (container && target && enabled) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const next: MeasuredHighlightStyle = {
        zIndex: 0,
        width: targetRect.width,
        height: targetRect.height,
        y:
          targetRect.top -
          containerRect.top -
          container.clientTop +
          container.scrollTop,
        x:
          targetRect.left -
          containerRect.left -
          container.clientLeft +
          container.scrollLeft,
      };
      setStyle((prev) => (isSameMeasuredStyle(prev, next) ? prev : next));
    } else {
      setStyle(null);
    }
  }, [containerRef, enabled]);

  const clear = useCallback((target?: TReference | null) => {
    if (target && targetRef.current !== target) return;

    targetRef.current = null;
    setStyle(null);
  }, []);

  const setTarget = useCallback(
    (target: TReference) => {
      targetRef.current = target;
      flush();
      return () => {
        clear(target);
      };
    },
    [clear, flush],
  );

  useEffect(() => {
    if (!enabled) {
      setStyle(null);
      return;
    }
    if (targetRef.current) {
      flush();
    }
  }, [enabled, flush]);

  return {
    clear,
    flush,
    setTarget,
    style,
  };
}

export function useHighlightRegistrar<TReference extends Element = HTMLElement>(
  layer: HighlightLayer<TReference>,
): HighlightRegistrar<TReference> {
  const activeValue = useRef<ControlValue | undefined>(undefined);
  const registerRef = useRef(
    new Map<ControlValue, React.RefCallback<TReference>>(),
  );
  const registry = useRef(new Map<ControlValue, TReference>());
  const { clear: clearLayer, setTarget } = layer;

  const clear = useCallback(() => {
    activeValue.current = undefined;
    clearLayer();
  }, [clearLayer]);

  const register = useCallback(
    (value: ControlValue): React.RefCallback<TReference> => {
      const { current: caches } = registerRef;
      const cached = caches.get(value);
      if (cached) return cached;

      const callback: React.RefCallback<TReference> = (instance) => {
        const { current } = registry;
        if (!instance) {
          const prev = current.get(value);
          current.delete(value);
          if (prev) clearLayer(prev);
          return;
        }

        current.set(value, instance);
        if (activeValue.current === value) {
          setTarget(instance);
        }

        return () => {
          if (current.get(value) === instance) {
            current.delete(value);
          }
          clearLayer(instance);
        };
      };

      caches.set(value, callback);
      return callback;
    },
    [clearLayer, setTarget],
  );

  const activate = useCallback(
    (value: ControlValue) => {
      activeValue.current = value;
      const instance = registry.current.get(value);
      instance ? setTarget(instance) : clearLayer();
    },
    [clearLayer, setTarget],
  );

  return {
    activate,
    clear,
    register,
  };
}

export function useHighlightTrigger<TReference extends Element = HTMLElement>(
  layer: HighlightLayer<TReference>,
  {
    enabled = true,
    trigger = 'hover',
  }: {
    enabled?: boolean;
    trigger?: HighlightTriggerType;
  } = {},
): HighlightTrigger<TReference> {
  const isMobile = useIsMobile();
  const { clear, setTarget } = layer;
  const canTrigger = enabled && (trigger !== 'hover' || !isMobile);

  const getReferenceProps = useCallback(
    (
      props?: HighlightTriggerProps<TReference>,
    ): HighlightTriggerProps<TReference> => {
      if (!canTrigger) {
        return props ?? {};
      }

      if (trigger === 'hover') {
        return {
          ...props,
          onPointerEnter(event) {
            props?.onPointerEnter?.(event);
            setTarget(event.currentTarget);
          },
          onPointerLeave(event) {
            props?.onPointerLeave?.(event);
            clear(event.currentTarget);
          },
        };
      }

      if (trigger === 'click') {
        return {
          ...props,
          onClick(event) {
            props?.onClick?.(event);
            setTarget(event.currentTarget);
          },
        };
      }

      return {
        ...props,
        onFocus(event) {
          props?.onFocus?.(event);
          setTarget(event.currentTarget);
        },
        onBlur(event) {
          props?.onBlur?.(event);
          clear(event.currentTarget);
        },
      };
    },
    [canTrigger, clear, setTarget, trigger],
  );

  return {
    getReferenceProps,
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
          transition={transition}
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
