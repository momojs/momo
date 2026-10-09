'use client';

import { useState } from 'react';

import {
  Layout03Icon,
  Notification01Icon,
  Settings02Icon,
} from '@hugeicons/core-free-icons';

import { Tabs } from '../../../../../packages/design/src/components/tabs';
import {
  CheckboxControl,
  Icon,
  PlaygroundFrame,
  SelectControl,
} from './shared';

const orientationOptions = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
] as const;

const tabValueOptions = [
  { value: 'overview', label: 'Overview' },
  { value: 'usage', label: 'Usage' },
  { value: 'settings', label: 'Settings' },
] as const;

type TabsOrientation = (typeof orientationOptions)[number]['value'];
type TabValue = (typeof tabValueOptions)[number]['value'];

export function TabsPlayground() {
  const [value, setValue] = useState<TabValue>('overview');
  const [orientation, setOrientation] = useState<TabsOrientation>('horizontal');
  const [showIcons, setShowIcons] = useState(true);
  const [disableUsage, setDisableUsage] = useState(false);

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Value'
            value={value}
            options={tabValueOptions}
            onChange={setValue}
          />
          <SelectControl
            label='Orientation'
            value={orientation}
            options={orientationOptions}
            onChange={setOrientation}
          />
          <CheckboxControl
            label='Icons'
            checked={showIcons}
            onChange={setShowIcons}
          />
          <CheckboxControl
            label='Disable usage'
            checked={disableUsage}
            onChange={(next) => {
              setDisableUsage(next);
              if (next && value === 'usage') setValue('overview');
            }}
          />
        </>
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
            icon: showIcons ? <Icon icon={Layout03Icon} /> : undefined,
            content: 'A compact component surface built from Base UI Tabs.',
          },
          {
            value: 'usage',
            label: 'Usage',
            disabled: disableUsage,
            icon: showIcons ? <Icon icon={Notification01Icon} /> : undefined,
            content: [
              'Use value/onChange for controlled flows or defaultValue for local state.',
              'Use value/onChange for controlled flows or defaultValue for local state.',
              'Use value/onChange for controlled flows or defaultValue for local state.',
            ].join('\n'),
          },
          {
            value: 'settings',
            label: 'Settings',
            icon: showIcons ? <Icon icon={Settings02Icon} /> : undefined,
            content: [
              'Panels inherit the default Tailwind theme and stay unstyled enough to compose.',
              'Panels inherit the default Tailwind theme and stay unstyled enough to compose.',
            ].join('\n'),
          },
        ]}
      />
    </PlaygroundFrame>
  );
}
