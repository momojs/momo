import type { RefCallback } from 'react';
import { createRef, StrictMode, useLayoutEffect, useState } from 'react';

import { flushSync } from 'react-dom';
import { createRoot, hydrateRoot } from 'react-dom/client';

import type { BreakpointMode, ElementSize } from '../src/hooks';
import {
  useIsBreakpoint,
  useMergedRefs,
  usePrevious,
  useResize,
} from '../src/hooks';

interface BreakpointProps {
  id: string;
  mode?: BreakpointMode;
  breakpoint?: number;
  serverMatches?: boolean;
  onCommit?: (matches: boolean) => void;
}

export function BreakpointProbe({
  id,
  mode,
  breakpoint,
  serverMatches,
  onCommit,
}: BreakpointProps) {
  const matches = useIsBreakpoint(mode, breakpoint, { serverMatches });
  useLayoutEffect(() => {
    onCommit?.(matches);
  }, [matches, onCommit]);
  return (
    <output id={id} data-matches={matches}>
      {String(matches)}
    </output>
  );
}

function mountFixture() {
  const root = createRoot(document.getElementById('root')!);
  const objectRefs = [createRef<HTMLDivElement>(), createRef<HTMLDivElement>()];
  const events: string[] = [];
  const mergedCallbacks: RefCallback<HTMLDivElement>[] = [];
  const legacyRef = (node: HTMLDivElement | null) => {
    events.push(node ? 'legacy:attach' : 'legacy:detach');
  };
  const callbackRefs = [0, 1].map(
    (version): RefCallback<HTMLDivElement> =>
      (node) => {
        events.push(`${version}:${node ? 'attach' : 'null'}`);
        return () => {
          events.push(`${version}:cleanup`);
        };
      },
  );
  const measurements: { binding: number; size: ElementSize | null }[] = [];
  interface Options {
    mode: BreakpointMode;
    breakpoint: number;
    serverMatches: boolean;
    mounted: boolean;
    refVersion: number;
    value: number;
    binding: number;
    width: number;
    display: string;
  }
  let options: Options = {
    mode: 'max',
    breakpoint: 768,
    serverMatches: false,
    mounted: true,
    refVersion: 0,
    value: 1,
    binding: 0,
    width: 100,
    display: 'block',
  };

  function RefProbe({ version }: { version: number }) {
    const ref = useMergedRefs(
      objectRefs[version],
      callbackRefs[version],
      legacyRef,
      null,
      undefined,
    );
    mergedCallbacks.push(ref);
    return <div ref={ref} id='ref-target' />;
  }
  function PreviousProbe({ value }: { value: number }) {
    const previous = usePrevious(value);
    return <output id='previous'>{String(previous)}</output>;
  }
  function ResizeProbe({ binding, width, display }: Options) {
    const [target, setTarget] = useState<HTMLDivElement | null>(null);
    useResize(target, (_node, size) => measurements.push({ binding, size }), {
      key: binding,
    });
    return (
      <div
        ref={setTarget}
        id='resize-target'
        style={{
          display,
          width,
          height: 40,
          padding: 4,
          border: '1px solid',
          boxSizing: 'content-box',
          transform: 'scale(2)',
        }}
      >
        Content
      </div>
    );
  }
  function render(next: Partial<Options> = {}) {
    options = { ...options, ...next };
    flushSync(() => {
      root.render(
        <StrictMode>
          {options.mounted && (
            <>
              <BreakpointProbe id='breakpoint' {...options} />
              <RefProbe version={options.refVersion} />
              <PreviousProbe value={options.value} />
              <ResizeProbe {...options} />
            </>
          )}
        </StrictMode>,
      );
    });
  }

  const hydration: boolean[][] = [[], []];
  const hydrationErrors: string[] = [];
  const hydrationNodes = [0, 1].map((index) =>
    document.getElementById(`hydrated-${index}`),
  );
  const api = {
    render,
    events,
    objectRefs,
    mergedCallbacks,
    measurements,
    hydration,
    hydrationErrors,
    hydrationNodes,
  };
  window.publicHooksFixture = api;
  render();
  for (const index of [0, 1]) {
    hydrateRoot(
      document.getElementById(`hydration-${index}`)!,
      <BreakpointProbe
        id={`hydrated-${index}`}
        mode={index === 0 ? 'min' : 'max'}
        breakpoint={0}
        serverMatches={index === 1}
        onCommit={(matches) => hydration[index]!.push(matches)}
      />,
      {
        onRecoverableError(error) {
          hydrationErrors.push(String(error));
        },
      },
    );
  }
  return api;
}

declare global {
  interface Window {
    publicHooksFixture: ReturnType<typeof mountFixture>;
  }
}

if (typeof document !== 'undefined') mountFixture();
