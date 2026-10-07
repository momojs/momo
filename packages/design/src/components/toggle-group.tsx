'use client';

import { useEffect, useImperativeHandle, useRef } from 'react';

import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { compact, eliminate } from '@momots/core';
import type { VariantProps } from 'cva';
import { motion } from 'motion/react';
import { isString } from 'remeda';

import {
  Highlight,
  useHighlightLayer,
  useHighlightRegistrar,
  useHighlightTrigger,
} from '../effects/highlight.js';
import type { RippleRef } from '../effects/ripples.js';
import { Ripples } from '../effects/ripples.js';
import { useControllableValue } from '../hooks/use-controllable-value.js';
import { pose, useFeel } from '../motion/index.js';
import type { ControlOption } from '../shared/index.js';
import { cva, cx } from '../tailwind/index.js';

const variants = {
  toggle: cva({
    base: 'relative flex shrink-0 items-center justify-center rounded-md leading-none text-momo-fg-muted transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 data-pressed:text-momo-fg-on-brand',
    variants: {
      size: {
        sm: 'h-8 min-w-8 text-xs [&_svg]:size-4',
        md: 'h-9 min-w-9 text-sm [&_svg]:size-4',
        lg: 'h-10 min-w-10 text-sm [&_svg]:size-5',
      },
      variant: {
        button: 'w-full px-2',
        segmented:
          'w-auto px-2.5 font-medium data-pressed:text-momo-fg-default',
        tabbar: 'w-full flex-col p-2.5',
      },
    },
    compoundVariants: [
      {
        size: 'sm',
        variant: 'segmented',
        className: 'px-2.5',
      },
      {
        size: 'md',
        variant: 'segmented',
        className: 'px-3',
      },
      {
        size: 'lg',
        variant: 'segmented',
        className: 'px-4',
      },
      {
        size: 'sm',
        variant: 'tabbar',
        className: 'h-13',
      },
      {
        size: 'md',
        variant: 'tabbar',
        className: 'h-14',
      },
      {
        size: 'lg',
        variant: 'tabbar',
        className: 'h-15',
      },
    ],
    defaultVariants: {
      variant: 'button',
      size: 'md',
    },
  }),
  group: cva({
    base: 'relative',
    variants: {
      size: {
        sm: '',
        md: '',
        lg: '',
      },
      variant: {
        button: 'grid w-full grid-cols-2 gap-3',
        segmented:
          'inline-flex w-fit rounded-lg border border-momo-border-default bg-momo-bg-surface-muted p-1 shadow-sm',
        tabbar: 'grid w-full grid-cols-4 gap-3 overflow-hidden',
      },
    },
    defaultVariants: {
      variant: 'button',
      size: 'md',
    },
  }),
};

interface ToggleProps
  extends VariantProps<typeof variants.toggle>,
    React.ComponentProps<typeof motion.button> {
  value: string;
  active?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}

const FOCUS_BOX_SHADOW =
  '0 0 0 2px color-mix(in srgb, var(--momo-ring-focus) 45%, transparent)';

function Toggle({
  ref,
  icon,
  style,
  value,
  active,
  variant,
  disabled,
  children,
  className,
  size = 'md',
  ...rest
}: ToggleProps) {
  const { reduced, mode, transition, spatial } = useFeel('snap');
  const root = useRef<HTMLButtonElement>(null!);

  useImperativeHandle(ref, () => root.current, [ref]);

  const ripples = useRef<RippleRef>(null);

  const onTap = (event: PointerEvent) => {
    if (variant === 'tabbar') {
      ripples.current?.call(event);
    }
  };

  return (
    <BaseToggle
      disabled={disabled}
      value={value}
      render={
        <motion.button
          ref={root}
          disabled={disabled}
          whileTap={
            reduced
              ? undefined
              : { scale: variant === 'segmented' ? 0.97 : 0.9 }
          }
          transition={transition}
          whileFocus={eliminate(
            variant === 'button' && { boxShadow: FOCUS_BOX_SHADOW },
          )}
          className={variants.toggle({ size, variant, className })}
          style={style}
          onTap={onTap}
          {...rest}
          {...(reduced && { whileTap: undefined, transition })}
        >
          {icon && <span className='relative z-9'>{icon}</span>}
          <motion.span
            className='relative z-9'
            initial={{
              fontSize: variant === 'tabbar' ? '0em' : '1em',
            }}
            animate={
              variant === 'tabbar'
                ? pose(
                    { fontSize: active ? '1em' : '0em' },
                    mode,
                  )
                : undefined
            }
            transition={spatial}
          >
            {children}
          </motion.span>
          {variant === 'tabbar' && <Ripples ref={ripples} />}
        </motion.button>
      }
    />
  );
}

