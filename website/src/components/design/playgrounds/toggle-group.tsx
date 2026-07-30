'use client';

import { useState } from 'react';

import {
  AlignHorizontalCenterIcon,
  AlignHorizontalJustifyCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
} from '@hugeicons/core-free-icons';

import { ToggleGroup } from '../../../../../packages/design/src/components/toggle-group';
import type { ControlSizeValue } from './shared';
import {
  CheckboxControl,
  controlSizeOptions,
  Icon,
  PlaygroundFrame,
  SelectControl,
} from './shared';

const toggleGroupVariantOptions = [
  { value: 'button', label: 'Button' },
  { value: 'segmented', label: 'Segmented' },
  { value: 'tabbar', label: 'Tabbar' },
] as const;

const toggleValueOptions = [
  { value: 'none', label: 'None' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
] as const;

type ToggleGroupVariant = (typeof toggleGroupVariantOptions)[number]['value'];
type ToggleValue = Exclude<
  (typeof toggleValueOptions)[number]['value'],
  'none'
>;

export function ToggleGroupPlayground() {
  const [value, setValue] = useState<ToggleValue | undefined>('center');
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [variant, setVariant] = useState<ToggleGroupVariant>('button');
  const [showIcons, setShowIcons] = useState(true);
  const [disableRight, setDisableRight] = useState(false);

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
          <SelectControl
            label='Value'
            value={value ?? 'none'}
            options={toggleValueOptions}
            onChange={(next) => setValue(next === 'none' ? undefined : next)}
          />
          <CheckboxControl
            label='Icons'
            checked={showIcons}
            onChange={setShowIcons}
          />
          <CheckboxControl
            label='Disable right'
            checked={disableRight}
            onChange={(next) => {
              setDisableRight(next);
              if (next && value === 'right') setValue(undefined);
            }}
          />
        </>
      }
      state={
        <code>
          value: {value ?? 'none'}; size: {size}; variant: {variant}; icons:{' '}
          {String(showIcons)}; rightDisabled: {String(disableRight)}
        </code>
      }
    >
      <ToggleGroup
        size={size}
        value={value}
        variant={variant}
        onChange={(next) => {
          setValue(next);
          return next;
        }}
        options={[
          {
            value: 'left',
            label: 'Left',
            icon: showIcons ? <Icon icon={AlignLeftIcon} /> : undefined,
          },
          {
            value: 'center',
            label: 'Center',
            icon: showIcons ? (
              <Icon icon={AlignHorizontalCenterIcon} />
            ) : undefined,
          },
          {
            value: 'right',
            label: 'Right',
            disabled: disableRight,
            icon: showIcons ? <Icon icon={AlignRightIcon} /> : undefined,
          },
          {
            value: 'justify',
            label: 'Justify',
            icon: showIcons ? (
              <Icon icon={AlignHorizontalJustifyCenterIcon} />
            ) : undefined,
          },
        ]}
      />
    </PlaygroundFrame>
  );
}
