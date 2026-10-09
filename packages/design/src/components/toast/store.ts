import type { ReactNode } from 'react';

import type { Realizable } from '@momots/core';
import { realize } from '@momots/core';
import type { HTMLMotionProps } from 'motion/react';

import type { ContentProps } from '../../shared/content.js';
import type { ControlDirection } from '../../shared/control.js';

export type ToastType =
  | 'default'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'loading';
export type ToastPriority = 'low' | 'high';
export type ToastSwipeDirection = ControlDirection;
export type ToastCloseReason =
  | 'close'
  | 'escape'
  | 'programmatic'
  | 'swipe'
  | 'timeout';

export interface ToastActionOptions
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: ReactNode;
}

export interface ToastOptions<Data extends object = Record<string, unknown>>
  extends Pick<ContentProps, 'title' | 'description'> {
  id?: string;
  type?: ToastType;
  priority?: ToastPriority;
  timeout?: number;
  actionProps?: ToastActionOptions;
  data?: Data;
  onClose?: (reason: ToastCloseReason) => void;
  onRemove?: () => void;
}

export interface ToastObject<Data extends object = Record<string, unknown>>
  extends Omit<ToastOptions<Data>, 'id'> {
  id: string;
  /** Increments whenever the same toast is updated, resetting its timer. */
  updateKey?: number;
}

export type ToastUpdateOptions<Data extends object = Record<string, unknown>> =
  Partial<Omit<ToastOptions<Data>, 'id'>>;

export type ToastPromiseResolver<
  Value,
  Data extends object = Record<string, unknown>,
> = Realizable<ToastOptions<Data>, [Value]>;

export interface ToastPromiseOptions<
  Value,
  Data extends object = Record<string, unknown>,
> {
  loading: ToastOptions<Data>;
  success: ToastPromiseResolver<Value, Data>;
  error: ToastPromiseResolver<unknown, Data>;
}

export interface ToastManager<Data extends object = Record<string, unknown>> {
  readonly toasts: readonly ToastObject<Data>[];
  add(options: ToastOptions<Data>): string;
  update(id: string, options: ToastUpdateOptions<Data>): void;
  close(id?: string, reason?: ToastCloseReason): void;
  promise<Value>(
    value: Realizable<PromiseLike<Value>>,
    options: ToastPromiseOptions<Value, Data>,
  ): Promise<Value>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): readonly ToastObject<Data>[];
}

export interface ToastController<Data extends object = Record<string, unknown>>
  extends Pick<ToastManager<Data>, 'add' | 'close' | 'promise' | 'update'> {
  readonly toasts: readonly ToastObject<Data>[];
}

let generatedToastId = 0;

function createToastId() {
  generatedToastId += 1;
  return `momo-toast-${generatedToastId.toString(36)}`;
}

/** Creates a framework-independent toast store that can also be used outside React. */
export function createToastManager<
  Data extends object = Record<string, unknown>,
>(): ToastManager<Data> {
  let snapshot: readonly ToastObject<Data>[] = [];
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };

  const patch = (index: number, options: ToastUpdateOptions<Data>) => {
    const existing = snapshot[index]!;
    const next = [...snapshot];
    next[index] = {
      ...existing,
      ...options,
      id: existing.id,
      updateKey: (existing.updateKey ?? 0) + 1,
    };
    snapshot = next;
  };

  // Resolver/subscriber failures are presentation errors, never operation errors.
  const settle = <Value>(
    id: string,
    resolver: ToastPromiseResolver<Value, Data>,
    value: Value,
    type: 'success' | 'danger',
  ) => {
    try {
      const outcome = realize(resolver, value);
      manager.update(id, {
        ...outcome,
        type: outcome.type ?? type,
        timeout: outcome.timeout,
      });
    } catch (error) {
      manager.close(id);
      throw error;
    }
  };

  const manager: ToastManager<Data> = {
    get toasts() {
      return snapshot;
    },
    add(options) {
      const id = options.id ?? createToastId();
      const existingIndex = snapshot.findIndex((toast) => toast.id === id);

      if (existingIndex >= 0) {
        patch(existingIndex, options);
      } else {
        snapshot = [{ ...options, id, updateKey: 0 }, ...snapshot];
      }
      emit();
      return id;
    },
    update(id, options) {
      const index = snapshot.findIndex((toast) => toast.id === id);
      if (index < 0) return;
      patch(index, options);
      emit();
    },
    close(id, reason = 'programmatic') {
      const removed =
        id !== undefined
          ? snapshot.filter((toast) => toast.id === id)
          : [...snapshot];
      if (removed.length === 0) return;
      snapshot =
        id !== undefined ? snapshot.filter((toast) => toast.id !== id) : [];
      emit();
      for (const toast of removed) toast.onClose?.(reason);
    },
    async promise<Value>(
      value: Realizable<PromiseLike<Value>>,
      options: ToastPromiseOptions<Value, Data>,
    ) {
      const loading = options.loading;
      const id = manager.add({
        ...loading,
        type: loading.type ?? 'loading',
        timeout: loading.timeout ?? 0,
      });

      let result: Value;
      try {
        result = await realize(value);
      } catch (error) {
        settle(id, options.error, error, 'danger');
        throw error;
      }
      settle(id, options.success, result, 'success');
      return result;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
  };

  return manager;
}
