'use client';

import type { InputState as BaseInputState } from '@base-ui/react/input';
import { Input as BaseInput } from '@base-ui/react/input';
import type { VariantProps } from 'cva';

import { asClass } from '../shared';
import { cva } from '../tailwind';

const variants = cva({
  base: 'w-full min-w-0 rounded-momo-md border border-momo-border-input bg-momo-bg-canvas font-momo-body text-momo-fg-default outline-none transition-[background-color,border-color,box-shadow,color,opacity] selection:bg-momo-bg-brand selection:text-momo-fg-on-brand file:me-3 file:inline-flex file:h-full file:border-0 file:bg-transparent file:font-momo-body file:font-medium file:text-inherit placeholder:text-momo-fg-subtle focus-visible:border-momo-ring-focus focus-visible:ring-[3px] focus-visible:ring-momo-ring-focus/35 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-momo-bg-surface-muted disabled:text-momo-fg-muted disabled:opacity-60 read-only:cursor-default read-only:bg-momo-bg-surface-muted/50 data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:bg-momo-bg-surface-muted data-[disabled]:text-momo-fg-muted data-[disabled]:opacity-60 data-[invalid]:border-momo-border-danger data-[invalid]:ring-[3px] data-[invalid]:ring-momo-fg-danger/20 aria-invalid:border-momo-border-danger aria-invalid:ring-[3px] aria-invalid:ring-momo-fg-danger/20',
  variants: {
    size: {
      sm: 'h-8 px-2.5 text-momo-body-sm any-pointer-coarse:text-base',
      md: 'h-9 px-3 text-momo-body-sm any-pointer-coarse:text-base',
      lg: 'h-10 px-3.5 text-momo-body-md',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

type BaseInputProps = React.ComponentProps<typeof BaseInput>;

/** Props for the themed Base UI input control. */
export interface InputProps
  extends Omit<BaseInputProps, 'className' | 'size'>,
    VariantProps<typeof variants> {
  /**
   * Additional classes, or a function that derives classes from Base UI's
   * disabled, validity, filled, dirty, touched, and focused state.
   */
  className?: BaseInputProps['className'];
  /** Native HTML character-width hint. Prefer CSS width for layout. */
  nativeSize?: BaseInputProps['size'];
}

/**
 * Renders a native input with momo semantic styles while preserving Base UI's
 * controlled value, Field integration, render composition, and ref behavior.
 *
 * Provide an accessible name with a native `label` or Base UI `Field`.
 *
 * @example
 * ```tsx
 * <label>
 *   Workspace name
 *   <Input value={name} onValueChange={setName} />
 * </label>
 * ```
 */
export function Input({
  className,
  nativeSize,
  size,
  type,
  ...props
}: InputProps) {
  const resolvedSize = size ?? 'md';

  return (
    <BaseInput
      type={type}
      size={nativeSize}
      data-slot='input'
      data-size={resolvedSize}
      className={asClass<BaseInputState>(
        variants({ size: resolvedSize }),
        className,
      )}
      {...props}
    />
  );
}
