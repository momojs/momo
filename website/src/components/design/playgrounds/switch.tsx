'use client';

import { useState } from 'react';

import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';

import { Switch } from '../../../../../packages/design/src/components/switch';
import type { ControlSizeValue } from './shared';
import {
  CheckboxControl,
  controlSizeOptions,
  Icon,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

export function SwitchPlayground() {
  const [enabled, setEnabled] = useState(true);
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [required, setRequired] = useState(false);
  const [showIcons, setShowIcons] = useState(false);
  const [label, setLabel] = useState('Notifications');

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
          <CheckboxControl
            label='Checked'
            checked={enabled}
            onChange={setEnabled}
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
            label='Icons'
            checked={showIcons}
            onChange={setShowIcons}
          />
        </>
      }
      state={
        <code>
          checked: {String(enabled)}; size: {size}; disabled: {String(disabled)}
          ; readOnly: {String(readOnly)}; required: {String(required)}; icons:{' '}
          {String(showIcons)}
        </code>
      }
    >
      <div className='inline-flex items-start gap-3'>
        <Switch
          checked={enabled}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          size={size}
          checkedIcon={showIcons ? <Icon icon={Sun03Icon} /> : undefined}
          uncheckedIcon={showIcons ? <Icon icon={Moon02Icon} /> : undefined}
          aria-label={label || 'Switch'}
          onCheckedChange={setEnabled}
        />
        <div className='grid gap-1 text-left'>
          <span className='text-sm font-medium text-momo-fg-default'>
            {label || 'Switch'}
          </span>
          <span className='text-xs text-momo-fg-muted'>
            Use the switch in controlled or uncontrolled forms.
          </span>
        </div>
      </div>
    </PlaygroundFrame>
  );
}
