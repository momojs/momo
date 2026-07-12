import { measureText } from '../src/canvas';
import { isCSSStyleRule } from '../src/guard/is-css-style-rule';
import { isElement } from '../src/guard/is-element';
import { isHTMLElement } from '../src/guard/is-html-element';
import { isInputElement } from '../src/guard/is-input-element';
import { isOverflow } from '../src/guard/is-overflow';
import { isScrollable } from '../src/guard/is-scrollable';
import { isSSR } from '../src/guard/is-ssr';
import { isTextAreaElement } from '../src/guard/is-text-area-element';
import { isTouchDevice } from '../src/guard/is-touch-device';

function resetBody(): void {
  document.body.replaceChildren();
}

globalThis.__momoHostBrowserTests = {
  elementTypes() {
    resetBody();
    const box = document.createElement('div');
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    document.body.append(box, input, textarea);

    return {
      element: isElement(box),
      htmlElement: isHTMLElement(box),
      input: isInputElement(input),
      inputRejectsTextarea: !isInputElement(textarea),
      textarea: isTextAreaElement(textarea),
      textareaRejectsInput: !isTextAreaElement(input),
      ssr: isSSR(),
    };
  },

  cssStyleRule() {
    resetBody();
    const style = document.createElement('style');
    style.textContent = '.momo-host-rule { color: red; }';
    document.body.append(style);

    return {
      rule: isCSSStyleRule(style.sheet?.cssRules.item(0)),
      element: isCSSStyleRule(style),
    };
  },

  canvasMeasurement() {
    const width = measureText('momo', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
    });
    const larger = measureText('momo', {
      fontSize: '32px',
      fontFamily: 'sans-serif',
    });

    return { width, larger, empty: measureText() };
  },

  layout() {
    resetBody();
    const scrollable = document.createElement('div');
    scrollable.style.cssText = 'width: 100px; height: 100px; overflow: auto;';
    const inner = document.createElement('div');
    inner.style.cssText = 'width: 100px; height: 240px;';
    scrollable.append(inner);

    const plain = document.createElement('div');
    plain.style.cssText = 'width: 100px; height: 100px;';
    document.body.append(scrollable, plain);

    return {
      scrollable: isScrollable(scrollable),
      overflow: isOverflow(scrollable),
      plainScrollable: isScrollable(plain),
      plainOverflow: isOverflow(plain),
      touchType: typeof isTouchDevice(),
    };
  },

  touchDevice() {
    const originalMatchMedia = window.matchMedia;
    const originalTouchEvent = Object.getOwnPropertyDescriptor(
      globalThis,
      'TouchEvent',
    );
    const originalOntouchstart = Object.getOwnPropertyDescriptor(
      window,
      'ontouchstart',
    );

    try {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: () => ({ matches: true }),
      });
      const coarsePointer = isTouchDevice();

      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: () => ({ matches: false }),
      });
      const finePointer = isTouchDevice();

      Object.defineProperty(globalThis, 'TouchEvent', {
        configurable: true,
        value: class TouchEvent {},
      });
      Object.defineProperty(window, 'ontouchstart', {
        configurable: true,
        value: null,
      });

      return {
        coarsePointer,
        finePointerType: typeof finePointer,
        touchEvent: isTouchDevice(),
      };
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      });

      if (originalTouchEvent) {
        Object.defineProperty(globalThis, 'TouchEvent', originalTouchEvent);
      } else {
        Reflect.deleteProperty(globalThis, 'TouchEvent');
      }

      if (originalOntouchstart) {
        Object.defineProperty(window, 'ontouchstart', originalOntouchstart);
      } else {
        Reflect.deleteProperty(window, 'ontouchstart');
      }
    }
  },
};

document.body.dataset.testFixture = 'ready';

declare global {
  var __momoHostBrowserTests: {
    elementTypes(): Record<string, boolean>;
    cssStyleRule(): Record<string, boolean>;
    canvasMeasurement(): {
      width?: number;
      larger?: number;
      empty?: number;
    };
    layout(): Record<string, boolean | string>;
    touchDevice(): Record<string, boolean | string>;
  };
}
