'use client';

import type { ReactNode } from 'react';
import { useLayoutEffect, useRef } from 'react';

import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { motion } from 'motion/react';

import { useAutoSize } from '../hooks/use-auto-size.js';
import { useControllableValue } from '../hooks/use-controllable-value.js';
import {
  useHighlightLayer,
  useHighlightRegistrar,
  useHighlightTrigger,
} from '../hooks/use-highlight.js';
import { pose, useFeel } from '../motion/index.js';
import type { ControlOption } from '../shared/index.js';
import { cva } from '../tailwind/index.js';
import { Highlight } from './highlight.js';

const {
  Root,
  List,
  Tab,
  Panel, //
} = BaseTabs;

const variants = {
  root: cva({
    base: 'grid w-full gap-momo-md',
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
    base: 'relative inline-flex gap-momo-xxs rounded-momo-lg border border-momo-border-default bg-momo-bg-surface-muted p-momo-xxs shadow-momo-sm',
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
    base: 'relative inline-flex h-9 items-center justify-center gap-momo-xs rounded-momo-md px-momo-sm text-momo-body-sm font-medium text-momo-fg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-ring-focus/45 disabled:cursor-not-allowed disabled:opacity-45 data-[active]:text-momo-fg-default [&_svg]:size-4',
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
  panels: cva({
    base: 'w-full overflow-hidden rounded-momo-lg border border-momo-border-default bg-momo-bg-surface-raised shadow-momo-sm outline-none',
  }),
  panel: cva({
    base: 'whitespace-pre-wrap rounded-momo-lg p-momo-md text-momo-body-sm text-momo-fg-default outline-none',
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

export function Tabs<T extends string>(props: TabsProps<T>) {
  const {
    value,
    className,
    defaultValue,
    listClassName,
    panelClassName,
    options = [],
    orientation = 'horizontal',
    onChange,
    ...rootProps
  } = props;

  const { activate, register, clear, height } = useAutoSize();
  const { mode, spatial } = useFeel('ui');

  const listRef = useRef<HTMLDivElement>(null);
  const hoverLayer = useHighlightLayer<HTMLElement, HTMLDivElement>(listRef);
  const selectLayer = useHighlightLayer<HTMLElement, HTMLDivElement>(listRef);
  const hoverTrigger = useHighlightTrigger(hoverLayer, { trigger: 'hover' });
  const selectRegistrar = useHighlightRegistrar(selectLayer);

  const firstAvailable = options.find((option) => !option.disabled)?.value;
  const [current, setCurrent] = useControllableValue({
    value,
    defaultValue: defaultValue ?? firstAvailable,
    onChange,
  });
  const activateSelect = selectRegistrar.activate;
  const clearSelect = selectRegistrar.clear;
  const activeValue = options.some((option) => option.value === current)
    ? current
    : undefined;

  useLayoutEffect(() => {
    // Options may arrive after mount; keep Base UI controlled from the start.
    if (current === undefined && firstAvailable !== undefined) {
      setCurrent(firstAvailable);
    }
  }, [current, firstAvailable, setCurrent]);

  useLayoutEffect(() => {
    if (activeValue === undefined) {
      clear();
      clearSelect();
    } else {
      activate(activeValue);
      activateSelect(activeValue);
    }
  }, [activeValue, activate, activateSelect, clear, clearSelect]);

  return (
    <Root
      value={current ?? null}
      orientation={orientation}
      className={variants.root({
        className,
        orientation,
      })}
      onValueChange={(value) => {
        // A controlled caller may reject the request. Measure committed selection only.
        setCurrent(value);
      }}
      {...rootProps}
    >
      <List
        activateOnFocus
        ref={listRef}
        className={variants.list({ orientation, className: listClassName })}
      >
        <Highlight
          className='rounded-momo-md bg-momo-bg-surface-raised'
          highlightStyle={hoverLayer.style}
        />
        <Highlight
          className='rounded-momo-md bg-momo-bg-canvas shadow-momo-sm ring-1 ring-momo-border-default'
          highlightStyle={selectLayer.style}
        />
        {options.map(
          ({
            icon,
            value,
            style,
            label,
            disabled,
            className, //
          }) => (
            <Tab
              key={value}
              value={value}
              style={style}
              disabled={disabled}
              ref={selectRegistrar.register(value)}
              {...hoverTrigger.getReferenceProps()}
              className={variants.tab({ orientation, className })}
            >
              {icon && (
                <span className='relative z-9 grid place-items-center'>
                  {icon}
                </span>
              )}
              <span className='relative z-9'>{label}</span>
            </Tab>
          ),
        )}
      </List>
      <div data-slot='tabs-panels' className={variants.panels({})}>
        <motion.div
          data-slot='tabs-height'
          className='overflow-hidden'
          initial={false}
          animate={pose({ height }, mode)}
          transition={spatial}
        >
          {options.map(({ value, content }) => (
            <Panel
              ref={register(value)}
              key={value}
              value={value}
              className={variants.panel({
                className: panelClassName,
              })}
            >
              {content}
            </Panel>
          ))}
        </motion.div>
      </div>
    </Root>
  );
}
