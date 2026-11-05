import { expect, expectTypeOf, test } from 'bun:test';

import { createElement as h } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';

import type { MenuItemProps, MenuProps, MenuRadioGroupProps } from './menu';
import { Menu, MenuItem } from './menu';

test('SSR retains an accessible trigger without mounting portal content', () => {
  const markup = renderToStaticMarkup(
    h(
      Menu,
      {
        trigger: h('button', { id: undefined }, 'Actions'),
        triggerProps: { id: 'actions', 'aria-label': 'Project actions' },
      },
      h(MenuItem, null, 'Edit'),
    ),
  );
  expect(markup).toContain('id="actions"');
  expect(markup).toContain('aria-label="Project actions"');
  expect(markup).toContain('aria-haspopup="menu"');
  expect(markup).not.toContain('aria-expanded="true"');
  expect(markup).not.toContain('menu-popup');
  expect(markup).not.toContain('>Edit<');
});

test('render callbacks expose Base UI state and radio values stay typed', () => {
  const menu: MenuProps = {
    trigger: (props, state) => {
      expectTypeOf(state.open).toEqualTypeOf<boolean>();
      expectTypeOf(state.disabled).toEqualTypeOf<boolean>();
      return h('button', props);
    },
    onOpenChange: (_, details) => details.cancel(),
  };
  const item: MenuItemProps = {
    render: (props, state) => {
      expectTypeOf(state.highlighted).toEqualTypeOf<boolean>();
      return h('div', props);
    },
  };
  const group: MenuRadioGroupProps<'date' | 'name'> = {
    value: 'date',
    onValueChange: (value, details) => {
      expectTypeOf(value).toEqualTypeOf<'date' | 'name'>();
      details.cancel();
    },
  };
  expect(typeof menu.trigger).toBe('function');
  expect(typeof item.render).toBe('function');
  expect(group.value).toBe('date');
});

test('content slots accept objects, elements, state callbacks and false', () => {
  const surface: MenuProps = {
    title: 'Actions',
    description: 'Project',
    footer: 0,
    slots: {
      header: h('header'),
      title: { render: h('h3'), id: 'title' },
      content: (props, state) => {
        expectTypeOf<keyof typeof state>().toEqualTypeOf<never>();
        return h('section', props);
      },
      footer: false,
    },
  };
  const checkbox: import('./menu').MenuCheckboxItemProps = {
    description: 'Receive updates',
    slots: {
      content: (props, state) => {
        expectTypeOf(state.checked).toEqualTypeOf<boolean>();
        expectTypeOf(state.highlighted).toEqualTypeOf<boolean>();
        return h('span', props);
      },
      indicator: {
        render: (props, state) => {
          expectTypeOf(state.checked).toEqualTypeOf<boolean>();
          return h('span', props);
        },
      },
      shortcut: false,
    },
  };
  const submenu: import('./menu').MenuSubmenuProps = {
    label: 'Export',
    title: 'Format',
    slots: { title: h('h4') },
    triggerProps: {
      slots: {
        arrow: (props, state) => {
          expectTypeOf(state.open).toEqualTypeOf<boolean>();
          return h('span', props);
        },
      },
    },
  };
  expect(surface.slots?.footer).toBe(false);
  expect(typeof checkbox.slots?.content).toBe('function');
  expect(typeof submenu.triggerProps?.slots?.arrow).toBe('function');
});
