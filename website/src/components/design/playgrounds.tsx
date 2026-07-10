'use client';

import { useState } from 'react';

import {
  AlignHorizontalCenterIcon,
  AlignHorizontalJustifyCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  Apple01Icon,
  BananaIcon,
  Calendar03Icon,
  CherryIcon,
  Clock01Icon,
  GrapeIcon,
  GridViewIcon,
  Layout03Icon,
  ListViewIcon,
  Moon02Icon,
  Notification01Icon,
  Settings02Icon,
  Sun03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useTheme } from 'fumadocs-ui/provider/base';

import { Button } from '../../../../packages/design/src/components/button';
import { Calendar } from '../../../../packages/design/src/components/calendar';
import { PickerDate } from '../../../../packages/design/src/components/picker-date';
import { PickerTime } from '../../../../packages/design/src/components/picker-time';
import { Select } from '../../../../packages/design/src/components/select';
import { Slider } from '../../../../packages/design/src/components/slider';
import { Switch } from '../../../../packages/design/src/components/switch';
import { Tabs } from '../../../../packages/design/src/components/tabs';
import { ToggleGroup } from '../../../../packages/design/src/components/toggle-group';
import { TweenNumber } from '../../../../packages/design/src/components/tween-number';
import {
  PLAYGROUND_THEMES,
  usePlaygroundTheme,
} from './playground-theme';
import type { PlaygroundThemeName } from './playground-theme';

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function Icon({ icon }: { icon: Parameters<typeof HugeiconsIcon>[0]['icon'] }) {
  return <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} aria-hidden />;
}

type SelectOption<T extends string> = {
  value: T;
  label: string;
};

