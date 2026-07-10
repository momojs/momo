'use client';

import type { ReactNode } from 'react';

import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { ControlSize } from '../shared';
import { cx } from '../shared';

const rootSizeClasses: Record<ControlSize, string> = {
  sm: 'h-6 w-11',
  md: 'h-7 w-12',
  lg: 'h-8 w-14',
};

const thumbSizeClasses: Record<ControlSize, string> = {
  sm: 'size-5 data-[checked]:translate-x-5',
  md: 'size-6 data-[checked]:translate-x-5',
  lg: 'size-7 data-[checked]:translate-x-6',
};

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  size?: ControlSize;
  name?: string;
  value?: string;
  className?: string;
  onChange?: (checked: boolean) => void;
}

export function Switch({
  checked,
  defaultChecked,
  disabled,
  label,
  description,
  size = 'md',
  name,
  value,
  className,
  onChange,
}: SwitchProps) {
  const control = (
    <BaseSwitch.Root
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      name={name}
      value={value}
      onCheckedChange={onChange}
      className={cx(
        'group inline-flex shrink-0 cursor-pointer items-center rounded-full border border-momo-input bg-momo-muted p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-ring/45 data-[checked]:border-momo-primary data-[checked]:bg-momo-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        rootSizeClasses[size],
        className,
      )}
    >
      <BaseSwitch.Thumb
        className={cx(
          'grid place-items-center rounded-full bg-momo-background text-momo-muted-foreground shadow-sm ring-1 ring-momo-border transition-transform data-[checked]:text-momo-primary',
          thumbSizeClasses[size],
        )}
      >
        <span className='grid place-items-center'>
          <HugeiconsIcon
            icon={Sun03Icon}
            size={size === 'lg' ? 16 : 14}
            strokeWidth={1.8}
            className='col-start-1 row-start-1 opacity-100 transition-opacity group-data-[checked]:opacity-0'
            aria-hidden
          />
          <HugeiconsIcon
            icon={Moon02Icon}
            size={size === 'lg' ? 16 : 14}
            strokeWidth={1.8}
            className='col-start-1 row-start-1 opacity-0 transition-opacity group-data-[checked]:opacity-100'
            aria-hidden
          />
        </span>
      </BaseSwitch.Thumb>
    </BaseSwitch.Root>
  );

  if (!label && !description) return control;

  return (
    <label className='inline-flex items-center gap-3 text-sm text-momo-foreground'>
      {control}
      <span className='grid gap-0.5'>
        {label && <span className='font-medium leading-none'>{label}</span>}
        {description && (
          <span className='text-xs leading-5 text-momo-muted-foreground'>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
