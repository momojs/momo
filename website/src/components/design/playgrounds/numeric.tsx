'use client';

import { useState } from 'react';

import { Field } from '@base-ui/react/field';

import { Numeric } from '../../../../../packages/design/src/components/numeric';
import type { ControlSizeValue } from './shared';
import {
  CheckboxControl,
  controlSizeOptions,
  NumberControl,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const numericFormatOptions = [
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

type NumericFormat = (typeof numericFormatOptions)[number]['value'];
type NumericLocale = (typeof localeOptions)[number]['value'];

function clampValue(value: number | null, min: number, max: number) {
  if (value === null) return null;
  return Math.min(max, Math.max(min, value));
}

export function NumericPlayground() {
  const [value, setValue] = useState<number | null>(125);
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [label, setLabel] = useState('Amount');
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(1_000);
  const [step, setStep] = useState(5);
  const [smallStep, setSmallStep] = useState(0.5);
  const [largeStep, setLargeStep] = useState(50);
  const [formatPreset, setFormatPreset] = useState<NumericFormat>('decimal');
  const [locale, setLocale] = useState<NumericLocale>('zh-CN');
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [required, setRequired] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [allowOutOfRange, setAllowOutOfRange] = useState(false);
  const [allowWheelScrub, setAllowWheelScrub] = useState(false);
  const [snapOnStep, setSnapOnStep] = useState(false);

  const format: Intl.NumberFormatOptions =
    formatPreset === 'currency'
      ? { style: 'currency', currency: 'CNY' }
      : formatPreset === 'compact'
        ? { notation: 'compact', maximumFractionDigits: 1 }
        : { maximumFractionDigits: 2 };

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Size'
            value={size}
            options={controlSizeOptions}
            onChange={setSize}
          />
          <TextControl label='Label' value={label} onChange={setLabel} />
          <SelectControl
            label='Format'
            value={formatPreset}
            options={numericFormatOptions}
            onChange={setFormatPreset}
          />
          <SelectControl
            label='Locale'
            value={locale}
            options={localeOptions}
            onChange={setLocale}
          />
          <NumberControl
            label='Min'
            value={min}
            step={step}
            onChange={(next) => {
              const nextMin = Math.min(next, max - step);
              setMin(nextMin);
              setValue((current) => clampValue(current, nextMin, max));
            }}
          />
          <NumberControl
            label='Max'
            value={max}
            step={step}
            onChange={(next) => {
              const nextMax = Math.max(next, min + step);
              setMax(nextMax);
              setValue((current) => clampValue(current, min, nextMax));
            }}
          />
          <NumberControl
            label='Step'
            value={step}
            min={0.01}
            onChange={(next) => setStep(Math.max(0.01, next))}
          />
          <NumberControl
            label='Small step'
            value={smallStep}
            min={0.01}
            onChange={(next) => setSmallStep(Math.max(0.01, next))}
          />
          <NumberControl
            label='Large step'
            value={largeStep}
            min={0.01}
            onChange={(next) => setLargeStep(Math.max(0.01, next))}
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
          <CheckboxControl
            label='Required'
            checked={required}
            onChange={setRequired}
          />
          <CheckboxControl
            label='Invalid'
            checked={invalid}
            onChange={setInvalid}
          />
          <CheckboxControl
            label='Allow out of range'
            checked={allowOutOfRange}
            onChange={(next) => {
              setAllowOutOfRange(next);
              if (!next) {
                setValue((current) => clampValue(current, min, max));
              }
            }}
          />
          <CheckboxControl
            label='Wheel scrub'
            checked={allowWheelScrub}
            onChange={setAllowWheelScrub}
          />
          <CheckboxControl
            label='Snap to step'
            checked={snapOnStep}
            onChange={setSnapOnStep}
          />
        </>
      }
      state={
        <code>
          value: {value ?? 'null'}; size: {size}; disabled: {String(disabled)};
          readOnly: {String(readOnly)}; required: {String(required)}; min: {min}
          ; invalid: {String(invalid)}; max: {max}; step: {step}; smallStep:{' '}
          {smallStep}; largeStep: {largeStep}; format: {formatPreset}; locale:{' '}
          {locale}; allowOutOfRange: {String(allowOutOfRange)}; allowWheelScrub:{' '}
          {String(allowWheelScrub)}; snapOnStep: {String(snapOnStep)}
        </code>
      }
    >
      <Field.Root
        name='numeric-playground-amount'
        invalid={invalid}
        className='grid justify-items-start gap-momo-xxs'
      >
        <Numeric
          label={label || 'Amount'}
          value={value}
          min={min}
          max={max}
          step={step}
          smallStep={smallStep}
          largeStep={largeStep}
          size={size}
          format={format}
          locale={locale}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          allowOutOfRange={allowOutOfRange}
          allowWheelScrub={allowWheelScrub}
          snapOnStep={snapOnStep}
          onChange={setValue}
        />
        <Field.Description className='text-momo-caption text-momo-fg-muted'>
          Type a value, use the steppers, or drag the label.
        </Field.Description>
        <Field.Error
          match={invalid}
          className='text-momo-caption text-momo-fg-danger'
        >
          This value is marked as invalid.
        </Field.Error>
      </Field.Root>
    </PlaygroundFrame>
  );
}
