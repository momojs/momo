import { describe, expect, mock, test } from 'bun:test';

import type { ToastManager } from './toast';
import { createToastManager } from './toast';

const toastModuleUrl = new URL('./toast.tsx', import.meta.url).href;

function renderToastScenario(source: string) {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      '--eval',
      `
        import { createElement } from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import {
          ToastProvider,
          createToastManager,
          useToast,
        } from ${JSON.stringify(toastModuleUrl)};

        ${source}
      `,
    ],
    cwd: new URL('../..', import.meta.url).pathname,
    stderr: 'pipe',
    stdout: 'pipe',
  });
  const stderr = new TextDecoder().decode(result.stderr);
  const stdout = new TextDecoder().decode(result.stdout);
  if (result.exitCode !== 0) {
    throw new Error(stderr || stdout);
  }
  expect(stderr).toBe('');
  return stdout;
}

describe('createToastManager', () => {
  test('adds newest-first, updates a stable id, and publishes stable snapshots', () => {
    const manager = createToastManager<{ source: string }>();
    const listener = mock(() => undefined);
    const unsubscribe = manager.subscribe(listener);

    const first = manager.add({
      id: 'first',
      title: 'First',
      data: { source: 'editor' },
    });
    const second = manager.add({
      id: 'second',
      title: 'Second',
      data: { source: 'settings' },
    });

    expect(first).toBe('first');
    expect(second).toBe('second');
    expect(manager.toasts.map((toast) => toast.id)).toEqual([
      'second',
      'first',
    ]);
    expect(manager.getSnapshot()).toBe(manager.toasts);

    const previousSnapshot = manager.getSnapshot();
    expect(manager.add({ id: 'first', description: 'Updated' })).toBe('first');
    expect(manager.toasts).not.toBe(previousSnapshot);
    expect(manager.toasts).toHaveLength(2);
    expect(manager.toasts[1]).toMatchObject({
      id: 'first',
      title: 'First',
      description: 'Updated',
      updateKey: 1,
      data: { source: 'editor' },
    });

    manager.update('second', { title: 'Saved' });
    expect(manager.toasts[0]).toMatchObject({
      id: 'second',
      title: 'Saved',
      updateKey: 1,
    });
    expect(listener).toHaveBeenCalledTimes(4);

    unsubscribe();
    manager.update('second', { title: 'Done' });
    expect(listener).toHaveBeenCalledTimes(4);
  });

  test('closes one or all toasts and reports the close reason', () => {
    const manager = createToastManager();
    const firstClose = mock((_reason: string) => undefined);
    const secondClose = mock((_reason: string) => undefined);
    const firstRemove = mock(() => undefined);

    manager.add({ id: 'first', onClose: firstClose, onRemove: firstRemove });
    manager.add({ id: 'second', onClose: secondClose });
    manager.close('first', 'swipe');

    expect(manager.toasts.map((toast) => toast.id)).toEqual(['second']);
    expect(firstClose).toHaveBeenCalledWith('swipe');
    // Presence owns visual removal, so the store must not fire this early.
    expect(firstRemove).not.toHaveBeenCalled();

    manager.close(undefined, 'programmatic');
    expect(manager.toasts).toEqual([]);
    expect(secondClose).toHaveBeenCalledWith('programmatic');
  });

  test('keeps promise notifications on one id through success and failure', async () => {
    const manager = createToastManager();

    await expect(
      manager.promise(Promise.resolve('report.pdf'), {
        loading: { id: 'upload', title: 'Uploading' },
        success: (name) => ({ title: `${name} uploaded`, timeout: 1200 }),
        error: { title: 'Upload failed' },
      }),
    ).resolves.toBe('report.pdf');
    expect(manager.toasts).toHaveLength(1);
    expect(manager.toasts[0]).toMatchObject({
      id: 'upload',
      title: 'report.pdf uploaded',
      type: 'success',
      timeout: 1200,
      updateKey: 1,
    });

    const failure = new Error('offline');
    await expect(
      manager.promise(
        () => {
          throw failure;
        },
        {
          loading: { id: 'retry', title: 'Retrying' },
          success: { title: 'Connected' },
          error: (error) => ({
            title: error === failure ? 'Still offline' : 'Unknown error',
          }),
        },
      ),
    ).rejects.toBe(failure);
    expect(manager.toasts[0]).toMatchObject({
      id: 'retry',
      title: 'Still offline',
      type: 'error',
      updateKey: 1,
    });
  });
});

