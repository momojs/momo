'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { OmitOf } from '@momots/core';
import { eliminate } from '@momots/core';
import type { VariantProps } from 'cva';
import { isAfter } from 'date-fns';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from 'motion/react';
import type {
  CalendarMonth,
  CalendarWeek,
  DayButton,
  DayPickerProps,
  Locale,
  PropsBase,
  PropsSingle,
} from 'react-day-picker';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { clone, entries, omit } from 'remeda';

import {
  Highlight,
  useHighlighter,
  useHighlighters,
} from '../effects/highlight';
import { usePrevious } from '../hooks';
import { cx } from '../shared';
import { cva } from '../tailwind';

const names = getDefaultClassNames();

const variants = {
  calendar: cva({
    base: [
      'group/calendar bg-momo-bg-canvas p-2 [--cell-radius:var(--momo-radius-md)] [--cell-size:--spacing(7)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent',
      String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
      String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
    ],
  }),
  pager: cva({
    base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-momo-ring-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
    variants: {
      variant: {
        default: 'bg-momo-bg-brand text-momo-fg-on-brand shadow ',
        destructive:
          'bg-momo-bg-danger text-momo-fg-on-danger shadow-sm hover:opacity-90',
        outline:
          'border border-momo-border-input bg-momo-bg-canvas shadow-sm hover:bg-momo-bg-surface hover:text-momo-fg-default',
        secondary:
          'bg-momo-bg-surface-muted text-momo-fg-default shadow-sm hover:opacity-80',
        ghost: 'hover:bg-momo-bg-surface hover:text-momo-fg-default',
        link: 'text-momo-fg-brand underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'ghost',
    },
  }),
  caption: cva({
    base: 'font-medium select-none',
    variants: {
      layout: {
        label: 'cn-calendar-caption text-sm',
        dropdown:
          'cn-calendar-caption-label flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-momo-fg-muted',
      },
    },
    defaultVariants: {
      layout: 'label',
    },
  }),
  cell: cva({
    base: 'group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)',
    variants: {
      showWeekNumber: {
        true: '[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)',
        false:
          '[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)',
      },
    },
    defaultVariants: {
      showWeekNumber: false,
    },
  }),
  button: cva({
    base: 'relative isolate z-10 inline-flex aspect-square size-auto w-full min-w-(--cell-size) flex-col items-center justify-center gap-1 rounded-md border-0 bg-transparent p-0 text-sm font-medium leading-none text-momo-fg-default transition-colors disabled:pointer-events-none disabled:opacity-50 data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-momo-bg-brand data-[range-end=true]:text-momo-fg-on-brand data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-momo-bg-brand data-[range-start=true]:text-momo-fg-on-brand data-[selected-single=true]:bg-momo-bg-brand data-[selected-single=true]:text-momo-fg-on-brand [&>span]:text-xs [&>span]:opacity-70 hover:text-momo-fg-on-brand',
    variants: {
      selected: {
        true: 'text-momo-fg-on-brand',
        false: 'text-momo-fg-default',
      },
    },
    defaultVariants: {
      selected: false,
    },
  }),
};

type PagerVariant = VariantProps<typeof variants.pager>['variant'];

type Variants = {
  cell?: {
    showWeekNumber?: DayPickerProps['showWeekNumber'];
  };
  pager?: {
    variant?: PagerVariant;
  };
  caption?: {
    layout?: DayPickerProps['captionLayout'];
  };
};

const toClsx = ({ caption, cell, pager }: Variants): typeof names => {
  const res = clone(names);
  entries({
    root: cx('w-fit overflow-hidden'),
    months: cx('relative flex flex-col gap-4 md:flex-row'),
    month: cx('flex w-full flex-col gap-4'),
    nav: cx(
      'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
    ),
    button_previous: variants.pager({ variant: pager?.variant }),
    button_next: variants.pager({ variant: pager?.variant }),
    month_caption: cx(
      'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
    ),
    dropdowns: cx(
      'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium',
    ),
    dropdown_root: cx(
      'cn-calendar-dropdown-root relative rounded-(--cell-radius)',
    ),
    dropdown: cx('absolute inset-0 bg-momo-bg-overlay opacity-0'),
    caption_label: variants.caption({
      layout: caption?.layout === 'label' ? 'label' : 'dropdown',
    }),
    month_grid: cx('w-full border-collapse relative'),
    weekdays: cx('flex'),
    weekday: cx(
      'flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-momo-fg-muted select-none',
    ),
    week: cx('mt-2 flex w-full'),
    week_number_header: cx('w-(--cell-size) select-none'),
    week_number: cx('text-[0.8rem] text-momo-fg-muted select-none'),
    day_button: variants.cell({
      showWeekNumber: Boolean(cell?.showWeekNumber),
    }),
    range_start: cx(
      'relative isolate z-0 rounded-l-(--cell-radius) bg-momo-bg-surface-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-momo-bg-surface-muted',
    ),
    range_middle: cx('bg-momo-bg-surface-muted'),
    range_end: cx(
      'relative isolate z-0 rounded-r-(--cell-radius) bg-momo-bg-surface-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-momo-bg-surface-muted',
    ),
    today: cx(
      'rounded-(--cell-radius) bg-momo-bg-surface-muted text-momo-fg-default',
    ),
    outside: cx('text-momo-fg-muted aria-selected:text-momo-fg-muted'),
    disabled: cx('text-momo-fg-muted opacity-50'),
    hidden: cx('invisible'),
  } satisfies Partial<typeof names>).forEach(([key, value]) => {
    res[key] = cx(res[key], value);
  });
  return res;
};

const TableContext = createContext<{
  setHoverCellRef: (cell: HTMLButtonElement | null) => void;
  setSelectedCellRef: (cell: HTMLButtonElement | null) => void;
}>(null!);

const MonthContext = createContext<{
  calendarMonth: CalendarMonth;
  displayIndex: number;
}>(null!);

const today = new Date();

interface CellProps extends React.ComponentProps<typeof DayButton> {
  locale?: Partial<Locale>;
}

function CellButton({
  id,
  day,
  locale,
  modifiers,
  className,
  ...props
}: CellProps) {
  const {
    focused,
    selected,
    range_end,
    range_start,
    range_middle, //
  } = modifiers;

  const ele = useRef<HTMLButtonElement>(null!);

  const { setHoverCellRef, setSelectedCellRef } = useContext(TableContext);

  useEffect(() => {
    return setHoverCellRef(ele.current);
  }, []);

  useEffect(() => {
    if (selected) {
      return setSelectedCellRef(ele.current);
    }
  }, [selected]);

  return (
    <button
      ref={ele}
      type='button'
      data-slot='CalendarCell'
      data-focused={focused}
      data-range-end={range_end}
      data-range-start={range_start}
      data-range-middle={range_middle}
      className={variants.button({ className, selected })}
      {...props}
    />
  );
}

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}

