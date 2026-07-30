'use client';

import { useState } from 'react';

import { Clock01Icon } from '@hugeicons/core-free-icons';

import { Badge } from '../../../../../packages/design/src/components/badge';
import type { ControlSizeValue } from './shared';
import {
  CheckboxControl,
  controlSizeOptions,
  Icon,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const badgeVariantOptions = [
  { value: 'default', label: 'Default' },
  { value: 'brand', label: 'Brand' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'danger', label: 'Danger' },
  { value: 'outline', label: 'Outline' },
] as const;

type BadgeVariant = (typeof badgeVariantOptions)[number]['value'];

export function BadgePlayground() {
  const [variant, setVariant] = useState<BadgeVariant>('default');
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [label, setLabel] = useState('In progress');
  const [showIcon, setShowIcon] = useState(true);
  const [interactive, setInteractive] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [invalid, setInvalid] = useState(false);

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Variant'
            value={variant}
            options={badgeVariantOptions}
            onChange={setVariant}
          />
          <SelectControl
            label='Size'
            value={size}
            options={controlSizeOptions}
            onChange={setSize}
          />
          <TextControl label='Label' value={label} onChange={setLabel} />
          <CheckboxControl
            label='Icon'
            checked={showIcon}
            onChange={setShowIcon}
          />
          <CheckboxControl
            label='Anchor'
            checked={interactive}
            onChange={setInteractive}
          />
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
          />
          <CheckboxControl
            label='Invalid'
            checked={invalid}
            onChange={setInvalid}
          />
        </>
      }
      state={
        <code>
          label: {label || 'empty'}; variant: {variant}; size: {size}; render:{' '}
          {interactive ? 'anchor' : 'span'}; disabled: {String(disabled)};
          invalid: {String(invalid)}
        </code>
      }
    >
      <Badge
        id='badge-playground'
        variant={variant}
        size={size}
        render={interactive ? <a href='#badge-playground' /> : undefined}
        aria-disabled={disabled || undefined}
        aria-invalid={invalid || undefined}
      >
        {showIcon && <Icon icon={Clock01Icon} />}
        {label || 'Badge'}
      </Badge>
    </PlaygroundFrame>
  );
}
