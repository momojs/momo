'use client';

import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useId,
  useRef,
} from 'react';

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { OmitOf } from '@momots/core';
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
  DayButton,
  DayPickerProps,
  Locale,
  PropsBase,
  PropsSingle,
} from 'react-day-picker';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { clone, entries } from 'remeda';

import { usePrevious } from '../hooks';
import { cx } from '../shared';
import { cva } from '../tailwind';

const names = getDefaultClassNames();

const variants = {
  calendar: cva({
    base: [
      'group/calendar bg-momo-background p-2 [--cell-radius:var(--momo-radius-md)] [--cell-size:--spacing(7)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent',
      String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
      String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
    ],
  }),
  pager: cva({
    base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-momo-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
    variants: {
      variant: {
        default:
          'bg-momo-primary text-momo-primary-foreground shadow hover:bg-momo-primary/90',
        destructive:
          'bg-momo-danger text-momo-danger-foreground shadow-sm hover:bg-momo-danger/90',
        outline:
          'border border-momo-input bg-momo-background shadow-sm hover:bg-momo-accent hover:text-momo-accent-foreground',
        secondary:
          'bg-momo-secondary text-momo-secondary-foreground shadow-sm hover:bg-momo-secondary/80',
        ghost: 'hover:bg-momo-accent hover:text-momo-accent-foreground',
        link: 'text-momo-primary underline-offset-4 hover:underline',
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
          'cn-calendar-caption-label flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-momo-muted-foreground',
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
    base: 'relative isolate z-10 inline-flex aspect-square size-auto w-full min-w-(--cell-size) flex-col items-center justify-center gap-1 rounded-md border-0 bg-transparent p-0 text-sm font-medium leading-none text-momo-foreground transition-colors disabled:pointer-events-none disabled:opacity-50 data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-momo-primary data-[range-end=true]:text-momo-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-momo-muted data-[range-middle=true]:text-momo-foreground data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-momo-primary data-[range-start=true]:text-momo-primary-foreground data-[selected-single=true]:bg-momo-primary data-[selected-single=true]:text-momo-primary-foreground [&>span]:text-xs [&>span]:opacity-70',
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
    dropdown: cx('absolute inset-0 bg-momo-popover opacity-0'),
    caption_label: variants.caption({
      layout: caption?.layout === 'label' ? 'label' : 'dropdown',
    }),
    month_grid: cx('w-full border-collapse'),
    weekdays: cx('flex'),
    weekday: cx(
      'flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-momo-muted-foreground select-none',
    ),
    week: cx('mt-2 flex w-full'),
    week_number_header: cx('w-(--cell-size) select-none'),
    week_number: cx('text-[0.8rem] text-momo-muted-foreground select-none'),
    day: variants.cell({ showWeekNumber: Boolean(cell?.showWeekNumber) }),
    range_start: cx(
      'relative isolate z-0 rounded-l-(--cell-radius) bg-momo-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-momo-muted',
    ),
    range_middle: cx('rounded-none'),
    range_end: cx(
      'relative isolate z-0 rounded-r-(--cell-radius) bg-momo-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-momo-muted',
    ),
    today: cx(
      'rounded-(--cell-radius) bg-momo-muted text-momo-foreground data-[selected=true]:rounded-none',
    ),
    outside: cx(
      'text-momo-muted-foreground aria-selected:text-momo-muted-foreground',
    ),
    disabled: cx('text-momo-muted-foreground opacity-50'),
    hidden: cx('invisible'),
  }).forEach(([key, value]) => {
    res[key] = cx(res[key], value);
  });
  return res;
};

const today = new Date();

interface CellProps extends React.ComponentProps<typeof DayButton> {
  locale?: Partial<Locale>;
}

function Cell({ id, day, locale, modifiers, className, ...props }: CellProps) {
  const ele = useRef<HTMLButtonElement>(null);

  const {
    focused,
    selected,
    range_end,
    range_start,
    range_middle, //
  } = modifiers;

  useEffect(() => {
    const { current } = ele;
    if (focused) current?.focus();
  }, [focused]);

  return (
    <Fragment>
      <button
        ref={ele}
        type='button'
        data-slot='CalendarCell'
        data-day={day.date.toLocaleDateString(locale?.code)}
        data-selected-single={
          selected && !range_end && !range_start && !range_middle
        }
        data-range-end={range_end}
        data-range-start={range_start}
        data-range-middle={range_middle}
        className={variants.button({ className: cx(names.day, className) })}
        {...props}
      />
      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='absolute inset-0 rounded-md bg-momo-primary'
            layoutId={`${id}-selected-cell`}
          />
        )}
      </AnimatePresence>
    </Fragment>
  );
}

