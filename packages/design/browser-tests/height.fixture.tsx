import type { CSSProperties } from 'react';
import { act, StrictMode, useLayoutEffect } from 'react';

import { MotionConfig, motion } from 'motion/react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { Tabs } from '../src/components/tabs';
import { useAutoHeight } from '../src/effects/height';
import type { ControlValue } from '../src/shared';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const errors: string[] = [];
const originalError = console.error;
console.error = (...args: unknown[]) => {
  errors.push(args.map(String).join(' '));
  originalError(...args);
};

const css = document.createElement('style');
css.textContent = `
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  [data-slot="tabs-panels"] { border: 2px solid black; overflow: hidden; }
  [data-slot="tabs-height"] { overflow: hidden; }
  [role="tabpanel"] { padding: 12px; }
`;
document.head.append(css);

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const frame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

async function waitFor(predicate: () => boolean, message: string) {
  const deadline = performance.now() + 3_000;
  while (!predicate()) {
    check(performance.now() < deadline, message);
    await act(frame);
  }
}

async function withRoot<Result>(
  run: (root: Root, container: HTMLDivElement) => Promise<Result>,
) {
  const container = document.createElement('div');
  container.style.width = '360px';
  document.body.append(container);
  const root = createRoot(container);
  try {
    return await run(root, container);
  } finally {
    await act(() => root.unmount());
    container.remove();
  }
}

type Item = {
  value: ControlValue;
  id: string;
  height: number;
  style?: CSSProperties;
};

function probe() {
  let latest: ReturnType<typeof useAutoHeight> | undefined;
  let commits = 0;
  function Probe({ items = [] }: { items?: Item[] }) {
    const api = useAutoHeight();
    useLayoutEffect(() => {
      latest = api;
      commits += 1;
    });
    return items.map(({ value, id, height, style }) => (
      <div
        key={id}
        data-id={id}
        ref={api.register(value)}
        style={{ width: 100, height, ...style }}
      />
    ));
  }
  return {
    Probe,
    read() {
      check(latest, 'Probe has not committed');
      return latest;
    },
    commits: () => commits,
  };
}

async function withObserver<Result>(
  run: (observers: TestObserver[]) => Promise<Result>,
) {
  const original = globalThis.ResizeObserver;
  const observers: TestObserver[] = [];
  class Observer extends TestObserver {
    constructor(callback: ResizeObserverCallback) {
      super(callback);
      observers.push(this);
    }
  }
  globalThis.ResizeObserver = Observer;
  try {
    return await run(observers);
  } finally {
    globalThis.ResizeObserver = original;
  }
}

class TestObserver implements ResizeObserver {
  readonly elements = new Set<Element>();
  box: ResizeObserverBoxOptions | undefined;
  disconnected = false;
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(element: Element, options?: ResizeObserverOptions) {
    this.elements.add(element);
    this.box = options?.box;
  }
  unobserve(element: Element) {
    this.elements.delete(element);
  }
  disconnect() {
    this.disconnected = true;
    this.elements.clear();
  }
  deliver(target: Element, width: number, height: number) {
    const box = [{ inlineSize: width, blockSize: height }];
    this.callback(
      [
        {
          target,
          borderBoxSize: box,
          contentBoxSize: box,
          devicePixelContentBoxSize: box,
          contentRect: new DOMRect(0, 0, width, height),
        },
      ],
      this,
    );
  }
}

