import { createRef, StrictMode } from 'react';

import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { canonicalD } from 'morphicons/dom';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { Icon } from '../src/components/icon';
import { Spinner } from '../src/components/spinner';
import { ToastIcon } from '../src/components/toast';

const media = '(prefers-reduced-motion: reduce)';
const query = Object.assign(new EventTarget(), {
  media,
  matches: false,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
}) as MediaQueryList;
let reduced = false;
const originalMatchMedia = window.matchMedia.bind(window);
Object.defineProperty(query, 'matches', { get: () => reduced });
window.matchMedia = (value) =>
  value === media ? query : originalMatchMedia(value);

interface State {
  result?: 'success' | 'error';
  morph: boolean;
  mounted: boolean;
  revision: number;
}
const ref = createRef<SVGSVGElement>();
const root = createRoot(document.getElementById('root')!);
let state: State = { morph: true, mounted: true, revision: 0 };
const icons = { success: CheckmarkCircle02Icon, error: AlertCircleIcon };

function render(next: Partial<State> = {}) {
  state = { ...state, ...next };
  const icon = state.result ? icons[state.result] : undefined;
  flushSync(() =>
    root.render(
      <StrictMode>
        <main data-revision={state.revision}>
          {state.mounted && (
            <>
              <Spinner
                id='subject'
                ref={ref}
                icon={icon}
                morph={state.morph}
                initial={false}
                width={80}
                height={80}
                aria-label='Operation status'
              />
              <div id='toast'>
                <ToastIcon
                  type={
                    state.result === 'error'
                      ? 'danger'
                      : (state.result ?? 'loading')
                  }
                />
              </div>
              <Icon
                id='ordinary'
                icon={icon ?? CheckmarkCircle02Icon}
                morph={state.morph}
              />
            </>
          )}
        </main>
      </StrictMode>,
    ),
  );
}

window.spinnerFixture = {
  render,
  reduce(value) {
    reduced = value;
    flushSync(() => query.dispatchEvent(new Event('change')));
  },
  ref,
  targets: {
    success: canonicalD(CheckmarkCircle02Icon),
    error: canonicalD(AlertCircleIcon),
  },
};
render();

declare global {
  interface Window {
    spinnerFixture: {
      render(next?: Partial<State>): void;
      reduce(value: boolean): void;
      ref: typeof ref;
      targets: { success: string; error: string };
    };
  }
}
