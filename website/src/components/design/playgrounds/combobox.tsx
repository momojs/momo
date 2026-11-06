'use client';

import { useId, useState } from 'react';

import { DirectionProvider } from '@base-ui/react/direction-provider';
import { Code2 } from 'lucide-react';

import { useSiteTranslations } from '@/lib/site-translations';

import { Combobox } from '../../../../../packages/design/src/components/combobox';
import type { ControlSizeValue } from './shared';
import {
  CheckboxControl,
  controlSizeOptions,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const options = [
  {
    value: 'react',
    label: 'React',
    icon: <Code2 className='size-4' aria-hidden />,
    extra: '组件库',
  },
  { value: 'vue', label: 'Vue', extra: '渐进式框架' },
  {
    value: 'svelte',
    label: 'Svelte',
    icon: <Code2 className='size-4' aria-hidden />,
    extra: '编译时优化与响应式组件开发',
  },
  { value: 'solid', label: 'Solid', disabled: true },
  { value: 'angular', label: 'Angular' },
];

export function ComboboxPlayground() {
  const t = useSiteTranslations();
  const id = useId();
  const [value, setValue] = useState<string | null>('react');
  const [values, setValues] = useState<string[]>(['react', 'vue']);
  const [multiple, setMultiple] = useState(false);
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [clearable, setClearable] = useState(true);
  const [rtl, setRtl] = useState(false);
  const [placeholder, setPlaceholder] = useState(t('搜索框架…'));
  const direction = rtl ? 'rtl' : 'ltr';
  const shared = {
    options: options.map((option) => ({
      ...option,
      extra: t(option.extra ?? ''),
    })),
    size,
    disabled,
    readOnly,
    clearable,
    placeholder,
    emptyText: t('没有匹配的框架'),
    slots: { input: { id } },
  };
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
            label='Multiple'
            checked={multiple}
            onChange={setMultiple}
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
            label='Clearable'
            checked={clearable}
            onChange={setClearable}
          />
          <CheckboxControl label='RTL' checked={rtl} onChange={setRtl} />
          <TextControl
            label='Placeholder'
            value={placeholder}
            onChange={setPlaceholder}
          />
        </>
      }
    >
      <DirectionProvider direction={direction}>
        <div dir={direction} className='grid w-full max-w-sm gap-momo-sm'>
          <label htmlFor={id} className='text-momo-body-sm'>
            {t('选择框架')}
          </label>
          {multiple ? (
            <Combobox
              key='multiple'
              {...shared}
              multiple
              value={values}
              onChange={setValues}
            />
          ) : (
            <Combobox
              key='single'
              {...shared}
              value={value}
              onChange={setValue}
            />
          )}
          <output className='text-momo-caption text-momo-fg-muted'>
            value: {JSON.stringify(multiple ? values : value)}
          </output>
        </div>
      </DirectionProvider>
    </PlaygroundFrame>
  );
}
