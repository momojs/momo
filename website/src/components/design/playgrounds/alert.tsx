'use client';

import { useState } from 'react';

import {
  Alert01Icon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  HelpCircleIcon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';

import type { AlertVariant } from '../../../../../packages/design/src/components/alert';
import { Alert } from '../../../../../packages/design/src/components/alert';
import { Button } from '../../../../../packages/design/src/components/button';
import {
  CheckboxControl,
  Icon,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const variantOptions = [
  { value: 'default', label: 'Default' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'danger', label: 'Danger' },
] as const;

const roleOptions = [
  { value: 'alert', label: 'Alert' },
  { value: 'status', label: 'Status' },
  { value: 'none', label: 'None' },
] as const;

type AlertRole = (typeof roleOptions)[number]['value'];

const icons = {
  default: HelpCircleIcon,
  info: InformationCircleIcon,
  success: CheckmarkCircle02Icon,
  warning: Alert01Icon,
  danger: AlertCircleIcon,
} as const;

export function AlertPlayground() {
  const [variant, setVariant] = useState<AlertVariant>('info');
  const [role, setRole] = useState<AlertRole>('alert');
  const [title, setTitle] = useState('Workspace updated');
  const [description, setDescription] = useState(
    'Your notification preferences are now synced across devices.',
  );
  const [showIcon, setShowIcon] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [showAction, setShowAction] = useState(true);

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Variant'
            value={variant}
            options={variantOptions}
            onChange={setVariant}
          />
          <SelectControl
            label='Role'
            value={role}
            options={roleOptions}
            onChange={setRole}
          />
          <TextControl label='Title' value={title} onChange={setTitle} />
          <TextControl
            label='Description'
            value={description}
            onChange={setDescription}
          />
          <CheckboxControl
            label='Icon'
            checked={showIcon}
            onChange={setShowIcon}
          />
          <CheckboxControl
            label='Description'
            checked={showDescription}
            onChange={setShowDescription}
          />
          <CheckboxControl
            label='Action'
            checked={showAction}
            onChange={setShowAction}
          />
        </>
      }
    >
      <Alert
        className='max-w-lg'
        variant={variant}
        role={role === 'none' ? null : role}
        icon={showIcon ? <Icon icon={icons[variant]} /> : undefined}
        title={title || 'Untitled alert'}
        description={showDescription ? description : undefined}
        action={
          showAction ? (
            <Button variant='outline' size='xs'>
              View activity
            </Button>
          ) : undefined
        }
      />
    </PlaygroundFrame>
  );
}
