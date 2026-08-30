import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import {
  AlertCircleIcon,
  CalendarCheckIn01Icon,
  DropletIcon,
  EnergyIcon,
  FireIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Badge, Button, cx } from '@momots/design';
import type { TweenNumberProps } from '@momots/design/components/tween-number';
import { TweenNumber } from '@momots/design/components/tween-number';
import {
  addMonths,
  format,
  getDaysInMonth,
  isSameMonth,
  startOfMonth,
} from 'date-fns';

import { Page } from '@/components/page';
import { formatDate, formatNumber } from '@/helpers/locale';
import { BrandSharePieChart } from '@/materials/brand-share-pie-chart';
import { MonthlyCountBarChart } from '@/materials/count-bar-chart';
import { m } from '@/paraglide/messages.js';
import { stampRallyKeys } from '@/queries/stamp-rally';
import { ListStampRallies } from '@/services';
import { useDashboardPageStore } from '@/stores/page';

export const Route = createFileRoute('/_tabbar/dashboard')({
  component: DashboardRoute,
});

interface MetricCardProps {
  className?: string;
  detail: string;
  featured?: boolean;
  format?: TweenNumberProps['format'];
  icon: IconSvgElement;
  label: string;
  prefix?: string;
  tone?: string;
  unit?: string;
  value: number;
}

function MetricCard({
  className,
  detail,
  featured = false,
  format: numberFormat,
  icon,
  label,
  prefix,
  tone = 'bg-momo-bg-surface text-momo-fg-muted',
  unit,
  value,
}: MetricCardProps) {
  return (
    <article
      className={cx(
        'flex min-h-31 flex-col justify-between rounded-momo-lg p-4',
        featured
          ? 'bg-momo-bg-brand text-momo-fg-on-brand'
          : 'bg-momo-bg-surface-muted text-momo-fg-default',
        className,
      )}
    >
      <div className='flex items-center justify-between gap-3'>
        <span
          className={cx(
            'flex size-9 items-center justify-center rounded-full',
            featured ? 'bg-white/15 text-momo-fg-on-brand' : tone,
          )}
        >
          <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} aria-hidden />
        </span>
        <span
          className={cx(
            'text-xs font-medium',
            featured ? 'text-momo-fg-on-brand/80' : 'text-momo-fg-muted',
          )}
        >
          {label}
        </span>
      </div>

      <div className='mt-4'>
        <div className='flex items-baseline gap-1'>
          {prefix && (
            <span className='text-lg font-medium opacity-80'>{prefix}</span>
          )}
          <strong className='text-3xl font-semibold tracking-tight tabular-nums'>
            <TweenNumber value={value} duration={0.35} format={numberFormat} />
          </strong>
          {unit && <span className='text-xs opacity-70'>{unit}</span>}
        </div>
        <p
          className={cx(
            'mt-1 text-xs tabular-nums',
            featured ? 'text-momo-fg-on-brand/75' : 'text-momo-fg-muted',
          )}
        >
          {detail}
        </p>
      </div>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div
      className='mx-auto grid w-full max-w-6xl gap-3 px-3 pb-6'
      aria-label={m.dashboard_loading()}
    >
      <div className='h-6 w-36 animate-pulse rounded-momo-pill bg-momo-bg-surface-muted motion-reduce:animate-none' />
      <div className='grid grid-cols-2 gap-2 lg:grid-cols-5'>
        {[0, 1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className={cx(
              'h-31 animate-pulse rounded-momo-lg bg-momo-bg-surface-muted motion-reduce:animate-none',
              item === 0 && 'col-span-2 lg:col-span-1',
            )}
          />
        ))}
      </div>
      <div className='grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]'>
        {[0, 1].map((item) => (
          <div
            key={item}
            className='h-58 animate-pulse rounded-momo-lg bg-momo-bg-surface-muted motion-reduce:animate-none'
          />
        ))}
      </div>
    </div>
  );
}

