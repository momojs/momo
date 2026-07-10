'use client';

import type { ReactNode } from 'react';
import { useId } from 'react';

import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { motion } from 'motion/react';

import { useAutoHeight } from '../effects/height';
import { Highlight } from '../effects/highlight';
import { useControllableValue } from '../hooks/use-controllable-value';
import type { ControlOption } from '../shared';
import { cva } from '../tailwind';

const variants = {
  root: cva({
    base: 'grid gap-4 w-full',
    variants: {
      orientation: {
        horizontal: '',
        vertical: 'md:grid-cols-[12rem_minmax(0,1fr)]',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  }),
  list: cva({
    base: 'relative inline-flex rounded-lg border border-momo-border bg-momo-background p-1 shadow-sm',
    variants: {
      orientation: {
        horizontal: 'items-center overflow-x-auto',
        vertical: 'flex-col items-stretch',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  }),
  tab: cva({
    base: 'relative inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-momo-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-ring/45 disabled:cursor-not-allowed disabled:opacity-45 data-[active]:text-momo-foreground [&_svg]:size-4',
    variants: {
      orientation: {
        horizontal: '',
        vertical: 'justify-start',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  }),
  panel: cva({
    base: 'rounded-lg border border-momo-border bg-momo-background p-4 text-sm leading-6 text-momo-foreground shadow-sm outline-none',
  }),
};

export type TabOption<T extends string> = ControlOption<T> & {
  content?: ReactNode;
};

export interface TabsProps<T extends string> {
  value?: T;
  defaultValue?: T;
  options?: TabOption<T>[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  listClassName?: string;
  panelClassName?: string;
  onChange?: (value: T) => void;
}

export function Tabs<T extends string>({
  value,
  defaultValue,
  options = [],
  orientation = 'horizontal',
  className,
  listClassName,
  panelClassName,
  onChange,
}: TabsProps<T>) {
  const id = useId();

  const { target, height } = useAutoHeight();

  const [current, setCurrent] = useControllableValue({
    value,
    defaultValue,
    onChange,
  });

  return (
    <BaseTabs.Root
      value={current}
      orientation={orientation}
      className={variants.root({ orientation, className })}
      onValueChange={(next: T) => {
        setCurrent(next);
      }}
    >
      <BaseTabs.List
        className={variants.list({ orientation, className: listClassName })}
        activateOnFocus
      >
        {options.map(({ icon, value, disabled, style, label, className }) => (
          <BaseTabs.Tab
            key={value}
            value={value}
            style={style}
            disabled={disabled}
            className={variants.tab({ orientation, className })}
          >
            <Highlight
              active={current === value}
              className='bg-momo-accent'
              layoutId={`momo-tabs-indicator-${id}`}
            />
            {icon && (
              <span className='relative z-9 grid place-items-center'>
                {icon}
              </span>
            )}
            <span className='relative z-9'>{label}</span>
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
      <motion.div className='w-full' animate={{ height }}>
        {options.map(({ value, content }) => (
          <BaseTabs.Panel
            key={value}
            value={value}
            render={<div ref={target} />}
            className={variants.panel({ className: panelClassName })}
          >
            {content}
          </BaseTabs.Panel>
        ))}
      </motion.div>
    </BaseTabs.Root>
  );
}
