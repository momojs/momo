'use client';

import { useState } from 'react';

import { useSiteTranslations } from '@/lib/site-translations';

import { Accordion } from '../../../packages/design/src/components/accordion';
import { Slider } from '../../../packages/design/src/components/slider';
import { ToggleGroup } from '../../../packages/design/src/components/toggle-group';

type Period = 'day' | 'week' | 'month';

const periodLabels: Record<Period, string> = {
  day: '每天',
  week: '每周',
  month: '每月',
};

const periods = (Object.entries(periodLabels) as [Period, string][]).map(
  ([value, label]) => ({
    value,
    label,
    textValue: label,
    className: 'min-w-0 flex-1 px-2!',
  }),
);

export function HomeDesignDemo() {
  const t = useSiteTranslations();
  const [period, setPeriod] = useState<Period>('week');
  const [minutes, setMinutes] = useState(25);

  return (
    <section
      aria-label={t('momo Design 提醒设置演示')}
      className='flex min-h-88 w-full flex-col gap-3 rounded-xl border border-fd-border bg-fd-background/70 p-4'
    >
      <Accordion
        defaultValue={['reminder']}
        className='min-w-0! max-w-none shadow-none'
        options={[
          {
            value: 'reminder',
            label: (
              <span className='flex flex-col gap-1 py-1'>
                <span className='font-semibold'>{t('提醒设置')}</span>
                <span className='text-xs font-normal leading-5 text-fd-muted-foreground'>
                  {t(periodLabels[period])}
                  {t('提醒 · 提前')} {minutes}
                  {t('分钟')}
                </span>
              </span>
            ),
            content: (
              <div className='grid gap-4 border-t border-fd-border pt-4'>
                <div
                  className='grid gap-2'
                  role='group'
                  aria-label={t('提醒频率')}
                >
                  <p className='text-xs text-fd-muted-foreground'>
                    {t('提醒频率')}
                  </p>
                  <ToggleGroup<Period>
                    variant='segmented'
                    value={period}
                    options={periods.map((option) => ({
                      ...option,
                      label: t(option.label),
                      textValue: t(option.textValue),
                    }))}
                    className='w-full shadow-none'
                    onChange={(next) => {
                      if (next) setPeriod(next);
                    }}
                  />
                </div>
                <div className='grid gap-2'>
                  <p className='text-xs text-fd-muted-foreground'>
                    {t('提前时间')}
                  </p>
                  <Slider
                    label={t('提前')}
                    aria-label={t('提前时间')}
                    min={5}
                    max={60}
                    step={5}
                    value={minutes}
                    formatValue={(value) => t('{0} 分钟', value)}
                    onValueChange={setMinutes}
                  />
                </div>
              </div>
            ),
          },
        ]}
      />
      <p className='mt-auto text-xs leading-6 text-fd-muted-foreground'>
        {t('点击标题展开或收起，当前选择会保留。')}
      </p>
    </section>
  );
}
