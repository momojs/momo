import { createRef, StrictMode } from 'react';

import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { Button } from '../src/components/button';
import type { TooltipProps } from '../src/components/tooltip';
import { Tooltip, TooltipProvider } from '../src/components/tooltip';
import { defineTheme, MotionUIThemeProvider } from '../src/motion';

const root = createRoot(document.getElementById('root')!);
const triggerRef = createRef<HTMLButtonElement>();
const details: { open: boolean; reason: string }[] = [];
const changes: boolean[] = [];
let clicks = 0;
let refMounts = 0;
const slotRef = (node: HTMLElement | null) => {
  if (node) refMounts++;
};
interface Options {
  open?: boolean;
  disabled?: boolean;
  cancel?: boolean;
  delay?: number;
  closeDelay?: number;
  providerDelay?: number;
  callback?: boolean;
  slot?: 'object' | 'element' | 'callback' | 'hidden';
  edge?: boolean;
  reduced?: 'calm' | 'off';
}
let options: Options = {};

function render(next: Options = {}) {
  options = { ...options, ...next };
  const {
    open,
    disabled,
    cancel,
    delay,
    closeDelay,
    providerDelay,
    callback,
    slot,
    edge,
    reduced,
  } = options;
  const slots: TooltipProps['slots'] = {
    content:
      slot === 'hidden' ? (
        false
      ) : slot === 'element' ? (
        <section id='custom-content' ref={slotRef} />
      ) : slot === 'callback' ? (
        (props) => <article {...props} id='custom-content' ref={slotRef} />
      ) : (
        {
          render: <section />,
          id: 'custom-content',
          ref: slotRef,
          className: 'slot-content',
        }
      ),
  };
  flushSync(() =>
    root.render(
      <StrictMode>
        <MotionUIThemeProvider
          theme={defineTheme({ reducedMotion: reduced ?? 'calm' })}
        >
          <TooltipProvider
            delay={providerDelay ?? 300}
            closeDelay={closeDelay}
            timeout={500}
          >
            <button id='before' type='button'>
              Before
            </button>
            <Tooltip
              key={open === undefined ? 'uncontrolled' : 'controlled'}
              open={open}
              disabled={disabled}
              delay={delay}
              closeDelay={closeDelay}
              showArrow
              side='top'
              disableHoverablePopup
              slots={slots}
              triggerClassName='composed-trigger'
              triggerProps={{ id: 'trigger' }}
              positionerProps={{ collisionPadding: 12 }}
              onOpenChange={(value, event) => {
                details.push({ open: value, reason: event.reason });
                if (cancel) event.cancel();
              }}
              onChange={(value) => changes.push(value)}
              trigger={
                callback ? (
                  (props, state) => (
                    <button
                      {...props}
                      type='button'
                      data-callback-open={state.open}
                    >
                      Callback
                    </button>
                  )
                ) : (
                  <Button
                    id='trigger'
                    ref={triggerRef}
                    aria-label='Save document'
                    style={
                      edge
                        ? { position: 'fixed', top: 0, right: 0 }
                        : { color: 'rgb(255, 0, 0)' }
                    }
                    className='original-trigger'
                    onClick={() => clicks++}
                  >
                    Save
                  </Button>
                )
              }
            >
              {edge
                ? 'A long supplementary hint '.repeat(12)
                : 'Save your changes'}
            </Tooltip>
            <Tooltip
              trigger={
                <button id='second' type='button'>
                  History
                </button>
              }
            >
              View history
            </Tooltip>
            <button id='after' type='button'>
              After
            </button>
          </TooltipProvider>
        </MotionUIThemeProvider>
      </StrictMode>,
    ),
  );
}

function hover(id: string, pointerType = 'mouse') {
  const target = document.getElementById(id)!;
  const rect = target.getBoundingClientRect();
  const init = { bubbles: true, clientX: rect.x + 8, clientY: rect.y + 8 };
  target.dispatchEvent(
    new PointerEvent('pointerover', { ...init, pointerType }),
  );
  target.dispatchEvent(new MouseEvent('mouseover', init));
  target.dispatchEvent(
    new MouseEvent('mouseenter', { ...init, bubbles: false }),
  );
  target.dispatchEvent(new MouseEvent('mousemove', init));
}
function leave(id: string) {
  const target = document.getElementById(id)!;
  const init = {
    bubbles: true,
    relatedTarget: document.body,
    clientX: 0,
    clientY: 0,
  };
  target.dispatchEvent(new MouseEvent('mouseout', init));
  target.dispatchEvent(
    new MouseEvent('mouseleave', { ...init, bubbles: false }),
  );
}

const api = {
  render,
  hover,
  leave,
  details,
  changes,
  triggerRef,
  get clicks() {
    return clicks;
  },
  get refMounts() {
    return refMounts;
  },
};
declare global {
  interface Window {
    tooltipFixture: typeof api;
  }
}
window.tooltipFixture = api;
render();
