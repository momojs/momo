'use client';

import { useState } from 'react';

import type {
  SkeletonShape,
  SkeletonVariant,
} from '../../../../../packages/design/src/components/skeleton';
import {
  Skeleton,
  SkeletonReveal,
  SkeletonText,
} from '../../../../../packages/design/src/components/skeleton';
import {
  CheckboxControl,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const variantOptions = [
  { value: 'shimmer', label: 'Shimmer' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'solid', label: 'Solid' },
] as const;

const shapeOptions = [
  { value: 'sm', label: 'sm' },
  { value: 'md', label: 'md' },
  { value: 'lg', label: 'lg' },
  { value: 'pill', label: 'pill' },
  { value: 'circle', label: 'circle' },
  { value: 'none', label: 'none' },
] as const;

export function SkeletonPlayground() {
  const [variant, setVariant] = useState<SkeletonVariant>('shimmer');
  const [shape, setShape] = useState<SkeletonShape>('md');
  const [className, setClassName] = useState('h-24 w-full');
  const [asText, setAsText] = useState(false);
  const [pending, setPending] = useState(true);
  const [lines, setLines] = useState('3');
  const [lastLineRatio, setLastLineRatio] = useState('0.6');

  const parsedLines = Number(lines);
  const parsedRatio = Number(lastLineRatio);

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
          <CheckboxControl label='Text' checked={asText} onChange={setAsText} />
          <CheckboxControl
            label='Handoff'
            checked={pending}
            onChange={setPending}
          />
          {asText ? (
            <>
              <TextControl label='Lines' value={lines} onChange={setLines} />
              <TextControl
                label='Last line'
                value={lastLineRatio}
                onChange={setLastLineRatio}
              />
            </>
          ) : (
            <>
              <SelectControl
                label='Shape'
                value={shape}
                options={shapeOptions}
                onChange={setShape}
              />
              <TextControl
                label='Class'
                value={className}
                onChange={setClassName}
              />
            </>
          )}
        </>
      }
    >
      <div className='w-full max-w-sm' aria-busy={pending || undefined}>
        <SkeletonReveal
          pending={pending}
          fallback={
            asText ? (
              <SkeletonText variant={variant} lines={parsedLines} />
            ) : (
              <Skeleton variant={variant} shape={shape} className={className} />
            )
          }
        >
          {asText ? (
            <SkeletonText
              variant={variant}
              lines={Number.isFinite(parsedLines) ? parsedLines : 1}
              lastLineRatio={
                Number.isFinite(parsedRatio) ? parsedRatio : undefined
              }
              className='text-momo-body-sm'
            />
          ) : (
            <Skeleton variant={variant} shape={shape} className={className} />
          )}
        </SkeletonReveal>
      </div>
    </PlaygroundFrame>
  );
}