export interface ToggleGroupProps<T extends string>
  extends VariantProps<typeof variants.group> {
  value?: T;
  defaultValue?: T;
  className?: string;
  options?: ControlOption<T>[];
  onChange?: (value: T | undefined) => void;
}

export function ToggleGroup<T extends string>(props: ToggleGroupProps<T>) {
  const {
    value,
    options,
    className,
    defaultValue,
    size = 'md',
    variant = 'button',
    onChange,
  } = props;
  const hasHoverHighlight = variant === 'button' || variant === 'segmented';

  const containerRef = useRef<HTMLDivElement>(null);
  const hoverLayer = useHighlightLayer<HTMLButtonElement, HTMLDivElement>(
    containerRef,
    { enabled: hasHoverHighlight },
  );
  const activeLayer = useHighlightLayer<HTMLButtonElement, HTMLDivElement>(
    containerRef,
  );
  const hoverTrigger = useHighlightTrigger(hoverLayer, {
    enabled: hasHoverHighlight,
    trigger: 'hover',
  });
  const activeRegistrar = useHighlightRegistrar(activeLayer);

  const [
    current,
    setCurrent, //
  ] = useControllableValue({
    controlled: Object.hasOwn(props, 'value'),
    value,
    defaultValue,
    onChange,
  });

  useEffect(() => {
    if (!hasHoverHighlight) {
      hoverLayer.clear();
    }
  }, [hasHoverHighlight, hoverLayer.clear]);

  useEffect(() => {
    if (current == null) {
      activeRegistrar.clear();
      return;
    }

    activeRegistrar.activate(current);
  }, [
    activeRegistrar.activate,
    activeRegistrar.clear,
    current,
    options,
    size,
    variant,
  ]);

  const activeHighlightStyle = activeLayer.style
    ? {
        ...activeLayer.style,
        zIndex: 1,
      }
    : null;

  return (
    <BaseToggleGroup
      ref={containerRef}
      value={compact([current])}
      className={variants.group({ size, variant, className })}
      onValueChange={(value) => {
        setCurrent(value[0]);
      }}
    >
      {hasHoverHighlight && (
        <Highlight
          className={
            variant === 'segmented'
              ? 'bg-momo-bg-surface-raised'
              : 'bg-momo-bg-surface'
          }
          highlightStyle={hoverLayer.style}
        />
      )}
      <Highlight
        className={
          variant === 'segmented'
            ? 'bg-momo-bg-canvas shadow-sm ring-1 ring-momo-border-default'
            : 'bg-momo-bg-brand'
        }
        highlightStyle={activeHighlightStyle}
      />
      {options?.map(
        ({ icon, value, className, style, disabled, textValue, label }) => (
          <Toggle
            key={value}
            icon={icon}
            size={size}
            value={value}
            style={style}
            variant={variant}
            disabled={disabled}
            className={cx(className, 'z-1')}
            active={current === value}
            ref={activeRegistrar.register(value)}
            {...hoverTrigger.getReferenceProps()}
            aria-label={textValue ?? (isString(label) ? label : value)}
          >
            {label ?? value}
          </Toggle>
        ),
      )}
    </BaseToggleGroup>
  );
}
