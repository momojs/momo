import { describe, expect, mock, test } from 'bun:test';

import { createToastManager } from './store';

describe('Toast store edge cases', () => {
  test('treats an empty id as a single notification and undefined as close all', () => {
    const manager = createToastManager();
    const closed = mock(() => undefined);
    manager.add({ id: '', onClose: closed });
    manager.add({ id: 'other' });
    manager.close('');
    expect(manager.toasts.map((toast) => toast.id)).toEqual(['other']);
    expect(closed).toHaveBeenCalledTimes(1);
    manager.close('missing');
    expect(manager.toasts).toHaveLength(1);
    manager.close();
    expect(manager.toasts).toHaveLength(0);
  });

  test('propagates a success resolver failure without running the operation error resolver', async () => {
    const manager = createToastManager();
    const failure = new Error('Could not format success');
    const error = mock(() => ({ title: 'Operation failed' }));
    manager.add({ id: 'unrelated' });
    await expect(
      manager.promise(Promise.resolve('saved'), {
        loading: { id: 'operation' },
        success: () => {
          throw failure;
        },
        error,
      }),
    ).rejects.toBe(failure);
    expect(error).not.toHaveBeenCalled();
    expect(manager.toasts.map((toast) => toast.id)).toEqual(['unrelated']);
  });

  test('clears loading when the operation error resolver also fails', async () => {
    const manager = createToastManager();
    const operationError = new Error('Offline');
    const presentationError = new Error('Could not format error');
    await expect(
      manager.promise(() => Promise.reject(operationError), {
        loading: { id: 'operation' },
        success: { title: 'Done' },
        error: (error) => {
          expect(error).toBe(operationError);
          throw presentationError;
        },
      }),
    ).rejects.toBe(presentationError);
    expect(manager.toasts).toHaveLength(0);
  });

  test('keeps successful update subscriber failures out of the operation error branch', async () => {
    const manager = createToastManager();
    const failure = new Error('Subscriber failed');
    const error = mock(() => ({ title: 'Operation failed' }));
    manager.subscribe(() => {
      if (manager.toasts[0]?.type === 'success') throw failure;
    });
    await expect(
      manager.promise(Promise.resolve('saved'), {
        loading: { id: 'operation' },
        success: { title: 'Done' },
        error,
      }),
    ).rejects.toBe(failure);
    expect(error).not.toHaveBeenCalled();
    expect(manager.toasts).toHaveLength(0);
  });

  test('does not resurrect a notification dismissed before its promise resolves', async () => {
    const manager = createToastManager();
    const operation = Promise.withResolvers<string>();
    const result = manager.promise(operation.promise, {
      loading: { id: 'operation' },
      success: (title) => ({ title }),
      error: { title: 'Failed' },
    });
    manager.close('operation');
    operation.resolve('Saved');
    await expect(result).resolves.toBe('Saved');
    expect(manager.toasts).toHaveLength(0);
  });
});