function SelectControl<T extends string>({
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
    <label className='inline-flex items-center gap-2 text-xs font-medium text-fd-muted-foreground'>
      {label}
      <select
        value={value}
        className='h-8 rounded-md border border-fd-border bg-fd-background px-2 text-xs text-fd-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-fd-ring'
        onChange={(event) => {
          onChange(event.target.value as T);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxControl({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className='inline-flex h-8 items-center gap-2 text-xs font-medium text-fd-muted-foreground'>
      <input
        type='checkbox'
        checked={checked}
        className='size-3.5 rounded border-fd-border accent-fd-primary'
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      {label}
    </label>
  );
}

function PlaygroundFrame({
  children,
  controls,
  state,
}: {
  children: React.ReactNode;
  controls?: React.ReactNode;
  state?: React.ReactNode;
}) {
  const [theme, setTheme] = usePlaygroundTheme();
  const { resolvedTheme } = useTheme();
  const selected = PLAYGROUND_THEMES[theme];
  const isDark = resolvedTheme === 'dark';

  return (
    <div className='not-prose grid gap-4 rounded-lg border bg-fd-card p-4'>
      <div
        className={cn(
          'flex flex-wrap items-center gap-3',
          controls ? 'justify-between' : 'justify-end',
        )}
      >
        {controls && (
          <div className='flex flex-wrap items-center gap-3'>{controls}</div>
        )}
        <label className='inline-flex items-center gap-2 text-xs font-medium text-fd-muted-foreground'>
          Theme
          <select
            value={theme}
            className='h-8 rounded-md border border-fd-border bg-fd-background px-2 text-xs text-fd-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-fd-ring'
            onChange={(event) => {
              setTheme(event.target.value as PlaygroundThemeName);
            }}
          >
            {Object.entries(PLAYGROUND_THEMES).map(([value, option]) => (
              <option key={value} value={value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={cn('grid gap-4 rounded-md', selected.className, isDark && 'dark')}>
        <div className='grid min-h-56 place-items-center rounded-md border border-momo-border bg-momo-background p-6 text-momo-foreground'>
          {children}
        </div>
        {state && (
          <div className='rounded-md border border-momo-border bg-momo-muted p-3 text-xs text-momo-muted-foreground'>
            {state}
          </div>
        )}
      </div>
    </div>
  );
}

const buttonVariantOptions = [
  { value: 'default', label: 'Default' },
  { value: 'accent', label: 'Accent' },
  { value: 'destructive', label: 'Destructive' },
  { value: 'outline', label: 'Outline' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'link', label: 'Link' },
] as const;

const buttonSizeOptions = [
  { value: 'default', label: 'Default' },
  { value: 'sm', label: 'Small' },
  { value: 'lg', label: 'Large' },
  { value: 'icon', label: 'Icon' },
  { value: 'icon-sm', label: 'Icon Small' },
  { value: 'icon-lg', label: 'Icon Large' },
] as const;

const controlSizeOptions = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
] as const;

const toggleGroupVariantOptions = [
  { value: 'button', label: 'Button' },
  { value: 'segmented', label: 'Segmented' },
  { value: 'tabbar', label: 'Tabbar' },
] as const;

const orientationOptions = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
] as const;

const calendarPagerVariantOptions = [
  { value: 'ghost', label: 'Ghost' },
  { value: 'default', label: 'Default' },
  { value: 'outline', label: 'Outline' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'destructive', label: 'Destructive' },
  { value: 'link', label: 'Link' },
] as const;

const calendarCaptionLayoutOptions = [
  { value: 'label', label: 'Label' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'dropdown-months', label: 'Months' },
  { value: 'dropdown-years', label: 'Years' },
] as const;

type ButtonVariant = (typeof buttonVariantOptions)[number]['value'];
type ButtonSize = (typeof buttonSizeOptions)[number]['value'];
type ControlSizeValue = (typeof controlSizeOptions)[number]['value'];
type ToggleGroupVariant = (typeof toggleGroupVariantOptions)[number]['value'];
type TabsOrientation = (typeof orientationOptions)[number]['value'];
type CalendarPagerVariant =
  (typeof calendarPagerVariantOptions)[number]['value'];
type CalendarCaptionLayout =
  (typeof calendarCaptionLayoutOptions)[number]['value'];

export function ButtonPlayground() {
  const [clicks, setClicks] = useState(0);
  const [variant, setVariant] = useState<ButtonVariant>('default');
  const [size, setSize] = useState<ButtonSize>('default');
  const [disabled, setDisabled] = useState(false);
  const iconOnly = size.startsWith('icon');

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Variant'
            value={variant}
            options={buttonVariantOptions}
            onChange={setVariant}
          />
          <SelectControl
            label='Size'
            value={size}
            options={buttonSizeOptions}
            onChange={setSize}
          />
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
          />
        </>
      }
      state={
        <code>
          variant: {variant}; size: {size}; disabled: {String(disabled)};
          clicks: {clicks}
        </code>
      }
    >
      <Button
        size={size}
        variant={variant}
        disabled={disabled}
        aria-label={iconOnly ? 'Open settings' : undefined}
        onClick={() => {
          setClicks((count) => count + 1);
        }}
      >
        {iconOnly ? <Icon icon={Settings02Icon} /> : 'Button'}
      </Button>
    </PlaygroundFrame>
  );
}

export function TweenNumberPlayground() {
  const [value, setValue] = useState(1280);

  return (
    <PlaygroundFrame state={<code>value: {value}</code>}>
      <div className='grid gap-6 text-center'>
        <TweenNumber
          value={value}
          prefix='¥'
          format={{
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }}
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

export function ToggleGroupPlayground() {
  const [value, setValue] = useState<'left' | 'center' | 'right' | 'justify'>(
    'center',
  );
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [variant, setVariant] = useState<ToggleGroupVariant>('button');

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
          <SelectControl
            label='Variant'
            value={variant}
            options={toggleGroupVariantOptions}
            onChange={setVariant}
          />
        </>
      }
      state={
        <code>
          value: {value}; size: {size}; variant: {variant}
        </code>
      }
    >
      <ToggleGroup
        size={size}
        value={value}
        variant={variant}
        onChange={setValue}
        options={[
          { value: 'left', label: 'Left', icon: <Icon icon={AlignLeftIcon} /> },
          {
            value: 'center',
            label: 'Center',
            icon: <Icon icon={AlignHorizontalCenterIcon} />,
          },
          {
            value: 'right',
            label: 'Right',
            icon: <Icon icon={AlignRightIcon} />,
          },
          {
            value: 'justify',
            label: 'Justify',
            icon: <Icon icon={AlignHorizontalJustifyCenterIcon} />,
          },
        ]}
      />
    </PlaygroundFrame>
  );
}

export function SegmentedPlayground() {
  const [value, setValue] = useState<'list' | 'grid' | 'settings'>('grid');
  const [size, setSize] = useState<ControlSizeValue>('md');

  return (
    <PlaygroundFrame
      controls={
        <SelectControl
          label='Size'
          value={size}
          options={controlSizeOptions}
          onChange={setSize}
        />
      }
      state={
        <code>
          value: {value}; size: {size}
        </code>
      }
    >
      <ToggleGroup
        size={size}
        value={value}
        variant='segmented'
        onChange={setValue}
        options={[
          { value: 'list', label: 'List', icon: <Icon icon={ListViewIcon} /> },
          { value: 'grid', label: 'Grid', icon: <Icon icon={GridViewIcon} /> },
          {
            value: 'settings',
            label: 'Settings',
            icon: <Icon icon={Settings02Icon} />,
          },
        ]}
      />
    </PlaygroundFrame>
  );
}

const sliderPresetOptions = [
  {
    value: 'continuous',
    label: 'Continuous (0–1)',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0.42,
    labelText: 'Opacity',
  },
  {
    value: 'percentage',
    label: 'Percentage (0–100)',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 65,
    labelText: 'Volume',
    formatValue: (value: number) => `${Math.round(value)}%`,
  },
  {
    value: 'discrete',
    label: 'Discrete (0–10)',
    min: 0,
    max: 10,
    step: 1,
    defaultValue: 6,
    labelText: 'Rating',
  },
] as const;

type SliderPreset = (typeof sliderPresetOptions)[number]['value'];

export function SliderPlayground() {
  const [preset, setPreset] = useState<SliderPreset>('continuous');
  const selected = sliderPresetOptions.find(
    (option) => option.value === preset,
  )!;
  const [value, setValue] = useState<number>(selected.defaultValue);

  return (
    <PlaygroundFrame
      controls={
        <SelectControl
          label='Preset'
          value={preset}
          options={sliderPresetOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          onChange={(next) => {
            const option = sliderPresetOptions.find(
              (item) => item.value === next,
            )!;
            setPreset(next);
            setValue(option.defaultValue);
          }}
        />
      }
      state={
        <code>
          value: {value}; min: {selected.min}; max: {selected.max}; step:{' '}
          {selected.step}
        </code>
      }
    >
      <div className='w-full max-w-sm'>
        <Slider
          key={preset}
          label={selected.labelText}
          value={value}
          min={selected.min}
          max={selected.max}
          step={selected.step}
          formatValue={
            'formatValue' in selected ? selected.formatValue : undefined
          }
          onValueChange={setValue}
        />
      </div>
    </PlaygroundFrame>
  );
}

export function SelectPlayground() {
  const [value, setValue] = useState<
    'apple' | 'banana' | 'cherry' | 'date' | 'elderberry'
  >('apple');
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [disabled, setDisabled] = useState(false);

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
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
          />
        </>
      }
      state={
        <code>
          value: {value}; size: {size}; disabled: {String(disabled)}
        </code>
      }
    >
      <div className='w-full max-w-xs'>
        <Select
          size={size}
          value={value}
          disabled={disabled}
          placeholder='Select a fruit...'
          onChange={setValue}
          options={[
            {
              value: 'apple',
              label: 'Apple',
              icon: <Icon icon={Apple01Icon} />,
            },
            {
              value: 'banana',
              label: 'Banana',
              icon: <Icon icon={BananaIcon} />,
            },
            {
              value: 'cherry',
              label: 'Cherry',
              icon: <Icon icon={CherryIcon} />,
            },
            {
              value: 'date',
              label: 'Date',
              icon: <Icon icon={Calendar03Icon} />,
            },
            {
              value: 'elderberry',
              label: 'Elderberry',
              icon: <Icon icon={GrapeIcon} />,
            },
          ]}
        />
      </div>
    </PlaygroundFrame>
  );
}

export function SwitchPlayground() {
  const [enabled, setEnabled] = useState(true);
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [disabled, setDisabled] = useState(false);

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
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
          />
        </>
      }
      state={
        <code>
          checked: {String(enabled)}; size: {size}; disabled: {String(disabled)}
        </code>
      }
    >
      <Switch
        size={size}
        checked={enabled}
        disabled={disabled}
        onChange={setEnabled}
        label='Notifications'
        description='Use the switch in controlled or uncontrolled forms.'
      />
    </PlaygroundFrame>
  );
}

export function TabsPlayground() {
  const [value, setValue] = useState<'overview' | 'usage' | 'settings'>(
    'overview',
  );
  const [orientation, setOrientation] = useState<TabsOrientation>('horizontal');

  return (
    <PlaygroundFrame
      controls={
        <SelectControl
          label='Orientation'
          value={orientation}
          options={orientationOptions}
          onChange={setOrientation}
        />
      }
      state={
        <code>
          value: {value}; orientation: {orientation}
        </code>
      }
    >
      <Tabs
        value={value}
        orientation={orientation}
        onChange={setValue}
        options={[
          {
            value: 'overview',
            label: 'Overview',
            icon: <Icon icon={Layout03Icon} />,
            content: 'A compact component surface built from Base UI Tabs.',
          },
          {
            value: 'usage',
            label: 'Usage',
            icon: <Icon icon={Notification01Icon} />,
            content:
              'Use value/onChange for controlled flows or defaultValue for local state.',
          },
          {
            value: 'settings',
            label: 'Settings',
            icon: <Icon icon={Settings02Icon} />,
            content:
              'Panels inherit the default Tailwind theme and stay unstyled enough to compose.',
          },
        ]}
      />
    </PlaygroundFrame>
  );
}

export function CalendarPlayground() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [pagerVariant, setPagerVariant] =
    useState<CalendarPagerVariant>('ghost');
  const [captionLayout, setCaptionLayout] =
    useState<CalendarCaptionLayout>('label');
  const [showWeekNumber, setShowWeekNumber] = useState(false);
  const [showOutsideDays, setShowOutsideDays] = useState(true);

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Pager'
            value={pagerVariant}
            options={calendarPagerVariantOptions}
            onChange={setPagerVariant}
          />
          <SelectControl
            label='Caption'
            value={captionLayout}
            options={calendarCaptionLayoutOptions}
            onChange={setCaptionLayout}
          />
          <CheckboxControl
            label='Week No.'
            checked={showWeekNumber}
            onChange={setShowWeekNumber}
          />
          <CheckboxControl
            label='Outside'
            checked={showOutsideDays}
            onChange={setShowOutsideDays}
          />
        </>
      }
      state={
        <code>
          selected: {date ? date.toLocaleDateString() : 'undefined'}; pager:{' '}
          {pagerVariant}; caption: {captionLayout}
        </code>
      }
    >
      <Calendar
        selected={date}
        onSelect={setDate}
        caption={{ layout: captionLayout }}
        pager={{ variant: pagerVariant }}
        showWeekNumber={showWeekNumber}
        showOutsideDays={showOutsideDays}
      />
    </PlaygroundFrame>
  );
}

