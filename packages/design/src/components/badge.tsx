'use client';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { VariantProps } from 'cva';

import { cva } from '../tailwind';

const variants = cva({
  base: 'group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-momo-pill border border-transparent font-momo-body font-medium outline-none transition-[background-color,border-color,color,box-shadow] focus-visible:border-momo-ring-focus focus-visible:ring-[3px] focus-visible:ring-momo-ring-focus/35 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:border-momo-border-danger aria-invalid:ring-[3px] aria-invalid:ring-momo-fg-danger/20 [&>svg]:pointer-events-none [&>svg]:shrink-0',
  variants: {
    variant: {
      default:
        'bg-momo-bg-surface text-momo-fg-default [a&]:hover:bg-momo-bg-surface-muted',
      brand:
        'bg-momo-bg-brand text-momo-fg-on-brand [a&]:hover:bg-momo-bg-brand-hover',
      success:
        'bg-momo-bg-success/15 text-momo-fg-success [a&]:hover:bg-momo-bg-success/20',
      warning:
        'bg-momo-bg-warning/15 text-momo-fg-warning [a&]:hover:bg-momo-bg-warning/20',
      danger:
        'bg-momo-bg-danger/10 text-momo-fg-danger [a&]:hover:bg-momo-bg-danger/15',
      outline:
        'border-momo-border-default bg-transparent text-momo-fg-muted [a&]:hover:bg-momo-bg-surface [a&]:hover:text-momo-fg-default',
    },
    size: {
      sm: 'h-5 gap-1 px-2 text-xs [&>svg]:size-3',
      md: 'h-6 gap-1.5 px-3 text-momo-caption [&>svg]:size-3.5',
      lg: 'h-7 gap-1.5 px-3.5 text-sm [&>svg]:size-4',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

type BadgeVariant = NonNullable<VariantProps<typeof variants>['variant']>;
type BadgeSize = NonNullable<VariantProps<typeof variants>['size']>;

/** State exposed to a custom `render` function and as `data-*` attributes. */
export interface BadgeState {
  slot: 'badge';
  variant: BadgeVariant;
  size: BadgeSize;
}

/** Props for a compact semantic label or status marker. */
export interface BadgeProps
  extends useRender.ComponentProps<'span', BadgeState>,
    VariantProps<typeof variants> {}

/**
 * Renders a themed label as a `span` by default. Use `render` to compose the
 * badge with a semantic element such as an anchor.
 */
export function Badge({
  className,
  variant,
  size,
  render,
  ...props
}: BadgeProps) {
  const resolvedVariant = variant ?? 'default';
  const resolvedSize = size ?? 'md';

  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: variants({
          variant: resolvedVariant,
          size: resolvedSize,
          className,
        }),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant: resolvedVariant,
      size: resolvedSize,
    } satisfies BadgeState,
  });
}
