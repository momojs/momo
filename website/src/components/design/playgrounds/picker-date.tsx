'use client';

import { useState } from 'react';

import { Calendar03Icon } from '@hugeicons/core-free-icons';

import { PickerDate } from '../../../../../packages/design/src/components/picker-date';
import {
  CheckboxControl,
  Icon,
  NumberControl,
  PlaygroundFrame,
  SelectControl,
} from './shared';

const precisionOptions = [
  { value: 'year', label: 'Year' },
  { value: 'month', label: 'Month' },
  { value: 'date', label: 'Date' },
] as const;

const boundsOptions = [
  { value: 'none', label: 'None' },
  { value: 'year', label: 'Current Year' },
  { value: 'month', label: 'Current Month' },
] as const;

const visibleCountOptions = [
  { value: '12', label: '12' },
  { value: '16', label: '16' },
  { value: '20', label: '20' },
  { value: '24', label: '24' },
] as const;

type PickerPrecision = (typeof precisionOptions)[number]['value'];
type PickerBounds = (typeof boundsOptions)[number]['value'];
type PickerVisibleCount = (typeof visibleCountOptions)[number]['value'];

export function PickerDatePlayground() {
  const [value, setValue] = useState(new Date());
  const [disabled, setDisabled] = useState(false);
  const [infinite, setInfinite] = useState(false);
  const [precision, setPrecision] = useState<PickerPrecision>('date');
  const [bounds, setBounds] = useState<PickerBounds>('none');
  const [visibleCount, setVisibleCount] = useState<PickerVisibleCount>('20');
  const [dragSensitivity, setDragSensitivity] = useState(3);
  const [scrollSensitivity, setScrollSensitivity] = useState(5);
  const [optionItemHeight, setOptionItemHeight] = useState(30);

  const min =
    bounds === 'year'
      ? new Date(value.getFullYear(), 0, 1)
      : bounds === 'month'
        ? new Date(value.getFullYear(), value.getMonth(), 1)
        : undefined;
  const max =
    bounds === 'year'
      ? new Date(value.getFullYear(), 11, 31)
      : bounds === 'month'
        ? new Date(value.getFullYear(), value.getMonth() + 1, 0)
        : undefined;

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Precision'
            value={precision}
            options={precisionOptions}
            onChange={setPrecision}
          />
          <SelectControl
            label='Bounds'
            value={bounds}
            options={boundsOptions}
            onChange={setBounds}
          />
          <SelectControl
            label='Visible'
            value={visibleCount}
            options={visibleCountOptions}
            onChange={setVisibleCount}
          />
          <NumberControl
            label='Drag'
            value={dragSensitivity}
            min={0.1}
            onChange={(next) => setDragSensitivity(Math.max(0.1, next))}
          />
          <NumberControl
            label='Scroll'
            value={scrollSensitivity}
            min={0.1}
            onChange={(next) => setScrollSensitivity(Math.max(0.1, next))}
          />
          <NumberControl
            label='Item height'
            value={optionItemHeight}
            min={16}
            step={1}
            onChange={(next) =>
              setOptionItemHeight(Math.max(16, Math.round(next)))
            }
          />
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
          />
          <CheckboxControl
            label='Infinite'
            checked={infinite}
            onChange={setInfinite}
          />
        </>
      }
    >
      <div className='grid gap-4 text-center'>
        <div className='inline-flex items-center justify-center gap-2 text-sm font-medium text-momo-fg-default'>
          <Icon icon={Calendar03Icon} />
          Date picker
        </div>
        <PickerDate
          value={value}
          min={min}
          max={max}
          precision={precision}
          disabled={disabled}
          infinite={infinite}
          visibleCount={Number(visibleCount)}
          dragSensitivity={dragSensitivity}
          scrollSensitivity={scrollSensitivity}
          optionItemHeight={optionItemHeight}
          onChange={setValue}
        />
      </div>
    </PlaygroundFrame>
  );
}
