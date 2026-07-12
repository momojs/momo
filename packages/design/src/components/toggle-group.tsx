'use client';

import { useCallback, useEffect, useImperativeHandle, useRef } from 'react';

import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { compact, eliminate } from '@momots/core';
import type { VariantProps } from 'cva';
import { motion } from 'motion/react';
import { isString } from 'remeda';

import { Highlight, useHighlighter } from '../effects/highlight';
import type { RippleRef } from '../effects/ripples';
import { Ripples } from '../effects/ripples';
import { useControllableValue } from '../hooks/use-controllable-value';
import type { ControlOption } from '../shared';
import { cx } from '../shared';
import { cva } from '../tailwind';

const variants = {
  toggle: cva({
    base: 'relative flex shrink-0 items-center justify-center rounded-md leading-none text-momo-fg-muted transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 data-[pressed]:text-momo-fg-on-brand',
    variants: {
      size: {
        sm: 'h-8 min-w-8 text-xs [&_svg]:size-4',
        md: 'h-9 min-w-9 text-sm [&_svg]:size-4',
        lg: 'h-10 min-w-10 text-sm [&_svg]:size-5',
      },
      variant: {
        button: 'w-full px-2',
        segmented:
          'w-auto px-2.5 font-medium data-[pressed]:text-momo-fg-default',
        tabbar: 'w-full flex-col px-2.5',
      },
    },
    compoundVariants: [
      {
        variant: 'segmented',
        size: 'sm',
        className: 'px-2.5',
      },
      {
        variant: 'segmented',
        size: 'md',
        className: 'px-3',
      },
      {
        variant: 'segmented',
        size: 'lg',
        className: 'px-4',
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
        tabbar: 'grid w-full grid-cols-4 gap-3',
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
  activeRef?: React.Ref<HTMLButtonElement>;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}

function Toggle({
  ref,
  icon,
  style,
  value,
  active,
  activeRef,
  variant,
  disabled,
  children,
  className,
  size = 'md',
  ...rest
}: ToggleProps) {
  const root = useRef<HTMLButtonElement>(null!);

  useImperativeHandle(ref, () => root.current, [ref]);
  useImperativeHandle(activeRef, () => root.current, [activeRef]);

  const ripples = useRef<RippleRef>(null);

  const onTap = (event: PointerEvent) => {
    ripples.current?.call(event);
  };

  return (
    <BaseToggle
      disabled={disabled}
      value={value}
      render={
        <motion.button
          ref={root}
          disabled={disabled}
          whileTap={{ scale: variant === 'segmented' ? 0.97 : 0.9 }}
          whileFocus={{
            boxShadow:
              '0 0 0 2px color-mix(in srgb, var(--momo-ring-focus) 45%, transparent)',
          }}
          className={variants.toggle({ size, variant, className })}
          style={style}
          onTap={variant === 'tabbar' ? onTap : undefined}
          {...rest}
        >
          {icon && <span className='relative z-9'>{icon}</span>}
          <motion.span
            className='relative z-9'
            animate={eliminate(
              variant === 'tabbar' && { fontSize: active ? '1em' : '0em' },
            )}
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
  onChange?: (value: T) => void;
}

export function ToggleGroup<T extends string>({
  value,
  options,
  className,
  defaultValue,
  size = 'md',
  variant = 'button',
  onChange,
}: ToggleGroupProps<T>) {
  const hoverHighlighter = useHighlighter();
  const activeHighlighter = useHighlighter({ trigger: 'manual' });

  const container = useCallback(
    (instance: HTMLElement | null) => {
      hoverHighlighter.container(instance);
      activeHighlighter.container(instance);
    },
    [activeHighlighter.container, hoverHighlighter.container],
  );

  const [
    current,
    setCurrent, //
  ] = useControllableValue({
    value,
    defaultValue,
    onChange,
  });

  useEffect(() => {
    if (current == null) {
      activeHighlighter.exit();
      return;
    }

    activeHighlighter.flush();
  }, [
    activeHighlighter.exit,
    activeHighlighter.flush,
    current,
    options,
    size,
    variant,
  ]);

  const activeHighlightStyle = activeHighlighter.style
    ? {
        ...activeHighlighter.style,
        zIndex: 1,
      }
    : null;

  return (
    <BaseToggleGroup
      ref={container}
      value={compact([current])}
      className={variants.group({ size, variant, className })}
      onValueChange={(value) => {
        setCurrent(value[0] as T);
      }}
    >
      <Highlight
        className='bg-momo-bg-surface'
        highlightStyle={hoverHighlighter.style}
      />
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
            activeRef={
              current === value ? activeHighlighter.reference : undefined
            }
            ref={hoverHighlighter.reference}
            aria-label={textValue ?? (isString(label) ? label : value)}
          >
            {label ?? value}
          </Toggle>
        ),
      )}
    </BaseToggleGroup>
  );
}
