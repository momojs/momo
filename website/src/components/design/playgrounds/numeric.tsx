'use client';

import { useState } from 'react';

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
            onChange={(next) => setMin(Math.min(next, max - step))}
          />
          <NumberControl
            label='Max'
            value={max}
            step={step}
            onChange={(next) => setMax(Math.max(next, min + step))}
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
            label='Out of range'
            checked={allowOutOfRange}
            onChange={setAllowOutOfRange}
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
          ; max: {max}; step: {step}; smallStep: {smallStep}; largeStep:{' '}
          {largeStep}; format: {formatPreset}; locale: {locale};
          allowOutOfRange: {String(allowOutOfRange)}; allowWheelScrub:{' '}
          {String(allowWheelScrub)}; snapOnStep: {String(snapOnStep)}
        </code>
      }
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
    </PlaygroundFrame>
  );
}
