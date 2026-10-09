import { createRef, StrictMode } from 'react';

import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import type { ToastOptions, ToastProviderProps } from '../src/components/toast';
import { createToastManager, ToastProvider } from '../src/components/toast';
import { useMergedRefs } from '../src/hooks/use-merged-refs';

const manager = createToastManager();
const root = createRoot(document.getElementById('root')!);
let hidden = false;
Object.defineProperty(document, 'hidden', { get: () => hidden });
Object.defineProperty(document, 'hasFocus', { value: () => true });
const counters: Record<
  string,
  { mounted: number; cleaned: number; nulls: number }
> = {};
function trackedRef(name: string) {
  counters[name] = { mounted: 0, cleaned: 0, nulls: 0 };
  return (element: HTMLElement | null) => {
    if (!element) {
      counters[name]!.nulls++;
      return;
    }
    counters[name]!.mounted++;
    return () => {
      counters[name]!.cleaned++;
    };
  };
}
const rootRefs = [trackedRef('root0'), trackedRef('root1')];
const viewportRefs = [trackedRef('viewport0'), trackedRef('viewport1')];
const probeCleanup = trackedRef('probe');
const objectRef = createRef<HTMLDivElement>();
const legacy: Array<'mount' | 'null'> = [];
const legacyRef = (element: HTMLDivElement | null) => {
  legacy.push(element ? 'mount' : 'null');
};
function RefProbe() {
  const ref = useMergedRefs(objectRef, legacyRef, probeCleanup);
  return <div ref={ref} id='ref-probe' />;
}

interface Config {
  mounted: boolean;
  paused: boolean;
  refVersion: number;
  limit: number;
  placement: ToastProviderProps['placement'];
  swipeDirection: ToastProviderProps['swipeDirection'];
}
let config: Config = {
  mounted: true,
  paused: false,
  refVersion: 0,
  limit: 2,
  placement: 'bottom-right',
  swipeDirection: undefined,
};
const closed: Array<{ id: string; reason: string }> = [];
const removed: string[] = [];
function render(next: Partial<Config> = {}) {
  config = { ...config, ...next };
  flushSync(() =>
    root.render(
      <StrictMode>
        <button id='trigger' type='button'>
          Outside
        </button>
        {config.mounted && (
          <>
            <RefProbe />
            <ToastProvider
              toastManager={manager}
              portal={false}
              timeout={0}
              paused={config.paused}
              limit={config.limit}
              placement={config.placement}
              swipeDirection={config.swipeDirection}
              viewport={{ ref: viewportRefs[config.refVersion] }}
              root={{ ref: rootRefs[config.refVersion] }}
            />
          </>
        )}
      </StrictMode>,
    ),
  );
}
const api = {
  render,
  counters,
  closed,
  removed,
  objectRef,
  legacy,
  ids: () => manager.toasts.map((toast) => toast.id),
  add(id: string, options: ToastOptions = {}) {
    flushSync(() =>
      manager.add({
        id,
        title: id,
        ...options,
        onClose: (reason) => closed.push({ id, reason }),
        onRemove: () => removed.push(id),
      }),
    );
  },
  update(id: string, options: ToastOptions) {
    flushSync(() => manager.update(id, options));
  },
  close(id: string) {
    flushSync(() => manager.close(id));
  },
  visibility(value: boolean) {
    hidden = value;
    flushSync(() => document.dispatchEvent(new Event('visibilitychange')));
  },
  focusWindow(value: boolean) {
    flushSync(() => window.dispatchEvent(new Event(value ? 'focus' : 'blur')));
  },
};
window.toastFixture = api;
render();

declare global {
  interface Window {
    toastFixture: typeof api;
  }
}
