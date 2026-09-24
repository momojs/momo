import { act, StrictMode, useLayoutEffect } from 'react';

import { createRoot } from 'react-dom/client';

import type {
  PresenceGateExitHandler,
  PresenceGateKey,
} from '../src/hooks/use-presence-gate';
import { usePresenceGate } from '../src/hooks/use-presence-gate';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const errors: string[] = [];
const originalError = console.error;
console.error = (...args: unknown[]) => {
  errors.push(args.map(String).join(' '));
  originalError(...args);
};

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type Snapshot = {
  visible: boolean;
  callbacks: Map<PresenceGateKey, PresenceGateExitHandler>;
};

async function withProbe(
  run: (probe: {
    render: (open: boolean, keys?: PresenceGateKey[]) => Promise<void>;
    complete: (key: PresenceGateKey) => Promise<void>;
    read: () => Snapshot;
  }) => Promise<void>,
) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let snapshot: Snapshot | undefined;

  function Probe({ open, keys }: { open: boolean; keys: PresenceGateKey[] }) {
    const { visible, createGate } = usePresenceGate(open);
    const callbacks = new Map(keys.map((key) => [key, createGate(key)]));
    useLayoutEffect(() => {
      snapshot = { visible, callbacks };
    });
    return null;
  }

  function read() {
    check(snapshot, 'Probe has not committed');
    return snapshot;
  }

  try {
    await run({
      read,
      render: (open, keys = ['content', 'extra']) =>
        act(async () => {
          root.render(
            <StrictMode>
              <Probe open={open} keys={keys} />
            </StrictMode>,
          );
        }),
      complete: (key) =>
        act(async () => {
          const callback = read().callbacks.get(key);
          check(callback, 'Missing gate callback');
          callback();
        }),
    });
    return true;
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

const tests = {
  errors,
  completedGateStaysComplete: () =>
    withProbe(async ({ render, read, complete }) => {
      await render(true);
      await render(false);
      check(read().visible, 'Parent must wait for both gates');
      await complete('content');
      await render(false);
      check(read().visible, 'The remaining gate must still hold the parent');
      await complete('extra');
      check(!read().visible, 'A rerender must not re-arm a completed gate');
    }),
  removedGateStopsWaiting: () =>
    withProbe(async ({ render, read, complete }) => {
      await render(true);
      await render(false);
      await render(false, ['content']);
      await complete('content');
      check(
        !read().visible,
        'Removing a gate during closing must cancel its wait',
      );
    }),
  removingLastPendingGateReleases: () =>
    withProbe(async ({ render, read, complete }) => {
      await render(true);
      await render(false);
      await complete('content');
      await render(false, ['content']);
      check(
        !read().visible,
        'Removing the last pending gate must release immediately',
      );
    }),
  reopenStartsNewWait: () =>
    withProbe(async ({ render, read, complete }) => {
      await render(true);
      await render(false);
      await complete('content');
      const oldExtra = read().callbacks.get('extra');
      check(oldExtra, 'Missing extra callback');
      await render(true);
      await act(async () => oldExtra());
      check(
        read().visible,
        'A completion while open must not close the parent',
      );
      await render(false);
      await complete('extra');
      check(read().visible, 'A new closing cycle must wait for content again');
      await complete('content');
      check(!read().visible, 'The second closing cycle must finish');
    }),
  distinctKeysAndDuplicateCompletion: () =>
    withProbe(async ({ render, read, complete }) => {
      await render(true, [0, '0']);
      await render(false, [0, '0']);
      await complete(0);
      await complete(0);
      await render(false, ['0', 0]);
      check(
        read().visible,
        'Duplicate completion must not release a distinct gate',
      );
      await complete('0');
      check(!read().visible, 'Keys must remain stable when reordered');
    }),
  noGates: () =>
    withProbe(async ({ render, read }) => {
      await render(false, []);
      check(!read().visible, 'Initially closed content must stay closed');
      await render(true, []);
      check(read().visible, 'Opening must retain the parent');
      await render(false, []);
      check(!read().visible, 'No gates must release after the closing effect');
    }),
};

export type PresenceGateBrowserTests = typeof tests;
declare global {
  interface Window {
    momoPresenceGateTests: PresenceGateBrowserTests;
  }
}
window.momoPresenceGateTests = tests;
