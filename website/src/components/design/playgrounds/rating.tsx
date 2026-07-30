'use client';

import { useState } from 'react';

import { Rating } from '../../../../../packages/design/src/components/rating';
import {
  CheckboxControl,
  NumberControl,
  PlaygroundFrame,
  SelectControl,
} from './shared';

const ratingSizeOptions = [
  { value: 'xs', label: 'Extra small' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
] as const;

const ratingVariantOptions = [
  { value: 'default', label: 'Default' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'outline', label: 'Outline' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'destructive', label: 'Destructive' },
] as const;

const ratingPrecisionOptions = [
  { value: '1', label: '1' },
  { value: '0.5', label: '0.5' },
  { value: '0.25', label: '0.25' },
] as const;

type RatingSize = (typeof ratingSizeOptions)[number]['value'];
type RatingVariant = (typeof ratingVariantOptions)[number]['value'];
type RatingPrecision = (typeof ratingPrecisionOptions)[number]['value'];

export function RatingPlayground() {
  const [value, setValue] = useState(3.5);
  const [max, setMax] = useState(5);
  const [size, setSize] = useState<RatingSize>('sm');
  const [variant, setVariant] = useState<RatingVariant>('yellow');
  const [precision, setPrecision] = useState<RatingPrecision>('0.5');
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  const resolvedPrecision = Number(precision);

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Size'
            value={size}
            options={ratingSizeOptions}
            onChange={setSize}
          />
          <SelectControl
            label='Variant'
            value={variant}
            options={ratingVariantOptions}
            onChange={setVariant}
          />
          <SelectControl
            label='Precision'
            value={precision}
            options={ratingPrecisionOptions}
            onChange={(next) => {
              const nextPrecision = Number(next);
              setPrecision(next);
              setValue((current) =>
                Math.min(
                  max,
                  Math.round(current / nextPrecision) * nextPrecision,
                ),
              );
            }}
          />
          <NumberControl
            label='Max'
            value={max}
            min={1}
            max={10}
            step={1}
            onChange={(next) => {
              const nextMax = Math.min(10, Math.max(1, Math.round(next)));
              setMax(nextMax);
              setValue((current) => Math.min(current, nextMax));
            }}
          />
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
          />
          <CheckboxControl
            label='Read only'
            checked={readOnly}
            onChange={setReadOnly}
          />
        </>
      }
      state={
        <code>
          value: {value}; max: {max}; precision: {precision}; size: {size};
          variant: {variant}; disabled: {String(disabled)}; readOnly:{' '}
          {String(readOnly)}
        </code>
      }
    >
      <div className='grid justify-items-center gap-momo-sm'>
        <Rating
          aria-label='Product rating'
          value={value}
          max={max}
          size={size}
          variant={variant}
          precision={resolvedPrecision}
          disabled={disabled}
          readOnly={readOnly}
          onValueChange={setValue}
        />
        <p className='text-momo-body-sm text-momo-fg-muted' aria-live='polite'>
          {value} / {max}
        </p>
      </div>
    </PlaygroundFrame>
  );
}
