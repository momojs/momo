import type { ReactNode } from 'react';
import { createElement, createRef } from 'react';

import { Field as FieldParts } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { Select as SelectParts } from '@base-ui/react/select';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { Alert, AlertRoot } from './components/alert';
import { Badge } from './components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardRoot,
  CardTitle,
} from './components/card';
import {
  Field,
  FieldCellValidity,
  FieldError,
  FieldItem,
  FieldLabel,
  FieldValidity,
} from './components/field';
import { Input } from './components/input';
import { Numeric } from './components/numeric';
import { PickerDate } from './components/picker-date';
import { PickerTime } from './components/picker-time';
import { Rating } from './components/rating';
import { Select } from './components/select';
import type { ControlOptions } from './hooks/use-controllable-value';
import { useControllableValue } from './hooks/use-controllable-value';
import { useMemoize } from './hooks/use-memoize';

const root = createRoot(document.getElementById('root')!);
const media = '(prefers-reduced-motion: reduce)';
const query = window.matchMedia(media);
const matchMedia = window.matchMedia.bind(window);
let reduced = false;
Object.defineProperty(query, 'matches', { get: () => reduced });
window.matchMedia = (value) => (value === media ? query : matchMedia(value));
function reduce(value: boolean) {
  reduced = value;
  flushSync(() => query.dispatchEvent(new Event('change')));
}
function mount(node: ReactNode) {
  flushSync(() => root.render(node));
}

// Calling render again commits the same probe with the latest callback/props.
function hook<Result>(callback: () => Result) {
  let latest = callback;
  let value: Result;
  function Probe() {
    value = latest();
    return null;
  }
  return (next = latest) => {
    latest = next;
    mount(createElement(Probe));
    return value!;
  };
}

function control<Value, Args extends unknown[] = unknown[]>() {
  const render = hook(() => useControllableValue<Value, Args>({}));
  return (options: ControlOptions<Value, Args>) =>
    render(() => useControllableValue(options));
}

async function waitFor(
  condition: () => boolean,
  message = 'Condition did not settle',
) {
  const deadline = performance.now() + 3000;
  while (!condition()) {
    if (performance.now() > deadline) throw new Error(message);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  }
}

function key(element: Element, value: string) {
  const event = new KeyboardEvent('keydown', {
    key: value,
    bubbles: true,
    cancelable: true,
  });
  flushSync(() => element.dispatchEvent(event));
  return event;
}

function pointer(element: Element, type: string, init: PointerEventInit = {}) {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: 'mouse',
    ...init,
  });
  flushSync(() => element.dispatchEvent(event));
  return event;
}

function click(element: HTMLElement) {
  flushSync(() => element.click());
}

function slot<T extends HTMLElement = HTMLElement>(name: string): T {
  const element = document.querySelector<T>(`[data-slot="${name}"]`);
  if (!element) throw new Error(`Missing ${name}`);
  return element;
}

const api = {
  h: createElement,
  createRef,
  flushSync,
  mount,
  hook,
  control,
  waitFor,
  key,
  pointer,
  click,
  slot,
  reduce,
  Alert,
  AlertRoot,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardRoot,
  CardTitle,
  Field,
  FieldCellValidity,
  FieldItem,
  FieldLabel,
  FieldError,
  FieldValidity,
  FieldParts,
  Form,
  Input,
  Numeric,
  PickerDate,
  PickerTime,
  Rating,
  Select,
  SelectParts,
  useControllableValue,
  useMemoize,
};

declare global {
  interface Window {
    designFixture: typeof api;
  }
}
window.designFixture = api;
document.documentElement.dataset.fixtureReady = '';