function Table({
  children,
  onAnimationStart,
  onDragStart,
  onDragEnd,
  onDrag,
  ...props
}: TableProps) {
  const {
    calendarMonth, //
  } = useContext(MonthContext);

  const { date: current } = calendarMonth;

  const previous = usePrevious(current);

  const direction = previous ? (isAfter(current, previous) ? 1 : -1) : 0;

  const highlighter = {
    hover: useHighlighter({ trigger: 'hover' }),
    select: useHighlighter({ trigger: 'manual' }),
  };

  const highlighters = useHighlighters(
    highlighter.hover, //
    highlighter.select,
  );

  const setHoverCellRef = useCallback(
    (cell: HTMLButtonElement | null) => {
      highlighter.hover.reference(cell);
    },
    [highlighter.hover.reference],
  );

  const setSelectedCellRef = useCallback(
    (cell: HTMLButtonElement | null) => {
      highlighter.select.reference(cell);
    },
    [highlighter.select.reference],
  );

  return (
    <TableContext.Provider
      value={useMemo(
        () => ({
          setHoverCellRef,
          setSelectedCellRef,
        }),
        [setHoverCellRef, setSelectedCellRef],
      )}
    >
      <AnimatePresence initial={false} custom={direction} mode='popLayout'>
        <motion.table
          ref={highlighters.container}
          key={props['aria-label']}
          custom={direction}
          data-slot='CalendarMonthGrid'
          variants={{
            enter: (direction: number) => ({
              opacity: 1,
              x: `${direction * 200}%`,
            }),
            center: {
              x: 0,
              opacity: 1,
            },
            exit: (direction: number) => ({
              opacity: 1,
              x: `${direction * -200}%`,
            }),
          }}
          initial='enter'
          animate='center'
          exit='exit'
          {...props}
        >
          <Highlight
            className='bg-momo-bg-brand-hover'
            highlightStyle={highlighter.hover.style}
          />
          <Highlight
            className='bg-momo-bg-brand-active'
            highlightStyle={highlighter.select.style}
          />
          {children}
        </motion.table>
      </AnimatePresence>
    </TableContext.Provider>
  );
}

