import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  act,
  StrictMode,
  Suspense,
  startTransition,
  useLayoutEffect,
  useState,
} from 'react';

import { flushSync } from 'react-dom';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import type { SetValue } from '../src/hooks/use-controllable-value';
import { useControllableValue } from '../src/hooks/use-controllable-value';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const errors: string[] = [];
const originalError = console.error;
console.error = (...args: unknown[]) => {
  errors.push(args.map(String).join(' '));
  originalError(...args);
};

async function withRoot<Result>(
  run: (root: Root) => Result | Promise<Result>,
): Promise<Result> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  try {
    return await run(root);
  } finally {
    await act(() => root.unmount());
    container.remove();
  }
}

function render(root: Root, element: ReactNode) {
  return act(() => root.render(element));
}

async function columns(controlled: boolean) {
  return withRoot(async (root) => {
    const initial = [2026, 7];
    const changes: Array<[number[], string]> = [];
    let current: number[] | undefined;
    let request: SetValue<number[], [string]> | undefined;

    function Picker() {
      const [value, setValue] = useControllableValue<number[], [string]>({
        value: controlled ? initial : undefined,
        defaultValue: initial,
        onChange: (next, source) => changes.push([next, source]),
      });
      useLayoutEffect(() => {
        current = value;
        request = setValue;
      });
      return null;
    }

    await render(root, <Picker />);
    await act(() => {
      request?.((previous) => [2030, previous[1]], 'year');
      request?.((previous) => [previous[0], 8], 'month');
    });
    return { current, changes };
  });
}

