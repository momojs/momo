'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import { Select as BaseSelect } from '@base-ui/react/select';
import { ChevronDownIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { VariantProps } from 'cva';
import { AnimatePresence, motion } from 'motion/react';
import { isString } from 'remeda';

import { useControllableValue } from '../hooks/use-controllable-value';
import type { ControlOption } from '../shared';
import { cx } from '../shared';
import { cva } from '../tailwind';

const variants = {
  trigger: cva({
    base: 'inline-flex w-full min-w-0 items-center justify-between gap-1.5 rounded-md border border-momo-border bg-momo-background text-momo-foreground outline-none focus-visible:ring-2 focus-visible:ring-momo-ring/45 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4',
    variants: {
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-9 px-3.5 text-base leading-none',
        lg: 'h-10 px-4 text-sm',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
  popup: cva({
    base: 'overflow-hidden rounded-md border border-momo-border bg-momo-background text-momo-foreground shadow-sm',
  }),
  item: cva({
    base: 'relative flex cursor-pointer select-none items-center gap-2 rounded-sm outline-none transition-colors hover:bg-momo-accent hover:text-momo-accent-foreground data-[highlighted]:bg-momo-muted data-[highlighted]:text-momo-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4',
    variants: {
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-[25px] px-6 text-base leading-none',
        lg: 'h-10 px-4 text-sm',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }),
};

export interface SelectProps<T extends string>
  extends VariantProps<typeof variants.trigger> {
  value?: T;
  defaultValue?: T;
  options?: ControlOption<T>[];
  className?: string;
  triggerClassName?: string;
  popupClassName?: string;
  itemClassName?: string;
  placeholder?: ReactNode;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  onChange?: (value: T) => void;
}

export function Select<T extends string>({
  value,
  defaultValue,
  options = [],
  className,
  triggerClassName,
  popupClassName,
  itemClassName,
  placeholder = 'Select...',
  disabled,
  name,
  required,
  size = 'md',
  onChange,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);

  const [current, setCurrent] = useControllableValue({
    value,
    defaultValue,
    onChange,
  });

  return (
    <BaseSelect.Root
      open={open}
      onOpenChange={setOpen}
      value={current ?? null}
      onValueChange={(next) => {
        if (next != null) setCurrent(next as T);
      }}
      items={options}
      disabled={disabled}
      name={name}
      required={required}
    >
      <BaseSelect.Trigger
        className={variants.trigger({
          size,
          className: triggerClassName ?? className,
        })}
        render={
          <motion.button
            disabled={disabled}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            style={{ willChange: 'transform' }}
          >
            <BaseSelect.Value placeholder={placeholder} />
            <BaseSelect.Icon>
              <HugeiconsIcon
                icon={ChevronDownIcon}
                size={16}
                strokeWidth={1.8}
                aria-hidden
              />
            </BaseSelect.Icon>
          </motion.button>
        }
      />

      <AnimatePresence>
        {open && (
          <BaseSelect.Portal>
            <BaseSelect.Positioner>
              <BaseSelect.Popup
                className={variants.popup({ className: popupClassName })}
                render={
                  <motion.div
                    initial={{
                      opacity: 0,
                      scale: 0.95,
                    }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      willChange: 'transform, opacity',
                    }}
                  >
                    {options.map(
                      ({
                        icon,
                        value,
                        className,
                        style,
                        disabled,
                        textValue,
                        label,
                      }) => (
                        <BaseSelect.Item
                          key={value}
                          value={value}
                          disabled={disabled}
                          label={
                            textValue ?? (isString(label) ? label : undefined)
                          }
                          style={style}
                          className={variants.item({
                            size,
                            className: cx(itemClassName, className),
                          })}
                        >
                          {icon}
                          <BaseSelect.ItemText>
                            {label ?? value}
                          </BaseSelect.ItemText>
                        </BaseSelect.Item>
                      ),
                    )}
                  </motion.div>
                }
              />
            </BaseSelect.Positioner>
          </BaseSelect.Portal>
        )}
      </AnimatePresence>
    </BaseSelect.Root>
  );
}
