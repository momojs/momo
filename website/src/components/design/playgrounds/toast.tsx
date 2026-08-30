'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '../../../../../packages/design/src/components/button';
import type {
  ToastPlacement,
  ToastType,
} from '../../../../../packages/design/src/components/toast';
import {
  ToastProvider,
  useToast,
} from '../../../../../packages/design/src/components/toast';
import {
  CheckboxControl,
  NumberControl,
  PlaygroundFrame,
  SelectControl,
  TextControl,
} from './shared';

const typeOptions = [
  { value: 'default', label: 'Default' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'danger', label: 'Danger' },
] as const;

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
] as const;

const placementOptions = [
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'bottom-center', label: 'Bottom center' },
  { value: 'top-right', label: 'Top right' },
  { value: 'top-center', label: 'Top center' },
] as const;

type ToastPriority = (typeof priorityOptions)[number]['value'];

interface ToastDemoProps {
  type: Exclude<ToastType, 'loading'>;
  priority: ToastPriority;
  title: string;
  description: string;
  persistent: boolean;
  showAction: boolean;
  onCountChange: (count: number) => void;
  onLatestIdChange: (id: string | null) => void;
}

function ToastDemo({
  type,
  priority,
  title,
  description,
  persistent,
  showAction,
  onCountChange,
  onLatestIdChange,
}: ToastDemoProps) {
  const toast = useToast();
  const latestId = useRef<string | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    onCountChange(toast.toasts.length);
  }, [onCountChange, toast.toasts.length]);

  function nextId(prefix = 'toast') {
    sequence.current += 1;
    return `toast-playground-${prefix}-${sequence.current}`;
  }

  function syncState(id: string | null) {
    latestId.current = id;
    onLatestIdChange(id);
  }

  function clearLatest(id: string) {
    if (latestId.current === id) syncState(null);
  }

  function addToast() {
    const toastId = nextId();
    const id = toast.add({
      id: toastId,
      title: title || `Notification ${sequence.current}`,
      description,
      type,
      priority,
      timeout: persistent ? 0 : undefined,
      onRemove: () => clearLatest(toastId),
      actionProps: showAction
        ? {
            children: 'Undo',
            onClick: () => {
              toast.update(toastId, {
                type: 'success',
                title: 'Action undone',
                description: 'The previous change was restored.',
              });
            },
          }
        : undefined,
    });
    syncState(id);
  }

  function burst() {
    let id: string | null = null;
    for (let index = 1; index <= 5; index += 1) {
      const toastId = nextId('queue');
      id = toast.add({
        id: toastId,
        title: `Queued notification ${index}`,
        description: 'Motion keeps the compact stack moving as one system.',
        type: index === 5 ? type : 'default',
        priority,
        timeout: persistent ? 0 : undefined,
        onRemove: () => clearLatest(toastId),
      });
    }
    syncState(id);
  }

  function runPromise() {
    const operation = new Promise<string>((resolve) => {
      window.setTimeout(() => resolve('12 files'), 1200);
    });

    void toast.promise(operation, {
      loading: { title: 'Publishing changes' },
      success: (result) => ({
        title: 'Changes published',
        description: `${result} are now available.`,
        type: 'success',
      }),
      error: {
        title: 'Publish failed',
        type: 'error',
        priority: 'high',
      },
    });
  }

  function updateLatest() {
    if (!latestId.current) return;
    toast.update(latestId.current, {
      type: 'success',
      title: 'Notification updated',
      description: 'The existing toast was updated in place.',
    });
  }

  return (
    <div className='flex max-w-sm flex-wrap justify-center gap-momo-xs'>
      <Button size='sm' onClick={addToast}>
        Add toast
      </Button>
      <Button variant='secondary' size='sm' onClick={burst}>
        Add five
      </Button>
      <Button variant='outline' size='sm' onClick={updateLatest}>
        Update latest
      </Button>
      <Button variant='outline' size='sm' onClick={runPromise}>
        Promise success
      </Button>
      <Button
        variant='ghost'
        size='sm'
        disabled={!latestId.current}
        onClick={() => {
          if (!latestId.current) return;
          toast.close(latestId.current);
          syncState(null);
        }}
      >
        Close latest
      </Button>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => {
          toast.close();
          syncState(null);
        }}
      >
        Close all
      </Button>
    </div>
  );
}

export function ToastPlayground() {
  const [type, setType] = useState<Exclude<ToastType, 'loading'>>('success');
  const [priority, setPriority] = useState<ToastPriority>('low');
  const [placement, setPlacement] = useState<ToastPlacement>('bottom-right');
  const [title, setTitle] = useState('Workspace saved');
  const [description, setDescription] = useState(
    'Your latest changes are available to collaborators.',
  );
  const [timeout, setTimeout] = useState(5000);
  const [limit, setLimit] = useState(4);
  const [persistent, setPersistent] = useState(false);
  const [showAction, setShowAction] = useState(true);
  const [count, setCount] = useState(0);
  const [latestId, setLatestId] = useState<string | null>(null);

  return (
    <ToastProvider placement={placement} timeout={timeout} limit={limit}>
      <PlaygroundFrame
        controls={
          <>
            <SelectControl
              label='Type'
              value={type}
              options={typeOptions}
              onChange={setType}
            />
            <SelectControl
              label='Priority'
              value={priority}
              options={priorityOptions}
              onChange={setPriority}
            />
            <SelectControl
              label='Placement'
              value={placement}
              options={placementOptions}
              onChange={setPlacement}
            />
            <TextControl label='Title' value={title} onChange={setTitle} />
            <TextControl
              label='Description'
              value={description}
              onChange={setDescription}
            />
            <NumberControl
              label='Timeout'
              value={timeout}
              min={0}
              step={500}
              onChange={setTimeout}
            />
            <NumberControl
              label='Limit'
              value={limit}
              min={1}
              max={8}
              step={1}
              onChange={setLimit}
            />
            <CheckboxControl
              label='Persistent'
              checked={persistent}
              onChange={setPersistent}
            />
            <CheckboxControl
              label='Action'
              checked={showAction}
              onChange={setShowAction}
            />
          </>
        }
        state={
          <code>
            type: {type}; placement: {placement}; priority: {priority}; managed:{' '}
            {count}; latest: {latestId ? 'yes' : 'none'}
          </code>
        }
      >
        <ToastDemo
          type={type}
          priority={priority}
          title={title}
          description={description}
          persistent={persistent}
          showAction={showAction}
          onCountChange={setCount}
          onLatestIdChange={setLatestId}
        />
      </PlaygroundFrame>
    </ToastProvider>
  );
}