function DashboardRoute() {
  const { date } = useDashboardPageStore();
  const range = useMemo(() => {
    const from = startOfMonth(date);
    return { from, to: addMonths(from, 1) };
  }, [date]);
  const recordsQuery = useQuery({
    queryKey: stampRallyKeys.dashboard(range.from),
    queryFn: () => ListStampRallies(range.from, range.to),
  });

  if (recordsQuery.isPending) {
    return (
      <Page className='pt-1'>
        <DashboardSkeleton />
      </Page>
    );
  }

  if (recordsQuery.isError) {
    return (
      <Page className='p-3'>
        <div
          className='mx-auto flex min-h-64 w-full max-w-6xl flex-col items-center justify-center rounded-momo-lg bg-momo-bg-surface-muted p-6 text-center'
          role='alert'
        >
          <div className='flex size-12 items-center justify-center rounded-full bg-momo-bg-danger/10 text-momo-fg-danger'>
            <HugeiconsIcon
              icon={AlertCircleIcon}
              size={24}
              strokeWidth={1.7}
              aria-hidden
            />
          </div>
          <p className='mt-4 text-sm font-medium text-momo-fg-default'>
            {m.dashboard_load_failed()}
          </p>
          <p className='mt-1 text-xs text-momo-fg-muted'>
            {m.dashboard_load_description()}
          </p>
          <Button
            className='mt-4'
            size='sm'
            variant='secondary'
            onTap={() => void recordsQuery.refetch()}
          >
            {m.action_retry()}
          </Button>
        </div>
      </Page>
    );
  }

  const records = recordsQuery.data;
  const total = records.reduce(
    (result, record) => ({
      price: result.price + record.price,
      calories: result.calories + record.calories,
      caffeine: result.caffeine + record.caffeine,
      sugar: result.sugar + record.sugar,
    }),
    { price: 0, calories: 0, caffeine: 0, sugar: 0 },
  );
  const activeDays = new Set(
    records.map(({ consumedAt }) => format(consumedAt, 'yyyy-MM-dd')),
  ).size;
  const averageDays = isSameMonth(date, new Date())
    ? new Date().getDate()
    : getDaysInMonth(date);
  const averagePrice = records.length > 0 ? total.price / records.length : 0;

  return (
    <Page className='px-3 pb-6 pt-1 text-momo-fg-default'>
      <div className='mx-auto grid w-full max-w-6xl gap-3'>
        <section aria-labelledby='monthly-overview-title'>
          <div className='mb-2 flex items-center justify-between gap-3'>
            <h2
              id='monthly-overview-title'
              className='text-base font-semibold tracking-tight'
            >
              {m.dashboard_monthly_overview()}
            </h2>
            <Badge variant={records.length > 0 ? 'success' : 'default'}>
              {formatDate(date, { year: 'numeric', month: 'long' })}
            </Badge>
          </div>

          <div className='grid grid-cols-2 gap-2 lg:grid-cols-5'>
            <MetricCard
              className='col-span-2 lg:col-span-1'
              featured
              icon={CalendarCheckIn01Icon}
              label={m.dashboard_check_in_cups()}
              value={records.length}
              unit={m.unit_cup()}
              detail={m.dashboard_active_days({ count: activeDays })}
            />
            <MetricCard
              icon={Wallet01Icon}
              label={m.dashboard_monthly_spend()}
              value={total.price}
              prefix='¥'
              format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
              detail={
                records.length > 0
                  ? m.dashboard_average_per_cup({
                      price: formatNumber(averagePrice, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                    })
                  : m.dashboard_no_spend()
              }
              tone='bg-momo-bg-warning/15 text-momo-fg-warning'
            />
            <MetricCard
              icon={FireIcon}
              label={m.metric_calories()}
              value={total.calories}
              unit='kcal'
              format={{ maximumFractionDigits: 1 }}
              detail={m.dashboard_daily_average({
                value: formatNumber(total.calories / averageDays, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }),
                unit: 'kcal',
              })}
              tone='bg-momo-bg-warning/15 text-momo-fg-warning'
            />
            <MetricCard
              icon={EnergyIcon}
              label={m.metric_caffeine()}
              value={total.caffeine}
              unit='mg'
              format={{ maximumFractionDigits: 1 }}
              detail={m.dashboard_daily_average({
                value: formatNumber(total.caffeine / averageDays, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }),
                unit: 'mg',
              })}
              tone='bg-momo-bg-brand/15 text-momo-fg-brand'
            />
            <MetricCard
              icon={DropletIcon}
              label={m.metric_sugar()}
              value={total.sugar}
              unit='g'
              format={{ maximumFractionDigits: 1 }}
              detail={m.dashboard_daily_average({
                value: formatNumber(total.sugar / averageDays, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }),
                unit: 'g',
              })}
              tone='bg-momo-bg-success/15 text-momo-fg-success'
            />
          </div>
        </section>

        <div className='grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]'>
          <section
            className='rounded-momo-lg bg-momo-bg-surface-muted p-4'
            aria-labelledby='monthly-trend-title'
          >
            <div className='mb-2 flex items-start justify-between gap-4'>
              <div>
                <h2
                  id='monthly-trend-title'
                  className='text-base font-semibold tracking-tight'
                >
                  {m.dashboard_check_in_trend()}
                </h2>
                <p className='mt-0.5 text-xs text-momo-fg-muted'>
                  {m.dashboard_trend_description()}
                </p>
              </div>
              <Badge variant='outline'>
                {m.dashboard_recorded_days({ count: activeDays })}
              </Badge>
            </div>
            <MonthlyCountBarChart date={date} records={records} />
          </section>

          <section
            className='rounded-momo-lg bg-momo-bg-surface-muted p-4'
            aria-labelledby='brand-share-title'
          >
            <div className='mb-2'>
              <h2
                id='brand-share-title'
                className='text-base font-semibold tracking-tight'
              >
                {m.dashboard_brand_preference()}
              </h2>
              <p className='mt-0.5 text-xs text-momo-fg-muted'>
                {m.dashboard_by_cup_count()}
              </p>
            </div>
            <BrandSharePieChart records={records} />
          </section>
        </div>
      </div>
    </Page>
  );
}
