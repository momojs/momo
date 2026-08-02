import { useMemo, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  Coffee02Icon,
  DropletIcon,
  EnergyIcon,
  FireIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Badge, Button } from '@momots/design';
import { Drawer } from '@momots/design/components/drawer';
import { addDays, format, startOfDay } from 'date-fns';

import { formatDate, formatNumber } from '@/helpers/locale';
import { ReadPhoto } from '@/helpers/photo';
import { m } from '@/paraglide/messages.js';
import { stampRallyKeys } from '@/queries/stamp-rally';
import { ListStampRallies } from '@/services';

import { CupCard } from './cup-card';
import { StampForm } from './stamp-form';

export interface DailyProps {
  date: Date;
}

interface MetricProps {
  icon: IconSvgElement;
  label: string;
  tone: string;
  unit: string;
  value: number;
}

function Metric({ icon, label, tone, unit, value }: MetricProps) {
  return (
    <div className='flex min-w-0 flex-col gap-2 rounded-momo-lg bg-momo-bg-surface-muted p-3'>
      <div
        className={`flex size-8 items-center justify-center rounded-full ${tone}`}
      >
        <HugeiconsIcon icon={icon} size={17} strokeWidth={1.8} aria-hidden />
      </div>
      <div>
        <div className='flex min-w-0 items-baseline gap-1'>
          <strong className='truncate text-lg font-semibold tracking-tight tabular-nums text-momo-fg-default'>
            {formatNumber(value, {
              maximumFractionDigits: 1,
            })}
          </strong>
          <span className='truncate text-[0.6875rem] text-momo-fg-muted'>
            {unit}
          </span>
        </div>
        <span className='text-xs text-momo-fg-muted'>{label}</span>
      </div>
    </div>
  );
}

async function loadRecords(from: Date, to: Date) {
  const records = await ListStampRallies(from, to);

  return Promise.all(
    records.map(async (record) => {
      if (!record.photo) return { record, photo: undefined };
      try {
        return { record, photo: await ReadPhoto(record.photo) };
      } catch {
        return { record, photo: undefined };
      }
    }),
  );
}

