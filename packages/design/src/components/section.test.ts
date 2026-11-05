import { expect, expectTypeOf, test } from 'bun:test';

import { createElement as h } from 'react';

import type { HTMLProps } from '@base-ui/react';
import type { useRender } from '@base-ui/react/use-render';
import { renderToStaticMarkup } from 'react-dom/server';

import type { SectionProps, SectionState } from './section';
import { Section } from './section';

test('SSR renders falsy content and keeps content props off the native surface', () => {
  const markup = renderToStaticMarkup(
    h(Section, {
      id: 'summary',
      title: 0,
      description: '',
      footer: 'Actions',
      children: 0,
    }),
  );
  expect(markup).toContain('id="summary"');
  expect(markup).toMatch(/<h3[^>]*data-slot="section-title"[^>]*>0<\/h3>/);
  expect(markup).toContain('data-slot="section-description"');
  expect(markup).toMatch(/data-slot="section-content"[^>]*>0<\/div>/);
  expect(markup).toContain('>Actions</div>');
  expect(markup).not.toMatch(
    /\s(?:title|description|footer|role|tabindex|aria-live)=/,
  );
});

test('absent and explicitly hidden sections leave no empty content wrappers', () => {
  const absent = renderToStaticMarkup(
    h(Section, { title: null, description: false, footer: undefined }),
  );
  expect(absent).not.toMatch(
    /data-slot="section-(?:header|title|description|content|footer)"/,
  );
  const hidden = renderToStaticMarkup(
    h(Section, {
      title: 'Hidden title',
      description: 'Hidden description',
      children: 'Body',
      footer: 'Hidden footer',
      slots: { header: false, footer: false },
    }),
  );
  expect(hidden).not.toContain('Hidden');
  expect(hidden).not.toContain('section-header');
  expect(hidden).toContain('>Body</div>');
  const hiddenChildren = renderToStaticMarkup(
    h(Section, {
      title: 'Title',
      description: 'Description',
      children: 'Body',
      slots: { title: false, description: false, content: false },
    }),
  );
  expect(hiddenChildren).not.toContain('section-header');
  expect(hiddenChildren).not.toContain('section-content');
});

test('composes object, element and callback slots while preserving body and appearance', () => {
  const markup = renderToStaticMarkup(
    h(Section, {
      variant: 'outline',
      size: 'sm',
      render: (props, state) =>
        h('article', {
          ...props,
          'data-appearance': `${state.variant}/${state.size}`,
        }),
      title: 'Workspace',
      description: 'Shared settings',
      children: h('p', null, 'Body'),
      footer: 'Save',
      slots: {
        header: h('header'),
        title: {
          render: h('h2', { className: 'element-title', id: 'title-id' }),
          className: 'slot-title',
        },
        description: (props) => h('p', props),
        content: { render: (props) => h('section', props) },
        footer: h('footer'),
      },
    }),
  );
  expect(markup).toContain('data-appearance="outline/sm"');
  expect(markup).toContain('data-slot="section"');
  expect(markup).toMatch(/^<article[^>]*aria-labelledby="title-id"/);
  expect(markup).toContain('<header');
  expect(markup).toContain('<h2');
  expect(markup).toContain('id="title-id"');
  expect(markup).toContain('element-title');
  expect(markup).toContain('slot-title');
  expect(markup).toContain('text-momo-title-sm');
  expect(markup).toContain('>Shared settings</p>');
  expect(markup).toMatch(/<section[^>]*><p>Body<\/p><\/section>/);
  expect(markup).toMatch(/<footer[^>]*>Save<\/footer>/);
});

test('SSR names the section by its rendered title unless labelled explicitly', () => {
  const named = renderToStaticMarkup(
    h(Section, { title: 'Workspace' }, 'Body'),
  );
  const [, labelledBy] = named.match(
    /^<section[^>]*aria-labelledby="([^"]+)"/,
  )!;
  expect(named).toContain(`<h3 id="${labelledBy}"`);
  const custom = renderToStaticMarkup(
    h(Section, { title: 'Workspace', slots: { title: { id: 'custom' } } }),
  );
  expect(custom).toMatch(/^<section[^>]*aria-labelledby="custom"/);
  expect(custom).toContain('<h3 id="custom"');
  const explicit = renderToStaticMarkup(
    h(Section, { title: 'Workspace', 'aria-label': 'Settings' }),
  );
  expect(explicit).toContain('aria-label="Settings"');
  expect(explicit).not.toContain('aria-labelledby');
  for (const props of [
    { description: 'Only description' },
    { title: 'Hidden', slots: { header: false } },
    { title: 'Hidden', slots: { title: false } },
  ] as const) {
    expect(renderToStaticMarkup(h(Section, props, 'Body'))).not.toContain(
      'aria-labelledby',
    );
  }
});

test('render types distinguish root appearance from stateless content slots', () => {
  const props: SectionProps = {
    render: (attributes, state) => {
      expectTypeOf(attributes).toEqualTypeOf<HTMLProps>();
      expectTypeOf(state).toEqualTypeOf<SectionState>();
      return h('article', attributes);
    },
    slots: {
      title: (attributes, state) => {
        expectTypeOf(attributes).toEqualTypeOf<HTMLProps>();
        expectTypeOf(state).toEqualTypeOf<useRender.State>();
        return h('h2', attributes);
      },
      content: {
        // @ts-expect-error Content belongs in Section children, not slot props.
        children: 'Body',
      },
    },
  };
  expect(typeof props.render).toBe('function');
  expect(typeof props.slots?.title).toBe('function');
});
