'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { Checkbox } from '../../../../../packages/design/src/components/checkbox';
import { Input } from '../../../../../packages/design/src/components/input';
import { Select } from '../../../../../packages/design/src/components/select';
import type { PlaygroundThemeName } from './theme';
import { PLAYGROUND_THEMES, usePlaygroundTheme } from './theme';

export { Icon } from '../../../../../packages/design/src/components/icon';

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

type SelectOption<T extends string> = {
  value: T;
  label: string;
};

const playgroundThemeOptions = (
  Object.keys(PLAYGROUND_THEMES) as PlaygroundThemeName[]
).map((value) => ({
  value,
  label: PLAYGROUND_THEMES[value].label,
}));

export function SelectControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className='flex w-full items-center justify-between gap-3 text-xs font-medium text-fd-muted-foreground'>
      <span className='shrink-0'>{label}</span>
      <Select<T>
        size='sm'
        value={value}
        options={options.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        placeholder={label}
        triggerClassName='min-w-28 text-xs'
        popupClassName='text-xs'
        itemClassName='text-xs'
        triggerProps={{ 'aria-label': label }}
        onChange={onChange}
      />
    </div>
  );
}

export function CheckboxControl({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className='flex h-8 w-full items-center gap-2 text-xs font-medium text-fd-muted-foreground'>
      <Checkbox
        size='sm'
        checked={checked}
        aria-label={label}
        onCheckedChange={onChange}
      />
      {label}
    </label>
  );
}

export function TextControl({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className='flex w-full items-center justify-between gap-3 text-xs font-medium text-fd-muted-foreground'>
      <span>{label}</span>
      <Input
        size='sm'
        value={value}
        placeholder={placeholder}
        className='w-36 text-xs'
        aria-label={label}
        onValueChange={onChange}
      />
    </label>
  );
}

export function NumberControl({
  label,
  value,
  min,
  max,
  step = 'any',
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number | 'any';
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <label className='flex w-full items-center justify-between gap-3 text-xs font-medium text-fd-muted-foreground'>
      <span>{label}</span>
      <Input
        type='number'
        size='sm'
        value={draft}
        min={min}
        max={max}
        step={step}
        className='w-24 font-mono text-xs'
        aria-label={label}
        onBlur={() => setDraft(String(value))}
        onValueChange={(next) => {
          setDraft(next);
          if (next.trim() === '') return;
          const parsed = Number(next);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
      />
    </label>
  );
}

export function PlaygroundFrame({
  children,
  controls,
}: {
  children: ReactNode;
  controls?: ReactNode;
}) {
  const [theme, setTheme] = usePlaygroundTheme();

  return (
    <div className='not-prose @container/playground rounded-lg border bg-fd-card p-4'>
      <div className='grid gap-4 @xl/playground:grid-cols-[minmax(0,1fr)_16rem]'>
        <div className='grid min-h-72 min-w-0 place-items-center rounded-md border border-momo-border-default bg-momo-bg-canvas p-6 text-momo-fg-default'>
          {children}
        </div>
        <aside
          aria-label='Playground controls'
          className='flex min-w-0 flex-col overflow-hidden rounded-md border border-momo-border-default bg-momo-bg-canvas @xl/playground:max-h-[36rem]'
        >
          <div className='border-b border-momo-border-default p-3'>
            <SelectControl
              label='Theme'
              value={theme}
              options={playgroundThemeOptions}
              onChange={setTheme}
            />
          </div>
          {controls && (
            <div className='grid gap-2 overflow-y-auto p-3'>{controls}</div>
          )}
        </aside>
      </div>
    </div>
  );
}

export const controlSizeOptions = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
] as const;

export type ControlSizeValue = (typeof controlSizeOptions)[number]['value'];
