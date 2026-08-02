import { Coffee02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { TweenNumber } from '@momots/design/components/tween-number';

import type { DrizzleStampRallyTableRow } from '@/databases';
import { formatList } from '@/helpers/locale';
import { m } from '@/paraglide/messages.js';

const BRAND_COLORS = [
  'var(--momo-bg-brand)',
  'var(--momo-bg-success)',
  'var(--momo-bg-warning)',
  'var(--momo-fg-muted)',
  'var(--momo-bg-overlay)',
] as const;

export interface BrandSharePieChartProps {
  records: readonly DrizzleStampRallyTableRow[];
}

function getBrandShares(records: readonly DrizzleStampRallyTableRow[]) {
  const counts = new Map<string, number>();

  for (const record of records) {
    const brand = record.brand?.trim() || m.unknown_brand();
    counts.set(brand, (counts.get(brand) ?? 0) + 1);
  }

  const sorted = [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const visible = sorted.slice(0, 4);
  const remaining = sorted
    .slice(4)
    .reduce((total, item) => total + item.count, 0);

  if (remaining > 0) {
    visible.push({ label: m.brand_other(), count: remaining });
  }

  return visible.map((item, index) => ({
    ...item,
    color: BRAND_COLORS[index],
    percentage: (item.count / records.length) * 100,
  }));
}

export function BrandSharePieChart({ records }: BrandSharePieChartProps) {
  if (records.length === 0) {
    return (
      <div className='flex min-h-40 flex-col items-center justify-center text-center'>
        <div className='flex size-11 items-center justify-center rounded-full bg-momo-bg-surface text-momo-fg-muted'>
          <HugeiconsIcon
            icon={Coffee02Icon}
            size={22}
            strokeWidth={1.6}
            aria-hidden
          />
        </div>
        <p className='mt-3 text-sm font-medium text-momo-fg-default'>
          {m.chart_no_brand()}
        </p>
        <p className='mt-1 text-xs text-momo-fg-muted'>
          {m.chart_no_brand_description()}
        </p>
      </div>
    );
  }

  const shares = getBrandShares(records);
  let offset = 0;
  const gradient = `conic-gradient(${shares
    .map(({ color, percentage }) => {
      const start = offset;
      offset += percentage;
      return `${color} ${start}% ${offset}%`;
    })
    .join(', ')})`;

  return (
    <div className='grid min-h-40 grid-cols-[auto_minmax(0,1fr)] items-center gap-4'>
      <div
        className='relative size-28 shrink-0 rounded-full sm:size-32'
        style={{ background: gradient }}
        role='img'
        aria-label={formatList(
          shares.map(({ count, label, percentage }) =>
            m.chart_brand_share_aria({
              brand: label,
              count,
              percentage: percentage.toFixed(0),
            }),
          ),
        )}
      >
        <div className='absolute inset-4 flex flex-col items-center justify-center rounded-full bg-momo-bg-surface-muted'>
          <strong className='text-2xl font-semibold tracking-tight tabular-nums text-momo-fg-default'>
            <TweenNumber value={records.length} duration={0.35} />
          </strong>
          <span className='text-xs text-momo-fg-muted'>{m.unit_cup()}</span>
        </div>
      </div>

      <ul className='grid min-w-0 gap-2' aria-label={m.chart_brand_breakdown()}>
        {shares.map(({ color, count, label, percentage }) => (
          <li key={label} className='flex min-w-0 items-center gap-2.5'>
            <span
              className='size-2.5 shrink-0 rounded-full'
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <div className='min-w-0 flex-1'>
              <p className='truncate text-xs font-medium text-momo-fg-default'>
                {label}
              </p>
              <p className='text-[0.6875rem] tabular-nums text-momo-fg-muted'>
                {m.chart_brand_detail({
                  count,
                  percentage: percentage.toFixed(0),
                })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
