'use client';

import type { ComponentProps } from 'react';
import { useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import { TweenNumber } from '../../../../../packages/design/src/components/tween-number';
import {
  CheckboxControl,
  NumberControl,
  PlaygroundFrame,
  SelectControl,
} from './shared';

const numberFormatOptions = [
  { value: 'integer', label: 'Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'currency', label: 'Currency' },
  { value: 'compact', label: 'Compact' },
] as const;

const localeOptions = [
  { value: 'zh-CN', label: 'zh-CN' },
  { value: 'en-US', label: 'en-US' },
  { value: 'de-DE', label: 'de-DE' },
  { value: 'ja-JP', label: 'ja-JP' },
] as const;

const easingOptions = [
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In Out' },
  { value: 'linear', label: 'Linear' },
] as const;

type NumberFormat = (typeof numberFormatOptions)[number]['value'];
type NumberLocale = (typeof localeOptions)[number]['value'];
type NumberEasing = (typeof easingOptions)[number]['value'];
type TweenNumberFormat = NonNullable<
  ComponentProps<typeof TweenNumber>['format']
>;

export function TweenNumberPlayground() {
  const [value, setValue] = useState(1280);
  const [duration, setDuration] = useState(0.6);
  const [formatPreset, setFormatPreset] = useState<NumberFormat>('decimal');
  const [locale, setLocale] = useState<NumberLocale>('zh-CN');
  const [easing, setEasing] = useState<NumberEasing>('easeOut');
  const [useGrouping, setUseGrouping] = useState(false);

  const format: TweenNumberFormat =
    formatPreset === 'currency'
      ? { style: 'currency', currency: 'CNY', useGrouping }
      : formatPreset === 'compact'
        ? { notation: 'compact', maximumFractionDigits: 1, useGrouping }
        : formatPreset === 'decimal'
          ? {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
              useGrouping,
            }
          : { maximumFractionDigits: 0, useGrouping };

  return (
    <PlaygroundFrame
      controls={
        <>
          <NumberControl label='Value' value={value} onChange={setValue} />
          <NumberControl
            label='Duration'
            value={duration}
            min={0}
            step={0.1}
            onChange={(next) => setDuration(Math.max(0, next))}
          />
          <SelectControl
            label='Format'
            value={formatPreset}
            options={numberFormatOptions}
            onChange={setFormatPreset}
          />
          <SelectControl
            label='Locale'
            value={locale}
            options={localeOptions}
            onChange={setLocale}
          />
          <SelectControl
            label='Easing'
            value={easing}
            options={easingOptions}
            onChange={setEasing}
          />
          <CheckboxControl
            label='Grouping'
            checked={useGrouping}
            onChange={setUseGrouping}
          />
        </>
      }
    >
      <div className='grid gap-6 text-center'>
        <TweenNumber
          value={value}
          duration={duration}
          locales={locale}
          format={format}
          transition={{ ease: easing }}
        />
        <div className='flex flex-wrap items-center justify-center gap-2'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              setValue((current) => current - 500);
            }}
          >
            -500
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              setValue((current) => current + 500);
            }}
          >
            +500
          </Button>
          <Button
            size='sm'
            variant='secondary'
            onClick={() => {
              setValue(Math.floor(Math.random() * 10_000));
            }}
          >
            Random
          </Button>
        </div>
      </div>
    </PlaygroundFrame>
  );
}