export function PickerDatePlayground() {
  const [value, setValue] = useState(new Date());
  const [disabled, setDisabled] = useState(false);
  const [bounded, setBounded] = useState(false);
  const min = bounded ? new Date(value.getFullYear(), 0, 1) : undefined;
  const max = bounded ? new Date(value.getFullYear(), 11, 31) : undefined;

  return (
    <PlaygroundFrame
      controls={
        <>
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
          />
          <CheckboxControl
            label='This Year'
            checked={bounded}
            onChange={setBounded}
          />
        </>
      }
      state={
        <code>
          value: {value.toISOString()}; disabled: {String(disabled)}; min/max:{' '}
          {bounded ? 'this year' : 'none'}
        </code>
      }
    >
      <div className='grid gap-4 text-center'>
        <div className='inline-flex items-center justify-center gap-2 text-sm font-medium text-momo-foreground'>
          <Icon icon={Calendar03Icon} />
          Date picker
        </div>
        <PickerDate
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={setValue}
        />
      </div>
    </PlaygroundFrame>
  );
}

export function PickerTimePlayground() {
  const [value, setValue] = useState('09:30 AM');
  const [disabled, setDisabled] = useState(false);

  return (
    <PlaygroundFrame
      controls={
        <CheckboxControl
          label='Disabled'
          checked={disabled}
          onChange={setDisabled}
        />
      }
      state={
        <code>
          value: {value}; disabled: {String(disabled)}
        </code>
      }
    >
      <div className='grid gap-4 text-center'>
        <div className='inline-flex items-center justify-center gap-2 text-sm font-medium text-momo-foreground'>
          <Icon icon={Clock01Icon} />
          Time picker
        </div>
        <PickerTime value={value} disabled={disabled} onChange={setValue} />
      </div>
    </PlaygroundFrame>
  );
}

export function IconPlayground() {
  return (
    <PlaygroundFrame>
      <div className='flex items-center gap-3 text-momo-foreground'>
        <Icon icon={Sun03Icon} />
        <Icon icon={Moon02Icon} />
        <span className='text-sm'>
          Hugeicons render through @hugeicons/react.
        </span>
      </div>
    </PlaygroundFrame>
  );
}
