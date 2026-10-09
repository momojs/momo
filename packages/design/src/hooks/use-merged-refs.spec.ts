import { expect, expectTypeOf, test } from 'bun:test';

import type { RefCallback } from 'react';

import type { useMergedRefs } from './use-merged-refs';

test('retains the node type in the composed callback ref', () => {
  expectTypeOf<
    ReturnType<typeof useMergedRefs<HTMLInputElement>>
  >().toEqualTypeOf<RefCallback<HTMLInputElement>>();
});

test('server rendering does not attach refs or invoke their cleanup', async () => {
  const child = Bun.spawn({
    cmd: [
      Bun.which('bun')!,
      '-e',
      `
      import { createElement, createRef } from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { useMergedRefs } from ${JSON.stringify(new URL('./use-merged-refs.ts', import.meta.url).pathname)};
      const object = createRef();
      let calls = 0;
      function Probe() {
        const ref = useMergedRefs(object, () => { calls++; return () => calls++; }, null, undefined);
        return createElement('input', { ref, 'aria-label': 'Search' });
      }
      const html = renderToStaticMarkup(createElement(Probe));
      console.log(JSON.stringify({ html, calls, current: object.current }));
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
    html: '<input aria-label="Search"/>',
    calls: 0,
    current: null,
  });
});
