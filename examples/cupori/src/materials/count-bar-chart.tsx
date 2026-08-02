import {
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  isAfter,
  isBefore,
  startOfMonth,
} from 'date-fns';

import type { DrizzleStampRallyTableRow } from '@/databases';
import { formatList } from '@/helpers/locale';
import { m } from '@/paraglide/messages.js';

export interface MonthlyCountBarChartProps {
  date: Date;
  records: readonly DrizzleStampRallyTableRow[];
}

export function MonthlyCountBarChart({
  date,
  records,
}: MonthlyCountBarChartProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const weeks = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 1 },
  ).map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const from = isBefore(weekStart, monthStart) ? monthStart : weekStart;
    const to = isAfter(weekEnd, monthEnd) ? monthEnd : weekEnd;
    const count = records.filter(
      ({ consumedAt }) => consumedAt >= from && consumedAt <= to,
    ).length;

    return {
      count,
      label:
        from.getDate() === to.getDate()
          ? m.chart_day({ day: from.getDate() })
          : m.chart_day_range({
              from: from.getDate(),
              to: to.getDate(),
            }),
    };
  });
  const maximum = Math.max(1, ...weeks.map(({ count }) => count));

  return (
    <figure className='min-w-0' aria-label={m.chart_weekly_aria()}>
      <div className='flex h-40 items-end gap-2 sm:gap-3'>
        {weeks.map(({ count, label }) => (
          <div
            key={label}
            className='flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5'
            aria-label={m.chart_week_aria({ label, count })}
          >
            <span className='text-xs font-medium tabular-nums text-momo-fg-muted'>
              {count}
            </span>
            <div className='flex h-24 w-full max-w-14 items-end overflow-hidden rounded-t-momo-md'>
              <div
                className={
                  count > 0
                    ? 'w-full rounded-t-momo-md bg-momo-bg-brand'
                    : 'h-px w-full bg-momo-border-default'
                }
                style={
                  count > 0
                    ? { height: `${Math.max(12, (count / maximum) * 100)}%` }
                    : undefined
                }
              />
            </div>
            <span className='truncate text-[0.6875rem] text-momo-fg-subtle'>
              {label}
            </span>
          </div>
        ))}
      </div>
      <figcaption className='sr-only'>
        {formatList(
          weeks.map(({ count, label }) => m.chart_week_aria({ label, count })),
        )}
      </figcaption>
    </figure>
  );
}
