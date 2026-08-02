'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { HighlightTriggerType } from '../../../../../packages/design/src/effects/highlight';
import {
  Highlight,
  useHighlightLayer,
  useHighlightRegistrar,
  useHighlightTrigger,
} from '../../../../../packages/design/src/effects/highlight';
import { CheckboxControl, PlaygroundFrame, SelectControl } from './shared';

const triggerOptions = [
  { value: 'hover', label: 'Hover' },
  { value: 'click', label: 'Click' },
  { value: 'focus', label: 'Focus' },
] as const;

const items = [
  { value: 'overview', label: 'Overview' },
  { value: 'activity', label: 'Activity' },
  { value: 'settings', label: 'Settings' },
] as const;

type ItemValue = (typeof items)[number]['value'];

export function HighlightPlayground() {
  const [selected, setSelected] = useState<ItemValue>('overview');
  const [trigger, setTrigger] = useState<HighlightTriggerType>('hover');
  const [enabled, setEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const previewLayer = useHighlightLayer<HTMLButtonElement, HTMLDivElement>(
    containerRef,
    { enabled },
  );
  const selectedLayer = useHighlightLayer<HTMLButtonElement, HTMLDivElement>(
    containerRef,
  );
  const previewTrigger = useHighlightTrigger(previewLayer, {
    enabled,
    trigger,
  });
  const selectedRegistrar = useHighlightRegistrar(selectedLayer);

  useLayoutEffect(() => {
    selectedRegistrar.activate(selected);
  }, [selected, selectedRegistrar.activate]);

  useEffect(() => {
    previewLayer.clear();
  }, [previewLayer.clear, trigger]);

  const selectedStyle = selectedLayer.style
    ? { ...selectedLayer.style, zIndex: 1 }
    : null;

  return (
    <PlaygroundFrame
      controls={
        <>
          <SelectControl
            label='Trigger'
            value={trigger}
            options={triggerOptions}
            onChange={setTrigger}
          />
          <CheckboxControl
            label='Preview highlight'
            checked={enabled}
            onChange={setEnabled}
          />
        </>
      }
      state={
        <code>
          selected: {selected}; trigger: {trigger}; preview: {String(enabled)}
        </code>
      }
    >
      <div
        ref={containerRef}
        className='relative inline-flex flex-wrap gap-momo-xxs rounded-momo-lg border border-momo-border-default bg-momo-bg-surface-muted p-momo-xxs shadow-momo-sm'
      >
        <Highlight
          className='rounded-momo-md bg-momo-bg-surface-raised'
          highlightStyle={previewLayer.style}
        />
        <Highlight
          className='rounded-momo-md bg-momo-bg-brand shadow-momo-sm'
          highlightStyle={selectedStyle}
        />
        {items.map((item) => (
          <button
            key={item.value}
            ref={selectedRegistrar.register(item.value)}
            type='button'
            className={`relative z-9 h-9 rounded-momo-md px-momo-md text-momo-body-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-momo-ring-focus/45 ${
              selected === item.value
                ? 'text-momo-fg-on-brand'
                : 'text-momo-fg-muted'
            }`}
            {...previewTrigger.getReferenceProps({
              onClick: () => setSelected(item.value),
            })}
          >
            {item.label}
          </button>
        ))}
      </div>
    </PlaygroundFrame>
  );
}