const tests = {
  errors,

  lifecycle: () =>
    withObserver((observers) =>
      withRoot(async (root, container) => {
        const { Probe, read } = probe();
        const a = { value: 'a', id: 'a', height: 120 };
        const b = { value: 'b', id: 'b', height: 240 };
        await act(() => root.render(<Probe items={[a]} />));
        check(
          read().height === 'auto',
          'Initial unknown height must remain auto',
        );
        await act(() => read().activate('a'));
        check(
          read().state.status === 'ready' && read().height === 120,
          'A must be measured',
        );
        const old = observers.at(-1)!;
        const oldNode = container.querySelector('[data-id="a"]')!;
        check(
          old.box === 'border-box',
          'Observe the border box, not just its content',
        );

        await act(() => read().activate('b'));
        check(old.disconnected, 'Switching must disconnect the old observer');
        check(
          read().state.status === 'pending' && read().state.rect === null,
          'B is pending, not measured as A',
        );
        check(
          read().rect.height === 0 && read().height === 120,
          'Measurement invalidation must retain presentation height',
        );
        await act(() => old.deliver(oldNode, 100, 999));
        check(
          read().height === 120,
          'A late A notification must not overwrite B',
        );

        await act(() => root.render(<Probe items={[a, b]} />));
        check(
          read().state.status === 'ready' && read().height === 240,
          'Late registration must fulfill the activation',
        );
        await act(() => read().activate('a'));
        await act(() => old.deliver(oldNode, 100, 999));
        check(
          read().height === 120,
          'Returning to the same element must not revive its obsolete subscription',
        );
        await act(() => read().activate('b'));
        const bObserver = observers.at(-1)!;
        await act(() => root.render(<Probe items={[b]} />));
        check(
          read().height === 240 && !bObserver.disconnected,
          'Unmounting inactive A must not affect B',
        );
        await act(() => root.render(<Probe />));
        check(
          read().state.status === 'pending' && read().height === 240,
          'Unmounting B must preserve its activation intent only',
        );
        check(
          bObserver.disconnected,
          'Unmounting the active target must disconnect it',
        );

        await act(() => read().clear());
        check(
          read().state.status === 'idle' && read().height === 0,
          'Explicit clear must collapse',
        );
        await act(() => root.render(<Probe items={[b]} />));
        check(
          read().state.status === 'idle',
          'Clear must cancel delayed activation',
        );
        await act(() => read().activate('b'));
        check(
          read().height === 240,
          'Clear must not discard mounted registrations',
        );
        await act(() => read().clear());
        await act(() => read().activate('b'));
        check(
          read().height === 240,
          'Clear must allow reactivation without a ref remount',
        );
        return true;
      }),
    ),

  replacement: () =>
    withObserver((observers) =>
      withRoot(async (root, container) => {
        const { Probe, read } = probe();
        await act(() => root.render(<Probe />));
        const oldNode = document.createElement('div');
        const newNode = document.createElement('div');
        oldNode.style.height = '80px';
        newNode.style.height = '160px';
        container.append(oldNode, newNode);
        const ref = read().register('slot');
        let detachOld: ReturnType<typeof ref>;
        let detachNew: ReturnType<typeof ref>;
        await act(() => {
          detachOld = ref(oldNode);
          read().activate('slot');
        });
        const oldObserver = observers.at(-1)!;
        await act(() => {
          detachNew = ref(newNode);
        });
        await act(() => {
          if (typeof detachOld === 'function') detachOld();
        });
        await act(() => oldObserver.deliver(oldNode, 360, 700));
        check(
          read().height === 160,
          'A stale cleanup/notification must not delete the replacement',
        );
        await act(() => read().activate('slot'));
        check(
          read().state.status === 'ready',
          'The replacement must still be registered',
        );
        await act(() => {
          if (typeof detachNew === 'function') detachNew();
        });
        check(
          read().state.status === 'pending',
          'The actual replacement cleanup must release the target',
        );
        return true;
      }),
    ),

  keysAndDedup: () =>
    withObserver((observers) =>
      withRoot(async (root, container) => {
        const { Probe, read, commits } = probe();
        const items = [
          { value: 0, id: 'number', height: 40 },
          { value: '0', id: 'string', height: 60 },
          { value: null, id: 'null', height: 0 },
        ];
        await act(() => root.render(<Probe items={items} />));
        const ref = read().register(0);
        for (const item of items) {
          await act(() => read().activate(item.value));
          check(
            read().state.status === 'ready' && read().height === item.height,
            `Incorrect key/zero handling: ${item.id}`,
          );
        }
        await act(() => read().activate(0));
        const previous = read().rect;
        const before = commits();
        await act(() => {
          for (let i = 0; i < 10; i += 1) {
            observers
              .at(-1)!
              .deliver(container.querySelector('[data-id="number"]')!, 100, 40);
          }
        });
        check(
          read().rect === previous && commits() === before,
          'Equal numerical sizes must not commit again',
        );
        await act(() => root.render(<Probe items={items} />));
        check(
          read().register(0) === ref,
          'Registered callback identity must survive rerenders',
        );
        await act(() =>
          observers
            .at(-1)!
            .deliver(container.querySelector('[data-id="number"]')!, 140, 40),
        );
        check(
          read().rect.width === 140,
          'Width changes must still be published',
        );
        return true;
      }),
    ),

  strictMode: () =>
    withObserver((observers) =>
      withRoot(async (root) => {
        let api: ReturnType<typeof useAutoHeight> | undefined;
        function StrictProbe() {
          const value = useAutoHeight();
          useLayoutEffect(() => {
            value.activate('a');
          }, [value.activate]);
          useLayoutEffect(() => {
            api = value;
          });
          return <div ref={value.register('a')} style={{ height: 90 }} />;
        }
        await act(() =>
          root.render(
            <StrictMode>
              <StrictProbe />
            </StrictMode>,
          ),
        );
        check(
          api?.state.status === 'ready' && api.height === 90,
          'StrictMode must restore measurement',
        );
        check(
          observers.filter((observer) => !observer.disconnected).length === 1,
          'Only one live subscription may remain',
        );
        await act(() => root.render(null));
        check(
          observers.every((observer) => observer.disconnected),
          'Unmount must clean every subscription',
        );
        return true;
      }),
    ),

  layoutClear: () =>
    withObserver(() =>
      withRoot(async (root) => {
        let latest: ReturnType<typeof useAutoHeight> | undefined;
        function ClearOnReady({
          api,
        }: {
          api: ReturnType<typeof useAutoHeight>;
        }) {
          useLayoutEffect(() => {
            if (api.state.status === 'ready') api.clear();
          }, [api.clear, api.state.status]);
          return null;
        }
        function Probe() {
          const api = useAutoHeight();
          useLayoutEffect(() => {
            api.activate('a');
          }, [api.activate]);
          useLayoutEffect(() => {
            latest = api;
          });
          return (
            <>
              <div ref={api.register('a')} style={{ height: 120 }} />
              <ClearOnReady api={api} />
            </>
          );
        }
        await act(() => root.render(<Probe />));
        check(
          latest?.state.status === 'idle' && latest.height === 0,
          'An obsolete parent measurement effect must not undo a descendant clear',
        );
        return true;
      }),
    ),

  boxAndResize: () =>
    withRoot(async (root, container) => {
      const { Probe, read } = probe();
      container.style.transform = 'scale(0.5)';
      await act(() =>
        root.render(
          <Probe
            items={[
              {
                value: 'a',
                id: 'a',
                height: 60,
                style: {
                  boxSizing: 'content-box',
                  padding: 10,
                  border: '2px solid',
                },
              },
            ]}
          />,
        ),
      );
      await act(() => read().activate('a'));
      check(
        read().rect.height === 84 && read().rect.width === 124,
        'Initial measurement must include the box but exclude scale',
      );
      const node = container.querySelector<HTMLElement>('[data-id="a"]')!;
      node.style.paddingTop = '30px';
      await waitFor(
        () => read().height === 104,
        'Padding-only resize was not observed',
      );
      node.style.borderBottomWidth = '6px';
      await waitFor(
        () => read().height === 108,
        'Border-only resize was not observed',
      );
      node.style.height = '100px';
      await waitFor(
        () => read().height === 148,
        'Content resize without a React render was not observed',
      );
      node.style.writingMode = 'vertical-rl';
      await act(frame);
      await act(frame);
      check(
        read().rect.height === 148 && read().rect.width === 124,
        'Writing mode must not swap physical width and height',
      );
      node.style.display = 'none';
      await waitFor(
        () => read().height === 0,
        'A hidden target must publish its actual zero size',
      );
      check(
        read().state.status === 'ready',
        'A real zero must not be confused with a missing target',
      );
      node.style.display = 'block';
      await waitFor(
        () => read().height === 148,
        'A revealed target must be measured again',
      );
      return true;
    }),

  tabsControlled: () =>
    withRoot(async (root, container) => {
      const changes: string[] = [];
      const options = [
        {
          value: 'a',
          label: 'A',
          content: <div data-content='a' style={{ height: 80 }} />,
        },
        { value: 'b', label: 'B', content: <div style={{ height: 180 }} /> },
      ];
      const renderTabs = (value: string, available = options) =>
        act(() =>
          root.render(
            <MotionConfig transition={{ type: 'tween', duration: 0 }}>
              <Tabs
                value={value}
                options={available}
                onChange={(next) => changes.push(next)}
              />
            </MotionConfig>,
          ),
        );
      await renderTabs('a');
      const height = () =>
        container.querySelector<HTMLElement>('[data-slot="tabs-height"]')!;
      await waitFor(
        () => height().offsetHeight === 104,
        'Initial A height is wrong',
      );
      await act(() =>
        container
          .querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!
          .click(),
      );
      check(
        changes.at(-1) === 'b',
        'The controlled change request was not sent',
      );
      container.querySelector<HTMLElement>('[data-content="a"]')!.style.height =
        '110px';
      await waitFor(
        () => height().offsetHeight === 134,
        'Rejected selection stopped measuring the visible panel',
      );
      await renderTabs('b');
      await waitFor(
        () => height().offsetHeight === 204,
        'Committed B did not become the target',
      );
      const shell = container.querySelector<HTMLElement>(
        '[data-slot="tabs-panels"]',
      )!;
      check(
        shell.offsetHeight === 208,
        'The shell must add its own border outside the animated height',
      );
      await renderTabs('b', []);
      await waitFor(
        () => height().offsetHeight === 0,
        'Removing the selected option must explicitly collapse',
      );
      await renderTabs('b');
      await waitFor(
        () => height().offsetHeight === 204,
        'Reintroducing the same selected key must reactivate it',
      );
      return true;
    }),

  tabsUncontrolled: () =>
    withRoot(async (root, container) => {
      const options = [
        { value: 'disabled', label: 'Disabled', disabled: true },
        { value: 'a', label: 'A', content: <div style={{ height: 80 }} /> },
        { value: 'b', label: 'B', content: <div style={{ height: 180 }} /> },
      ];
      const height = () =>
        container.querySelector<HTMLElement>('[data-slot="tabs-height"]')!;
      const render = (
        key: string,
        defaultValue?: string,
        available = options,
      ) =>
        act(() =>
          root.render(
            <MotionConfig transition={{ type: 'tween', duration: 0 }}>
              <Tabs key={key} defaultValue={defaultValue} options={available} />
            </MotionConfig>,
          ),
        );
      await render('explicit', 'b');
      await waitFor(
        () => height().offsetHeight === 204,
        'The explicit default must determine initial height',
      );
      await act(() =>
        container
          .querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]!
          .click(),
      );
      await waitFor(
        () => height().offsetHeight === 104,
        'An uncontrolled change must update measured selection',
      );
      await render('implicit');
      await waitFor(
        () => height().offsetHeight === 104,
        'The first enabled tab must remain the implicit default',
      );
      await render('delayed', undefined, []);
      await waitFor(
        () => height().offsetHeight === 0,
        'Empty options must collapse',
      );
      await render('delayed');
      await waitFor(
        () => height().offsetHeight === 104,
        'Delayed options must activate the first enabled tab',
      );
      return true;
    }),

  animationRetarget: () =>
    withRoot(async (root, container) => {
      let api: ReturnType<typeof useAutoHeight> | undefined;
      function Animated({ target, showB }: { target: string; showB: boolean }) {
        const value = useAutoHeight();
        useLayoutEffect(() => {
          value.activate(target);
        }, [target, value.activate]);
        useLayoutEffect(() => {
          api = value;
        });
        return (
          <>
            <motion.div
              data-animated
              initial={false}
              animate={{ height: value.height }}
              transition={{ type: 'tween', duration: 0.25 }}
            />
            <div ref={value.register('a')} style={{ height: 80 }} />
            {showB && <div ref={value.register('b')} style={{ height: 240 }} />}
          </>
        );
      }
      const render = (target: string, showB = false) =>
        act(() => root.render(<Animated target={target} showB={showB} />));
      await render('a');
      const element = container.querySelector<HTMLElement>('[data-animated]')!;
      await waitFor(
        () => Math.abs(element.getBoundingClientRect().height - 80) < 1,
        'Initial animation did not settle',
      );
      await render('b');
      await act(frame);
      check(
        api?.state.status === 'pending' && api.height === 80,
        'Pending must retain a numeric target',
      );
      check(
        Math.abs(element.getBoundingClientRect().height - 80) < 1,
        'Pending must not collapse or fall back to auto',
      );
      await render('b', true);
      await waitFor(
        () => element.getBoundingClientRect().height > 110,
        'Expansion did not start',
      );
      const before = element.getBoundingClientRect().height;
      await render('a', true);
      const after = element.getBoundingClientRect().height;
      check(
        after > 90 && Math.abs(after - before) < 20,
        'Retargeting must start from the presentation height',
      );
      await waitFor(
        () => Math.abs(element.getBoundingClientRect().height - 80) < 1,
        'Interrupted animation did not settle on A',
      );
      check(
        container.querySelector('[data-animated]') === element,
        'The animation container must not remount',
      );
      return true;
    }),
};

export type HeightBrowserTests = typeof tests;
declare global {
  interface Window {
    momoHeightTests: HeightBrowserTests;
  }
}
window.momoHeightTests = tests;
