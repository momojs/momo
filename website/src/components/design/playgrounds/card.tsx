'use client';

import { useState } from 'react';

import { Badge } from '../../../../../packages/design/src/components/badge';
import { Button } from '../../../../../packages/design/src/components/button';
import type { CardVariant } from '../../../../../packages/design/src/components/card';
import { Card } from '../../../../../packages/design/src/components/card';
import type { ControlSizeValue } from './shared';
import {
  CheckboxControl,
  controlSizeOptions,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const variantOptions = [
  { value: 'default', label: 'Default' },
  { value: 'outline', label: 'Outline' },
  { value: 'ghost', label: 'Ghost' },
] as const;

export function CardPlayground() {
  const [variant, setVariant] = useState<CardVariant>('default');
  const [size, setSize] = useState<ControlSizeValue>('md');
  const [title, setTitle] = useState('团队工作区');
  const [description, setDescription] = useState(
    '集中管理项目、成员与共享资源。',
  );
  const [showHeader, setShowHeader] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [showContent, setShowContent] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [joined, setJoined] = useState(false);

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
            label='Size'
            value={size}
            options={controlSizeOptions}
            onChange={setSize}
          />
          <TextControl label='Title' value={title} onChange={setTitle} />
          <TextControl
            label='Description'
            value={description}
            onChange={setDescription}
          />
          <CheckboxControl
            label='Header'
            checked={showHeader}
            onChange={setShowHeader}
          />
          <CheckboxControl
            label='Description'
            checked={showDescription}
            onChange={setShowDescription}
          />
          <CheckboxControl
            label='Content'
            checked={showContent}
            onChange={setShowContent}
          />
          <CheckboxControl
            label='Footer'
            checked={showFooter}
            onChange={setShowFooter}
          />
        </>
      }
    >
      <Card
        className='w-full max-w-sm'
        variant={variant}
        size={size}
        title={title}
        description={showDescription ? description : undefined}
        slots={{ header: showHeader ? undefined : false }}
        footer={
          showFooter ? (
            <Button
              size='sm'
              variant={joined ? 'outline' : 'default'}
              onClick={() => setJoined(!joined)}
            >
              {joined ? '退出工作区' : '加入工作区'}
            </Button>
          ) : undefined
        }
      >
        {showContent && (
          <div className='grid gap-momo-sm'>
            <Badge variant={joined ? 'success' : 'outline'} className='w-fit'>
              {joined ? '已加入' : '可加入'}
            </Badge>
            <dl className='grid grid-cols-2 gap-momo-sm'>
              <div>
                <dt className='text-momo-caption text-momo-fg-muted'>项目</dt>
                <dd className='text-momo-title-sm'>12</dd>
              </div>
              <div>
                <dt className='text-momo-caption text-momo-fg-muted'>成员</dt>
                <dd className='text-momo-title-sm'>8</dd>
              </div>
            </dl>
          </div>
        )}
      </Card>
    </PlaygroundFrame>
  );
}
