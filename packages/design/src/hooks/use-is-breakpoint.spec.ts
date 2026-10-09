import { expect, expectTypeOf, test } from 'bun:test';

import type { BreakpointMode, useIsBreakpoint } from './use-is-breakpoint';

test('returns a boolean and exposes both breakpoint modes', () => {
  expectTypeOf<ReturnType<typeof useIsBreakpoint>>().toEqualTypeOf<boolean>();
  expectTypeOf<BreakpointMode>().toEqualTypeOf<'min' | 'max'>();
});

test('SSR uses the configured snapshot without browser globals and rejects invalid widths', async () => {
  // Other suites mock React globally; isolate the real server renderer.
  const child = Bun.spawn({
    cmd: [
      Bun.which('bun')!,
      '-e',
      `
      import { createElement } from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { useIsBreakpoint } from ${JSON.stringify(new URL('./use-is-breakpoint.ts', import.meta.url).pathname)};
      function Probe(props) {
        return createElement('output', null,
          String(useIsBreakpoint(props.mode, props.width, props.options)));
      }
      const render = props => renderToStaticMarkup(createElement(Probe, props));
      const invalid = [-1, NaN, Infinity, -Infinity].map(width => {
        try { render({ width }); return false; }
        catch (error) { return error instanceof RangeError; }
      });
      console.log(JSON.stringify({
        defaultValue: render({}),
        override: render({ mode: 'min', width: 768.5, options: { serverMatches: true } }),
        zero: render({ width: 0 }),
        invalid,
      }));
      `,
    ],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [output, errors, exit] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  expect(exit).toBe(0);
  expect(errors).toBe('');
  expect(JSON.parse(output)).toEqual({
    defaultValue: '<output>false</output>',
    override: '<output>true</output>',
    zero: '<output>false</output>',
    invalid: [true, true, true, true],
  });
});