const CalendarContext = createContext<{
  calendarMonth: CalendarMonth;
  displayIndex: number;
}>(null!);

function MonthGrid({
  onDrag,
  onDragEnd,
  onDragStart,
  onAnimationStart,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  const {
    date: curr, //
  } = useContext(CalendarContext).calendarMonth;

  const prev = usePrevious(curr);

  const direction = prev ? (isAfter(curr, prev) ? 1 : -1) : 0;

  return (
    <AnimatePresence initial={false} mode='popLayout' custom={direction}>
      <motion.table
        data-slot='CalendarMonthGrid'
        key={props['aria-label']}
        initial={{
          opacity: 1,
          x: direction * 200 + '%',
        }}
        animate={{
          x: 0,
          opacity: 1,
        }}
        exit={{
          opacity: 1,
          x: direction * -200 + '%',
        }}
        {...props}
      />
    </AnimatePresence>
  );
}

export interface CalendarProps
  extends Variants,
    OmitOf<PropsBase & PropsSingle, 'captionLayout' | 'components' | 'mode'> {}

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
  const id = useId();

  const reduced = useReducedMotion();

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
        selected={today}
        showOutsideDays={showOutsideDays}
        showWeekNumber={showWeekNumber}
        className={cx(variants.calendar(), className)}
        captionLayout={caption?.layout}
        locale={locale}
        formatters={{
          formatMonthDropdown: (date) =>
            date.toLocaleString(locale?.code, { month: 'short' }),
          ...formatters,
        }}
        classNames={toClsx({ caption, cell, pager })}
        components={{
          MonthGrid,
          Month: ({
            displayIndex,
            calendarMonth, //
            ...props
          }) => (
            <CalendarContext.Provider
              value={{
                displayIndex,
                calendarMonth, //
              }}
            >
              <div data-slot='CalendarMonth' {...props} />
            </CalendarContext.Provider>
          ),
          PreviousMonthButton: ({
            className,
            onAnimationStart: _onAnimationStart,
            onDrag: _onDrag,
            onDragEnd: _onDragEnd,
            onDragStart: _onDragStart,
            ...props
          }) => {
            return (
              <motion.button
                whileTap={reduced ? undefined : { scale: 0.92 }}
                className={cx(className)}
                {...props}
              />
            );
          },
          NextMonthButton: ({
            className,
            onAnimationStart: _onAnimationStart,
            onDrag: _onDrag,
            onDragEnd: _onDragEnd,
            onDragStart: _onDragStart,
            ...props
          }) => {
            return (
              <motion.button
                whileTap={reduced ? undefined : { scale: 0.92 }}
                className={cx(className)}
                {...props}
              />
            );
          },
          Chevron: ({ className, orientation, ...props }) => {
            if (orientation === 'left') {
              return (
                <HugeiconsIcon
                  icon={ChevronLeftIcon}
                  className={cx('cn-rtl-flip size-4', className)}
                  size={16}
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
                  size={16}
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
          },
          DayButton: (props) => <Cell id={id} locale={locale} {...props} />,
          WeekNumber: ({ children, ...props }) => {
            return (
              <td {...props}>
                <div className='flex size-(--cell-size) items-center justify-center text-center'>
                  {children}
                </div>
              </td>
            );
          },
        }}
        {...props}
      />
    </MotionConfig>
  );
}