describe('ToastProvider', () => {
  test('provides a generic reactive controller and renders the standalone host', () => {
    const typedManager: ToastManager<{ source: string }> = createToastManager<{
      source: string;
    }>();
    typedManager.add({ data: { source: 'compile-time' } });
    expect(typedManager.toasts[0]?.data?.source).toBe('compile-time');

    const markup = renderToastScenario(`
      const manager = createToastManager();
      manager.add({
        id: 'saved',
        title: 'Saved',
        description: 'Your settings are up to date.',
        type: 'success',
        timeout: 0,
        data: { source: 'settings' },
        actionProps: {
          children: 'Undo',
          'aria-label': 'Undo save',
          type: 'submit',
        },
      });

      function Probe() {
        const toast = useToast();
        return createElement(
          'span',
          { 'data-count': toast.toasts.length },
          toast.toasts[0]?.data?.source,
        );
      }

      const markup = renderToStaticMarkup(
        createElement(
          ToastProvider,
          {
            toastManager: manager,
            portal: false,
            timeout: 0,
            placement: 'top-center',
            viewport: { 'aria-label': '系统通知' },
          },
          createElement('button', { key: 'trigger', type: 'button' }, 'Notify'),
          createElement(Probe, { key: 'probe' }),
        ),
      );
      process.stdout.write(markup);
    `);

    expect(markup).toContain('<button type="button">Notify</button>');
    expect(markup).toContain('<span data-count="1">settings</span>');
    expect(markup).toContain('data-slot="toast-viewport"');
    expect(markup).toContain('data-placement="top-center"');
    expect(markup).toContain('aria-label="系统通知"');
    expect(markup).toContain('data-slot="toast-title"');
    expect(markup).toContain('data-slot="toast-description"');
    expect(markup).toContain('data-slot="toast-action"');
    expect(markup).toContain('aria-label="Undo save"');
    expect(markup).toContain('type="submit"');
    expect(markup).toContain('data-slot="toast-close"');
    expect(markup).toContain('aria-label="Dismiss notification"');
    expect(markup).toContain('border-momo-fg-success/25');
  });

  test('keeps the compact queue mounted while exposing only the front toast', () => {
    const markup = renderToastScenario(`
      const manager = createToastManager();
      for (let index = 1; index <= 5; index += 1) {
        manager.add({ id: \`toast-\${index}\`, title: \`Toast \${index}\` });
      }
      const markup = renderToStaticMarkup(
        createElement(ToastProvider, {
          toastManager: manager,
          portal: false,
          limit: 2,
        }),
      );
      process.stdout.write(\`QUEUE:\${manager.toasts.length}\\n\${markup}\`);
    `);

    // As in the reference stack, Motion only keeps the visible layers plus a
    // two-item buffer in the DOM; the manager still retains the full queue.
    expect(markup).toStartWith('QUEUE:5\n');
    expect(markup.match(/data-slot="toast"/g)).toHaveLength(4);
    expect(markup.match(/data-toast-interactive="true"/g)).toHaveLength(1);
    expect(markup.match(/data-toast-interactive="false"/g)).toHaveLength(3);
    expect(
      markup.match(/data-toast-interactive="false"[^>]*aria-hidden="true"/g),
    ).toHaveLength(3);
    expect(
      markup.match(/data-toast-interactive="false"[^>]*inert=""/g),
    ).toHaveLength(3);
    expect(markup).toContain('Toast 5');
    expect(markup).toContain('Toast 2');
    expect(markup).not.toContain('Toast 1');
  });

  test('supports slot props and removable optional anatomy', () => {
    const markup = renderToastScenario(`
      const manager = createToastManager();
      manager.add({ id: 'plain', title: 'Plain', description: 'Details' });
      const markup = renderToStaticMarkup(
        createElement(ToastProvider, {
          toastManager: manager,
          portal: false,
          content: { id: 'custom-content', className: 'content-class' },
          icon: false,
          description: false,
          close: false,
        }),
      );
      process.stdout.write(markup);
    `);

    expect(markup).toContain('id="custom-content"');
    expect(markup).toContain('content-class');
    expect(markup).not.toContain('data-slot="toast-icon"');
    expect(markup).not.toContain('data-slot="toast-description"');
    expect(markup).not.toContain('data-slot="toast-close"');
    expect(markup).toContain('data-slot="toast-title"');
  });

  test('is implemented with Motion presence rather than Base UI or CSS transitions', async () => {
    const source = await Bun.file(
      new URL('./toast.tsx', import.meta.url),
    ).text();

    expect(source).toContain('<AnimatePresence initial={false}>');
    expect(source).toContain('initial={initial}');
    expect(source).toContain('animate={stackTarget}');
    expect(source).toContain("exit='exit'");
    expect(source).toContain("type: 'spring'");
    expect(source).not.toContain("from '@base-ui/react/toast'");
    expect(source).not.toContain('transition-transform');
    expect(source).not.toContain('transition-all');
  });
});
