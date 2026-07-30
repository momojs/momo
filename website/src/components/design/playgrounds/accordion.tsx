'use client';

import { useState } from 'react';

import { Accordion } from '../../../../../packages/design/src/components/accordion';
import { CheckboxControl, PlaygroundFrame } from './shared';

export function AccordionPlayground() {
  const [value, setValue] = useState<string[]>(['tokens']);
  const [multiple, setMultiple] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [keepMounted, setKeepMounted] = useState(false);
  const [hiddenUntilFound, setHiddenUntilFound] = useState(false);

  return (
    <PlaygroundFrame
      controls={
        <>
          <CheckboxControl
            label='Multiple'
            checked={multiple}
            onChange={(next) => {
              setMultiple(next);
              if (!next) setValue((current) => current.slice(0, 1));
            }}
          />
          <CheckboxControl
            label='Disabled'
            checked={disabled}
            onChange={setDisabled}
          />
          <CheckboxControl
            label='Keep mounted'
            checked={keepMounted}
            onChange={setKeepMounted}
          />
          <CheckboxControl
            label='Until found'
            checked={hiddenUntilFound}
            onChange={setHiddenUntilFound}
          />
        </>
      }
      state={
        <code>
          open: {value.join(', ') || 'none'}; multiple: {String(multiple)};
          disabled: {String(disabled)}; keepMounted: {String(keepMounted)};
          hiddenUntilFound: {String(hiddenUntilFound)}
        </code>
      }
    >
      <Accordion
        value={value}
        multiple={multiple}
        disabled={disabled}
        keepMounted={keepMounted}
        hiddenUntilFound={hiddenUntilFound}
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