export function Daily({ date }: DailyProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const deleteStatusIdRef = useRef(0);
  const [deleteStatus, setDeleteStatus] = useState<{
    id: number;
    message: string;
  }>();
  const from = useMemo(() => startOfDay(date), [date]);
  const to = useMemo(() => addDays(from, 1), [from]);
  const defaultConsumedAt = useMemo(() => {
    const now = new Date();
    const selectedDate = new Date(date);
    selectedDate.setHours(
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds(),
    );
    return selectedDate;
  }, [date]);
  const recordsQuery = useQuery({
    queryKey: stampRallyKeys.daily(from),
    queryFn: () => loadRecords(from, to),
  });
  const records = recordsQuery.data ?? [];
  const totals = records.reduce(
    (result, { record }) => ({
      calories: result.calories + record.calories,
      caffeine: result.caffeine + record.caffeine,
      sugar: result.sugar + record.sugar,
    }),
    { calories: 0, caffeine: 0, sugar: 0 },
  );

  const handleRecordDeleted = (cupType: string) => {
    deleteStatusIdRef.current += 1;
    setDeleteStatus({
      id: deleteStatusIdRef.current,
      message: m.record_delete_success({ cupType }),
    });
    requestAnimationFrame(() => addButtonRef.current?.focus());
  };

  return (
    <section className='flex h-full min-h-0 flex-col overflow-hidden px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 text-momo-fg-default'>
      <header className='flex shrink-0 items-end justify-between gap-4 pb-4'>
        <time dateTime={format(date, 'yyyy-MM-dd')}>
          <p className='text-xs font-medium tracking-wide text-momo-fg-muted'>
            {formatDate(date, { year: 'numeric', month: 'long' })}
          </p>
          <div className='mt-1 flex items-baseline gap-2'>
            <span className='text-3xl font-bold tracking-tight'>
              {formatDate(date, { day: 'numeric' })}
            </span>
            <span className='text-sm font-medium text-momo-fg-muted'>
              {formatDate(date, { weekday: 'long' })}
            </span>
          </div>
        </time>
        <Badge variant={records.length > 0 ? 'brand' : 'default'} size='lg'>
          {m.cup_count({ count: records.length })}
        </Badge>
      </header>

      <div
        className='grid shrink-0 grid-cols-3 gap-2'
        aria-label={m.daily_intake_summary()}
      >
        <Metric
          icon={FireIcon}
          label={m.metric_calories()}
          unit='kcal'
          value={totals.calories}
          tone='bg-momo-bg-warning/15 text-momo-fg-warning'
        />
        <Metric
          icon={EnergyIcon}
          label={m.metric_caffeine()}
          unit='mg'
          value={totals.caffeine}
          tone='bg-momo-bg-brand/15 text-momo-fg-brand'
        />
        <Metric
          icon={DropletIcon}
          label={m.metric_sugar()}
          unit='g'
          value={totals.sugar}
          tone='bg-momo-bg-success/15 text-momo-fg-success'
        />
      </div>

      <Drawer
        direction='down'
        title={<span>{m.daily_add_cup()}</span>}
        snapPoints={[1]}
        trigger={
          <Button
            ref={addButtonRef}
            className='mt-3 w-full'
            size='lg'
            variant='default'
          >
            <HugeiconsIcon
              icon={PlusSignIcon}
              size={17}
              strokeWidth={2}
              aria-hidden
            />
            {m.daily_add_cup()}
          </Button>
        }
      >
        <StampForm
          key={from.getTime()}
          className='h-full'
          defaultDate={defaultConsumedAt}
        />
      </Drawer>

      {deleteStatus && (
        <p
          key={deleteStatus.id}
          className='sr-only'
          role='status'
          aria-live='polite'
          aria-atomic='true'
        >
          {deleteStatus.message}
        </p>
      )}

      <div className='mt-5 flex min-h-0 flex-1 flex-col'>
        <div className='flex shrink-0 items-center justify-between pb-3'>
          <h2 className='text-base font-semibold tracking-tight'>
            {m.daily_records()}
          </h2>
          <span className='text-xs tabular-nums text-momo-fg-muted'>
            {m.daily_records_total({ count: records.length })}
          </span>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2'>
          {recordsQuery.isPending ? (
            <div className='grid gap-2' aria-label={m.daily_loading()}>
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className='h-22 animate-pulse rounded-momo-lg bg-momo-bg-surface-muted'
                />
              ))}
            </div>
          ) : recordsQuery.isError ? (
            <div
              className='flex h-full min-h-36 flex-col items-center justify-center gap-3 rounded-momo-lg bg-momo-bg-surface-muted p-5 text-center'
              role='alert'
            >
              <p className='text-sm text-momo-fg-muted'>
                {m.daily_load_failed()}
              </p>
              <Button
                size='sm'
                variant='secondary'
                onTap={() => void recordsQuery.refetch()}
              >
                {m.action_retry()}
              </Button>
            </div>
          ) : records.length === 0 ? (
            <div className='flex h-full min-h-36 flex-col items-center justify-center rounded-momo-lg bg-momo-bg-surface-muted p-5 text-center'>
              <div className='flex size-11 items-center justify-center rounded-full bg-momo-bg-surface text-momo-fg-muted'>
                <HugeiconsIcon
                  icon={Coffee02Icon}
                  size={22}
                  strokeWidth={1.6}
                  aria-hidden
                />
              </div>
              <p className='mt-3 text-sm font-medium'>
                {m.daily_empty_title()}
              </p>
              <p className='mt-1 text-xs text-momo-fg-muted'>
                {m.daily_empty_description()}
              </p>
            </div>
          ) : (
            <div className='grid gap-2'>
              {records.map(({ record, photo }) => (
                <CupCard
                  key={record.id}
                  record={record}
                  photo={photo}
                  onDeleted={handleRecordDeleted}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
