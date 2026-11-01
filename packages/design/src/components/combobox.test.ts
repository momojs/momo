import { expect, expectTypeOf, test } from 'bun:test';

import { createElement } from 'react';

import type { ComboboxProps } from './combobox';

test('single, multiple and render callbacks retain their value and state types', () => {
  const single: ComboboxProps<number> = {
    options: [{ value: 0, label: 'Zero' }],
    onChange(value) {
      expectTypeOf(value).toEqualTypeOf<number | null>();
    },
    slots: {
      input: (props, state) => {
        expectTypeOf(state.open).toEqualTypeOf<boolean>();
        return createElement('input', props);
      },
      item: (props, state) => {
        expectTypeOf(state.selected).toEqualTypeOf<boolean>();
        return createElement('div', props);
      },
    },
  };
  const multiple: ComboboxProps<string, true> = {
    multiple: true,
    options: [{ value: 'apple', label: 'Apple' }],
    onChange(value) {
      expectTypeOf(value).toEqualTypeOf<string[]>();
    },
  };
  expect(single.options[0]?.value).toBe(0);
  expect(multiple.multiple).toBe(true);
});

test('SSR preserves the input label and serializes the selected primitive value', async () => {
  const child = Bun.spawn({
    cwd: new URL('../../', import.meta.url).pathname,
    cmd: [
      process.execPath,
      '-e',
      `
      import { createElement as h } from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { Combobox } from ${JSON.stringify(new URL('./combobox.tsx', import.meta.url).pathname)};
      console.log(renderToStaticMarkup(h(Combobox, {
        options: [{ value: 0, label: 'Zero' }], defaultValue: 0, name: 'choice',
        slots: { input: { 'aria-label': 'Choice' } },
      })));
    `,
    ],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const output = await new Response(child.stdout).text();
  const errors = await new Response(child.stderr).text();
  expect(errors).toBe('');
  expect(await child.exited).toBe(0);
  expect(output).toContain('aria-label="Choice"');
  expect(output).toContain('name="choice"');
  expect(output).toContain('value="0"');
  expect(output).toContain('value="Zero"');
  expect(output).not.toContain('combobox-popup');
});