function Month({
  displayIndex,
  calendarMonth,
  ...props
}: {
  calendarMonth: CalendarMonth;
  displayIndex: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <MonthContext.Provider value={{ displayIndex, calendarMonth }}>
      <div data-slot='CalendarMonth' {...props} />
    </MonthContext.Provider>
  );
}

function Chevron({
  className,
  orientation,
  ...props
}: {
  size?: number;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  orientation?: 'up' | 'down' | 'left' | 'right';
}) {
  if (orientation === 'left') {
    return (
      <HugeiconsIcon
        icon={ChevronLeftIcon}
        className={cx('cn-rtl-flip size-4', className)}
        strokeWidth={1.8}
        {...props}
      />
    );
  }

  if (orientation === 'right') {
    return (
      <HugeiconsIcon
        icon={ChevronRightIcon}
        className={cx('cn-rtl-flip size-4', className)}
        strokeWidth={1.8}
        {...props}
      />
    );
  }

  return (
    <HugeiconsIcon
      icon={ChevronDownIcon}
      className={cx('size-4', className)}
      size={16}
      strokeWidth={1.8}
      {...props}
    />
  );
}

function WeekNumber({
  week,
  children,
  ...props
}: {
  week: CalendarWeek;
} & React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td data-slot='CalendarWeekNumber' data-week={week.weekNumber} {...props}>
      <div className='flex size-(--cell-size) items-center justify-center text-center'>
        {children}
      </div>
    </td>
  );
}

function MonthButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      whileTap={eliminate(!reduced && { scale: 0.92 })}
      {...omit(props, MOTION_ATTRS)}
    />
  );
}

export interface CalendarProps
  extends Variants,
    OmitOf<PropsBase & PropsSingle, 'captionLayout' | 'components' | 'mode'> {}

const MOTION_ATTRS = [
  'onDrag',
  'onDragEnd',
  'onDragStart',
  'onAnimationStart',
] as const;

const components: NonNullable<DayPickerProps['components']> = {
  Month,
  Chevron,
  WeekNumber,
  MonthGrid: Table,
  DayButton: CellButton,
  NextMonthButton: MonthButton,
  PreviousMonthButton: MonthButton,
};

export function Calendar({
  cell,
  pager,
  locale,
  caption,
  className,
  classNames,
  formatters,
  showWeekNumber,
  showOutsideDays = true,
  onMonthChange,
  ...props
}: CalendarProps) {
  return (
    <MotionConfig
      transition={{
        bounce: 0.1,
        type: 'spring',
        visualDuration: 0.3,
      }}
    >
      <DayPicker
        mode='single'
        locale={locale}
        selected={today}
        captionLayout={caption?.layout}
        showWeekNumber={showWeekNumber}
        showOutsideDays={showOutsideDays}
        className={variants.calendar({ className })}
        classNames={toClsx({ caption, cell, pager })}
        components={components}
        formatters={{
          formatMonthDropdown: (date) =>
            date.toLocaleString(locale?.code, { month: 'short' }),
          ...formatters,
        }}
        {...props}
      />
    </MotionConfig>
  );
}
