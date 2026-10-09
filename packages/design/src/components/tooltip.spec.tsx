import { expect, expectTypeOf, test } from 'bun:test';

import type { TooltipProps } from './tooltip';

test('content and trigger render callbacks retain their native prop and state types', () => {
  const props: TooltipProps = {
    trigger: (attributes, state) => {
      expectTypeOf(state.open).toEqualTypeOf<boolean>();
      return <button {...attributes} type='button' />;
    },
    slots: {
      content: (attributes, state) => {
        expectTypeOf<keyof typeof state>().toEqualTypeOf<never>();
        return <span {...attributes} />;
      },
    },
  };
  expect(typeof props.trigger).toBe('function');
  expect(typeof props.slots?.content).toBe('function');
});

test('SSR preserves the accessible trigger without emitting a portal or hint as its label', async () => {
  // Other component suites mock React globally; use the real renderer in isolation.
  const process = Bun.spawn({
    cmd: [
      Bun.which('bun')!,
      '-e',
      `
      import { createElement as h } from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { Tooltip, TooltipProvider } from ${JSON.stringify(new URL('./tooltip.tsx', import.meta.url).pathname)};
      console.log(renderToStaticMarkup(h(TooltipProvider, { delay: 300 },
        h(Tooltip, {
          defaultOpen: true,
          trigger: h('button', { id: 'save', type: 'button', 'aria-label': 'Save document', style: { color: 'red' } }, 'Save'),
        }, 'Supplementary hint'),
        h(Tooltip, {
          disabled: true,
          trigger: (props, state) => h('button', { ...props, 'data-open': state.open }, 'History'),
        }, 'View history'),
      )));
      `,
    ],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const output = await new Response(process.stdout).text();
  const errors = await new Response(process.stderr).text();
  expect(await process.exited).toBe(0);
  expect(errors).toBe('');
  expect(output).toContain('id="save"');
  expect(output).toContain('aria-label="Save document"');
  expect(output).toContain('color:red');
  expect(output).toContain('data-open="false"');
  expect(output).not.toContain('tooltip-popup');
  expect(output).not.toContain('Supplementary hint');
  expect(output).not.toContain('aria-describedby');
  expect(output).not.toContain(' disabled=""');
});
