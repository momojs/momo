'use client';

import { useState } from 'react';

import { Slider } from '../../../../../packages/design/src/components/slider';
import {
  NumberControl,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const sliderPresetOptions = [
  { value: 'continuous', label: 'Continuous (0–1)' },
  { value: 'percentage', label: 'Percentage (0–100)' },
  { value: 'discrete', label: 'Discrete (0–10)' },
  { value: 'custom', label: 'Custom' },
] as const;

const sliderFormatOptions = [
  { value: 'auto', label: 'Automatic' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'currency', label: 'Currency' },
] as const;

type SliderPreset = (typeof sliderPresetOptions)[number]['value'];
type SliderFormat = (typeof sliderFormatOptions)[number]['value'];

export function SliderPlayground() {
  const [preset, setPreset] = useState<SliderPreset>('continuous');
  const [label, setLabel] = useState('Opacity');
  const [value, setValue] = useState(0.42);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(1);
  const [step, setStep] = useState(0.01);
  const [format, setFormat] = useState<SliderFormat>('auto');

  const markCustom = () => setPreset('custom');
  const clamp = (next: number, nextMin = min, nextMax = max) =>
    Math.max(nextMin, Math.min(nextMax, next));

  const applyPreset = (next: SliderPreset) => {
    setPreset(next);
    if (next === 'continuous') {
      setLabel('Opacity');
      setMin(0);
      setMax(1);
      setStep(0.01);
      setValue(0.42);
      setFormat('auto');
    } else if (next === 'percentage') {
      setLabel('Volume');
      setMin(0);
      setMax(100);
      setStep(1);
      setValue(65);
      setFormat('percentage');
    } else if (next === 'discrete') {
      setLabel('Rating');
      setMin(0);
      setMax(10);
      setStep(1);
      setValue(6);
      setFormat('auto');
    }
  };

  const formatValue =
    format === 'percentage'
      ? (next: number) => `${Math.round(next)}%`
      : format === 'currency'
        ? (next: number) =>
            new Intl.NumberFormat('zh-CN', {
              style: 'currency',
              currency: 'CNY',
            }).format(next)
        : undefined;

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Preset'
            value={preset}
            options={sliderPresetOptions}
            onChange={applyPreset}
          />
          <SelectControl
            label='Format'
            value={format}
            options={sliderFormatOptions}
            onChange={(next) => {
              setFormat(next);
              markCustom();
            }}
          />
          <TextControl
            label='Label'
            value={label}
            onChange={(next) => {
              setLabel(next);
              markCustom();
            }}
          />
          <NumberControl
            label='Value'
            value={value}
            step={step}
            onChange={(next) => {
              setValue(clamp(next));
              markCustom();
            }}
          />
          <NumberControl
            label='Min'
            value={min}
            step={step}
            onChange={(next) => {
              const nextMin = Math.min(next, max - step);
              setMin(nextMin);
              setValue((current) => clamp(current, nextMin, max));
              markCustom();
            }}
          />
          <NumberControl
            label='Max'
            value={max}
            step={step}
            onChange={(next) => {
              const nextMax = Math.max(next, min + step);
              setMax(nextMax);
              setValue((current) => clamp(current, min, nextMax));
              markCustom();
            }}
          />
          <NumberControl
            label='Step'
            value={step}
            min={0.001}
            onChange={(next) => {
              setStep(Math.max(0.001, Math.min(next, max - min)));
              markCustom();
            }}
          />
        </>
      }
      state={
        <code>
          label: {label || 'empty'}; value: {value}; min: {min}; max: {max};
          step: {step}; format: {format}
        </code>
      }
    >
      <div className='w-full max-w-sm'>
        <Slider
          label={label || 'Slider'}
          value={value}
          min={min}
          max={max}
          step={step}
          formatValue={formatValue}
          onValueChange={setValue}
        />
      </div>
    </PlaygroundFrame>
  );
}