const tests = {
  errors,

  async defaultFallback() {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(String(message));

    try {
      return await withRoot(async (root) => {
        const changes: number[] = [];
        let implicit: Date | undefined;
        let explicit: Date | undefined;
        let request: SetValue<Date> | undefined;
        function Dates({
          value,
          defaultValue,
        }: {
          value: Date | undefined;
          defaultValue: Date;
        }) {
          const [inferred, setDate] = useControllableValue({
            value,
            defaultValue,
            onChange: (next) => changes.push(next.getTime()),
          });
          const [controlled] = useControllableValue({
            controlled: true,
            value,
            defaultValue,
          });
          useLayoutEffect(() => {
            implicit = inferred;
            explicit = controlled;
            request = setDate;
          });
          return null;
        }

        await render(
          root,
          <Dates value={new Date(1_000)} defaultValue={new Date(0)} />,
        );
        await render(
          root,
          <Dates value={undefined} defaultValue={new Date(2_000)} />,
        );
        await act(() =>
          request?.((previous) => new Date(previous.getTime() + 1)),
        );
        return {
          implicit: implicit?.getTime(),
          explicitIsUndefined: explicit === undefined,
          changes,
          warnings: warnings.length,
        };
      });
    } finally {
      console.warn = originalWarn;
    }
  },

  controlledColumns: () => columns(true),
  uncontrolledColumns: () => columns(false),

  controlledClear: () =>
    withRoot(async (root) => {
      const initial = new Date(1_000);
      const changes: Array<[number | null, string]> = [];
      const previousValues: Array<number | null> = [];
      let current: number | undefined;
      let request: SetValue<Date | undefined, [string]> | undefined;

      function DateInput() {
        const [date, setDate] = useControllableValue<
          Date | undefined,
          [string]
        >({
          controlled: true,
          value: initial,
          defaultValue: new Date(0),
          onChange: (next, source) =>
            changes.push([next?.getTime() ?? null, source]),
        });
        useLayoutEffect(() => {
          current = date.getTime();
          request = setDate;
        });
        return null;
      }

      await render(root, <DateInput />);
      await act(() => {
        request?.(undefined, 'clear');
        request?.((previous) => {
          previousValues.push(previous?.getTime() ?? null);
          return new Date(2_000);
        }, 'restore');
      });
      await act(() => {
        request?.((previous) => {
          previousValues.push(previous?.getTime() ?? null);
          return new Date((previous?.getTime() ?? 0) + 1);
        }, 'after-commit');
      });
      return { current, changes, previousValues };
    }),

  controlledRealignment: () =>
    withRoot(async (root) => {
      const changes: number[] = [];
      let current: number | undefined;
      let request: SetValue<number> | undefined;
      let renders = 0;

      function Counter() {
        const [value, setValue] = useControllableValue({
          value: 1,
          onChange: (next) => changes.push(next),
        });
        useLayoutEffect(() => {
          current = value;
          request = setValue;
          renders += 1;
        });
        return null;
      }

      await render(root, <Counter />);
      await act(() => {
        request?.((previous) => previous + 1);
        request?.((previous) => previous + 1);
      });
      await act(() => request?.((previous) => previous + 1));
      return { current, changes, renders };
    }),

  controlledNormalization: () =>
    withRoot(async (root) => {
      const changes: number[] = [];
      let current: number | undefined;
      let request: SetValue<number> | undefined;

      function Counter() {
        const [source, setSource] = useState(1);
        const [value, setValue] = useControllableValue({
          value: source,
          onChange(next) {
            changes.push(next);
            setSource(Math.min(next, 10));
          },
        });
        useLayoutEffect(() => {
          current = value;
          request = setValue;
        });
        return null;
      }

      await render(root, <Counter />);
      await act(() => request?.(20));
      await act(() => request?.((previous) => previous + 1));
      return { current, changes };
    }),

  layoutRequests: () =>
    withRoot(async (root) => {
      const changes: Array<[string, number]> = [];
      const setters: SetValue<number>[] = [];
      function Child({
        trigger,
        request,
      }: {
        trigger: boolean;
        request: SetValue<number>;
      }) {
        useLayoutEffect(() => {
          if (trigger) request((previous) => previous + 1);
        }, [trigger, request]);
        return null;
      }
      function Parent({
        value,
        trigger,
        onChange,
      }: {
        value: number;
        trigger: boolean;
        onChange: (next: number) => void;
      }) {
        const [, request] = useControllableValue({ value, onChange });
        useLayoutEffect(() => {
          setters.push(request);
        });
        useLayoutEffect(() => {
          if (trigger) request((previous) => previous + 1);
        }, [trigger, request]);
        return <Child trigger={trigger} request={request} />;
      }

      await render(
        root,
        <Parent
          value={0}
          trigger={false}
          onChange={(next) => changes.push(['old', next])}
        />,
      );
      await render(
        root,
        <Parent
          value={5}
          trigger={true}
          onChange={(next) => changes.push(['new', next])}
        />,
      );
      return {
        changes,
        stable: setters.every((setter) => setter === setters[0]),
      };
    }),

  mixedPriorities: () =>
    withRoot(async (root) => {
      const changes: number[] = [];
      let api:
        | {
            value: number;
            request: SetValue<number>;
            tick: Dispatch<SetStateAction<number>>;
          }
        | undefined;
      function Counter() {
        const [value, request] = useControllableValue({
          defaultValue: 0,
          onChange: (next) => changes.push(next),
        });
        const [, tick] = useState(0);
        useLayoutEffect(() => {
          api = { value, request, tick };
        });
        return null;
      }

      await render(root, <Counter />);
      let unrelatedCommit: number | undefined;
      await act(() => {
        startTransition(() => api?.request((previous) => previous + 1));
        flushSync(() => api?.tick((previous) => previous + 1));
        unrelatedCommit = api?.value;
        flushSync(() => api?.request((previous) => previous + 1));
      });
      return { unrelatedCommit, current: api?.value, changes };
    }),

  partialCommit: () =>
    withRoot(async (root) => {
      const changes: number[] = [];
      let current: number | undefined;
      let request: SetValue<number> | undefined;
      function Counter() {
        const [value, setValue] = useControllableValue({
          defaultValue: 0,
          onChange: (next) => changes.push(next),
        });
        useLayoutEffect(() => {
          current = value;
          request = setValue;
        });
        return null;
      }

      await render(root, <Counter />);
      let intermediate: number | undefined;
      await act(() => {
        flushSync(() => {
          request?.((previous) => previous + 1);
          startTransition(() => request?.((previous) => previous + 1));
        });
        intermediate = current;
        request?.((previous) => previous + 1);
      });
      return { intermediate, current, changes };
    }),

  abandonedRender: () =>
    withRoot(async (root) => {
      const changes: Array<[string, number]> = [];
      const blocked = new Promise<never>(() => {
        // Leave this render suspended until it is abandoned.
      });
      let attempted = false;
      let request: SetValue<number> | undefined;
      function Counter({ pending }: { pending: boolean }) {
        const [, setValue] = useControllableValue({
          value: pending ? 10 : 1,
          onChange: (next) =>
            changes.push([pending ? 'abandoned' : 'committed', next]),
        });
        useLayoutEffect(() => {
          request = setValue;
        });
        if (pending) {
          attempted = true;
          throw blocked;
        }
        return null;
      }
      const counter = (pending: boolean) => (
        <Suspense fallback={null}>
          <Counter pending={pending} />
        </Suspense>
      );

      await render(root, counter(false));
      await act(() => {
        startTransition(() => root.render(counter(true)));
      });
      await act(() => request?.((previous) => previous + 1));
      await render(root, counter(false));
      return { attempted, changes };
    }),

  strictMode: () =>
    withRoot(async (root) => {
      const changes: number[] = [];
      let current: number | undefined;
      let request: SetValue<number> | undefined;
      function Counter() {
        const [value, setValue] = useControllableValue({
          defaultValue: 0,
          onChange: (next) => changes.push(next),
        });
        useLayoutEffect(() => {
          current = value;
          request = setValue;
        });
        return null;
      }

      await render(
        root,
        <StrictMode>
          <Counter />
        </StrictMode>,
      );
      let synchronous: number[] = [];
      await act(() => {
        request?.((previous) => previous + 1);
        request?.(1);
        request?.((previous) => previous + 1);
        synchronous = [...changes];
      });
      return { current, changes, synchronous };
    }),
};

window.momoControllableValueTests = tests;

export type ControllableValueBrowserTests = typeof tests;

declare global {
  interface Window {
    momoControllableValueTests: typeof tests;
  }
}
