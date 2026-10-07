import { expect, expectTypeOf, test } from 'bun:test';

import type { HTMLProps } from '@base-ui/react';
import type { useRender } from '@base-ui/react/use-render';

import type { AlertProps } from '../components/alert';
import type { DialogProps } from '../components/dialog';
import type { DrawerProps } from '../components/drawer';
import type { PopoverProps } from '../components/popover';
import type { SheetProps } from '../components/sheet';
import type {
  ToastContentState,
  ToastProviderProps,
} from '../components/toast';
import type { ContentProps } from './content';

// These callbacks are intentionally not invoked: tsc validates their contextual
// types, including the negative assertions, without mounting React components.
test('infers node props and state for render shorthand and object configuration', () => {
  const surfaceSlots = {
    header: <header />,
    title: (props, state) => {
      expectTypeOf(props).toEqualTypeOf<HTMLProps>();
      expectTypeOf(state).toEqualTypeOf<useRender.State>();
      return <h3 {...props} />;
    },
    content: {
      className: 'body',
      render: (props, state) => {
        expectTypeOf(props).toEqualTypeOf<HTMLProps>();
        expectTypeOf(state).toEqualTypeOf<useRender.State>();
        return <article {...props} />;
      },
    },
    footer: false,
  } satisfies NonNullable<PopoverProps['slots']>;
  expectTypeOf(surfaceSlots).toMatchTypeOf<DialogProps['slots']>();
  expectTypeOf(surfaceSlots).toMatchTypeOf<DrawerProps['slots']>();
  expectTypeOf(surfaceSlots).toMatchTypeOf<SheetProps['slots']>();

  const toastSlots: ToastProviderProps['slots'] = {
    content: (props, state) => {
      expectTypeOf(props).toEqualTypeOf<HTMLProps>();
      expectTypeOf(state).toEqualTypeOf<ToastContentState>();
      // @ts-expect-error State must not widen to any or include popup state.
      state.open;
      return <section {...props} data-index={state.index} />;
    },
    text: {
      render: (props, state) => {
        expectTypeOf(props).toEqualTypeOf<HTMLProps>();
        expectTypeOf(state).toEqualTypeOf<useRender.State>();
        return <div {...props} />;
      },
    },
    close: { label: 'Dismiss' },
  };
  const alertSlots: AlertProps['slots'] = {
    action: (props, state) => {
      expectTypeOf(props).toEqualTypeOf<HTMLProps>();
      expectTypeOf(state).toEqualTypeOf<useRender.State>();
      return <nav {...props} />;
    },
  };
  expect(typeof toastSlots.content).toBe('function');
  expect(typeof alertSlots.action).toBe('function');
});

test('keeps content separate and limits shorthand to nodes with a render prop', () => {
  const invalidSurface: NonNullable<PopoverProps['slots']> = {
    // @ts-expect-error Text belongs in the top-level title content prop.
    title: 'Title',
    // @ts-expect-error Numeric content is not a node configuration.
    description: 0,
    // @ts-expect-error Slot props cannot supply children.
    content: { children: 'Body' },
    // @ts-expect-error Use false to hide a slot, not null.
    footer: null,
    // @ts-expect-error Omit the slot to retain the default node.
    header: true,
  };
  const invalidToast: NonNullable<ToastProviderProps['slots']> = {
    // @ts-expect-error The Motion icon has no render prop.
    icon: <span />,
    // @ts-expect-error The Motion close button has no render prop.
    close: () => <button />,
    // @ts-expect-error Object configuration cannot add an unsupported render prop.
    action: { render: <button /> },
  };
  const invalidContent: ContentProps = {
    // @ts-expect-error A render callback belongs in slots.title.
    title: () => <h3 />,
  };
  expect(invalidSurface.title).toBeDefined();
  expect(invalidToast.icon).toBeDefined();
  expect(invalidContent.title).toBeDefined();
});
