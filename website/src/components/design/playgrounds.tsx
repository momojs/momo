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
  Layout03Icon,
  Moon02Icon,
  Notification01Icon,
  Settings02Icon,
  Sun03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Accordion } from '../../../../packages/design/src/components/accordion';
import { Button } from '../../../../packages/design/src/components/button';
import { Calendar } from '../../../../packages/design/src/components/calendar';
import { Checkbox } from '../../../../packages/design/src/components/checkbox';
import { PickerDate } from '../../../../packages/design/src/components/picker-date';
import { PickerTime } from '../../../../packages/design/src/components/picker-time';
import { Select } from '../../../../packages/design/src/components/select';
import { Slider } from '../../../../packages/design/src/components/slider';
import { Switch } from '../../../../packages/design/src/components/switch';
import { Tabs } from '../../../../packages/design/src/components/tabs';
import { ToggleGroup } from '../../../../packages/design/src/components/toggle-group';
import { TweenNumber } from '../../../../packages/design/src/components/tween-number';
import type { PlaygroundThemeName } from './playground-theme';
import { PLAYGROUND_THEMES, usePlaygroundTheme } from './playground-theme';

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

const playgroundThemeOptions = (
  Object.keys(PLAYGROUND_THEMES) as PlaygroundThemeName[]
).map((value) => ({
  value,
  label: PLAYGROUND_THEMES[value].label,
}));

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
    <div className='inline-flex items-center gap-2 text-xs font-medium text-fd-muted-foreground'>
      <span>{label}</span>
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
        <SelectControl
          label='Theme'
          value={theme}
          options={playgroundThemeOptions}
          onChange={setTheme}
        />
      </div>
      <div className='grid gap-4 rounded-md'>
        <div className='grid min-h-56 place-items-center rounded-md border border-momo-border-default bg-momo-bg-canvas p-6 text-momo-fg-default'>
          {children}
        </div>
        {state && (
          <div className='rounded-md border border-momo-border-default bg-momo-bg-surface-muted p-3 text-xs text-momo-fg-muted'>
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

export function CheckboxPlayground() {
  const [checked, setChecked] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [indeterminate, setIndeterminate] = useState(false);
  const [size, setSize] = useState<ControlSizeValue>('md');

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
          <CheckboxControl
            label='Read only'
            checked={readOnly}
            onChange={setReadOnly}
          />
          <CheckboxControl
            label='Mixed'
            checked={indeterminate}
            onChange={setIndeterminate}
          />
        </>
      }
      state={
        <code>
          checked: {String(checked)}; indeterminate: {String(indeterminate)};
          disabled: {String(disabled)}; readOnly: {String(readOnly)}; size:{' '}
          {size}
        </code>
      }
    >
      <label className='inline-flex max-w-sm items-start gap-3 text-left'>
        <Checkbox
          size={size}
          checked={checked}
          disabled={disabled}
          readOnly={readOnly}
          indeterminate={indeterminate}
          aria-label='Accept terms'
          onCheckedChange={(nextChecked) => {
            setChecked(nextChecked);
            setIndeterminate(false);
          }}
        />
        <span className='grid gap-1'>
          <span className='text-sm font-medium text-momo-fg-default'>
            Accept terms
          </span>
          <span className='text-xs text-momo-fg-muted'>
            Checkbox keeps Base UI form semantics and animates the indicator
            with motion.
          </span>
        </span>
      </label>
    </PlaygroundFrame>
  );
}

export function AccordionPlayground() {
  const [value, setValue] = useState<string[]>(['tokens']);

  return (
    <PlaygroundFrame state={<code>open: {value.join(', ') || 'none'}</code>}>
      <Accordion
        value={value}
        onValueChange={setValue}
        options={[
          {
            value: 'tokens',
            label: 'Semantic tokens',
            content:
              'Background, foreground, border, and ring colors resolve through the active momo theme.',
          },
          {
            value: 'motion',
            label: 'Motion first',
            content:
              'Disclosure height and focus feedback are animated with motion, while CSS stays focused on layout and tokens.',
          },
          {
            value: 'composition',
            label: 'Composable content',
            content:
              'Use Accordion for compact settings, grouped help, and details that should stay close to the control surface.',
          },
        ]}
      />
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
  const [readOnly, setReadOnly] = useState(false);

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
          <CheckboxControl
            label='Read only'
            checked={readOnly}
            onChange={setReadOnly}
          />
        </>
      }
      state={
        <code>
          value: {value}; size: {size}; disabled: {String(disabled)}; readOnly:{' '}
          {String(readOnly)}
        </code>
      }
    >
      <div className='w-full max-w-xs'>
        <Select
          size={size}
          value={value}
          disabled={disabled}
          readOnly={readOnly}
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
      <div className='inline-flex items-start gap-3'>
        <Switch
          checked={enabled}
          disabled={disabled}
          size={size}
          aria-label='Notifications'
          onCheckedChange={setEnabled}
        />
        <div className='grid gap-1 text-left'>
          <span className='text-sm font-medium text-momo-fg-default'>
            Notifications
          </span>
          <span className='text-xs text-momo-fg-muted'>
            Use the switch in controlled or uncontrolled forms.
          </span>
        </div>
      </div>
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
        <div className='inline-flex items-center justify-center gap-2 text-sm font-medium text-momo-fg-default'>
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
        <div className='inline-flex items-center justify-center gap-2 text-sm font-medium text-momo-fg-default'>
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
      <div className='flex items-center gap-3 text-momo-fg-default'>
        <Icon icon={Sun03Icon} />
        <Icon icon={Moon02Icon} />
        <span className='text-sm'>
          Hugeicons render through @hugeicons/react.
        </span>
      </div>
    </PlaygroundFrame>
  );
}
