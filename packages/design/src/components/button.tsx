'use client';

import type { VariantProps } from 'cva';
import type { HTMLMotionProps } from 'motion/react';
import { motion } from 'motion/react';

import { cva, cx } from '../tailwind';

const variants = cva({
  variants: {
    variant: {
      default:
        'bg-momo-primary text-momo-primary-foreground shadow-xs hover:bg-momo-primary/90',
      accent:
        'bg-momo-accent text-momo-accent-foreground shadow-xs hover:bg-momo-accent/90',
      destructive:
        'bg-momo-danger text-momo-danger-foreground shadow-xs hover:bg-momo-danger/90 focus-visible:ring-momo-danger/20',
      outline:
        'border border-momo-input bg-momo-background shadow-xs hover:bg-momo-accent hover:text-momo-accent-foreground',
      secondary:
        'bg-momo-secondary text-momo-secondary-foreground shadow-xs hover:bg-momo-secondary/80',
      ghost: 'hover:bg-momo-accent hover:text-momo-accent-foreground',
      link: 'text-momo-primary underline-offset-4 hover:underline',
    },
    size: {
      default: 'h-9 px-4 py-2 has-[>svg]:px-3',
      sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
      lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
      icon: 'size-9',
      'icon-sm': 'size-8 rounded-md',
      'icon-lg': 'size-10 rounded-md',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends HTMLMotionProps<'button'>,
    VariantProps<typeof variants> {}

export function Button({ size, variant, className, ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className={cx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[box-shadow,_color,_background-color,_border-color,_outline-color,_text-decoration-color,_fill,_stroke] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-momo-ring focus-visible:ring-momo-ring/50 focus-visible:ring-[3px] aria-invalid:ring-momo-danger/20 aria-invalid:border-momo-danger",
        variants({ variant, size, className }),
      )}
      {...props}
    />
  );
}
