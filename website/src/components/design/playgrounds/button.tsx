'use client';

import { useState } from 'react';

import { Settings02Icon } from '@hugeicons/core-free-icons';

import { Button } from '../../../../../packages/design/src/components/button';
import {
  CheckboxControl,
  Icon,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

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
  { value: 'inline', label: 'Inline' },
  { value: 'xs', label: 'Extra Small' },
  { value: 'sm', label: 'Small' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
  { value: 'icon', label: 'Icon' },
  { value: 'icon-xs', label: 'Icon Extra Small' },
  { value: 'icon-sm', label: 'Icon Small' },
  { value: 'icon-lg', label: 'Icon Large' },
] as const;

type ButtonVariant = (typeof buttonVariantOptions)[number]['value'];
type ButtonSize = (typeof buttonSizeOptions)[number]['value'];

export function ButtonPlayground() {
  const [clicks, setClicks] = useState(0);
  const [variant, setVariant] = useState<ButtonVariant>('default');
  const [size, setSize] = useState<ButtonSize>('default');
  const [disabled, setDisabled] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [showIcon, setShowIcon] = useState(false);
  const [label, setLabel] = useState('Button');
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
          <CheckboxControl
            label='Invalid'
            checked={invalid}
            onChange={setInvalid}
          />
          <CheckboxControl
            label='Icon'
            checked={showIcon}
            onChange={setShowIcon}
          />
          <TextControl label='Label' value={label} onChange={setLabel} />
        </>
      }
      state={
        <code>
          variant: {variant}; size: {size}; disabled: {String(disabled)};
          invalid: {String(invalid)}; icon: {String(showIcon || iconOnly)};
          clicks: {clicks}
        </code>
      }
    >
      <Button
        size={size}
        variant={variant}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-label={iconOnly ? label || 'Open settings' : undefined}
        onClick={() => {
          setClicks((count) => count + 1);
        }}
      >
        {(iconOnly || showIcon) && <Icon icon={Settings02Icon} />}
        {!iconOnly && (label || 'Button')}
      </Button>
    </PlaygroundFrame>
  );
}
