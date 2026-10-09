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

function renderContentScenario(source: string) {
  // Isolate real React from the mocks used by other component suites.
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      '--eval',
      `
        import { createElement } from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { ContentContainer, asContentSlots } from ${JSON.stringify(new URL('./content.tsx', import.meta.url).href)};
        import { ToastProvider, createToastManager } from ${JSON.stringify(new URL('../components/toast.tsx', import.meta.url).href)};
        ${source}
      `,
    ],
    cwd: new URL('../..', import.meta.url).pathname,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  expect(new TextDecoder().decode(result.stderr)).toBe('');
  expect(result.exitCode).toBe(0);
  return new TextDecoder().decode(result.stdout);
}

test('renders containers with default, element and callback nodes', () => {
  const markup = renderContentScenario(`
    process.stdout.write(renderToStaticMarkup(createElement('main', null,
      createElement(ContentContainer, { id: 'default' }, 'Default'),
      createElement(ContentContainer, {
        render: createElement('section', { className: 'custom' }),
        className: 'base',
      }, 'Element'),
      createElement(ContentContainer, {
        render: (props) => createElement('footer', props),
      }, 'Callback'),
    )));
  `);
  expect(markup).toContain('<div id="default">Default</div>');
  expect(markup).toContain('<section class="custom base">Element</section>');
  expect(markup).toContain('<footer>Callback</footer>');
});

test.each([
  'shorthand',
  'object',
  'custom',
])('preserves semantic IDs for nullish render IDs (%s)', (configuration) => {
  const markup = renderContentScenario(`
    const manager = createToastManager();
    manager.add({ title: 'Title', description: 'Details' });
    const slot = (tag, id) => {
      const render = createElement(tag, { id: tag === 'h3' ? undefined : null });
      if (${JSON.stringify(configuration)} === 'shorthand') return render;
      return { render, id: ${configuration === 'custom'} ? id : undefined };
    };
    process.stdout.write(renderToStaticMarkup(createElement(ToastProvider, {
      toastManager: manager, portal: false,
      slots: {
        title: slot('h3', 'custom-title'),
        description: slot('p', 'custom-description'),
        icon: false, close: false,
      },
    })));
  `);
  const titleId = markup.match(/aria-labelledby="([^"]+)"/)?.[1];
  const descriptionId = markup.match(/aria-describedby="([^"]+)"/)?.[1];
  expect(titleId).toBeDefined();
  expect(descriptionId).toBeDefined();
  expect(markup.match(/<h3[^>]*>/)?.[0]).toContain(`id="${titleId}"`);
  expect(markup.match(/<p[^>]*>/)?.[0]).toContain(`id="${descriptionId}"`);
  if (configuration === 'custom') {
    expect(titleId).toBe('custom-title');
    expect(descriptionId).toBe('custom-description');
  }
});

test('normalizes empty render IDs without mutating element identity props', () => {
  const result = JSON.parse(
    renderContentScenario(`
      const ref = () => undefined;
      const onClick = () => undefined;
      const render = createElement('h3', {
        id: undefined, key: 'heading', ref, onClick, className: 'custom',
      });
      const config = Object.freeze({ id: 'slot-title', render });
      const { title } = asContentSlots({ title: config });
      const explicit = createElement('h3', { id: 'element-title' });
      const { title: preferred } = asContentSlots({
        title: { id: 'slot-title', render: explicit },
      });
      process.stdout.write(JSON.stringify({
        originalIdPresent: Object.hasOwn(render.props, 'id'),
        originalIdUnchanged: render.props.id === undefined,
        originalRenderUnchanged: config.render === render,
        keyPreserved: title.render.key === render.key,
        refPreserved: title.render.props.ref === ref,
        handlerPreserved: title.render.props.onClick === onClick,
        className: title.render.props.className,
        resolvedId: title.id,
        preferredId: preferred.id,
        explicitRenderUnchanged: preferred.render === explicit,
      }));
    `),
  );
  expect(result).toEqual({
    originalIdPresent: true,
    originalIdUnchanged: true,
    originalRenderUnchanged: true,
    keyPreserved: true,
    refPreserved: true,
    handlerPreserved: true,
    className: 'custom',
    resolvedId: 'slot-title',
    preferredId: 'element-title',
    explicitRenderUnchanged: true,
  });
});

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
