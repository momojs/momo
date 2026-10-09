import { expect, expectTypeOf, test } from 'bun:test';

import type {
  StoragefySetter,
  StoragefyUpdater,
  UseStoragefyOptions,
  useStoragefy,
} from './use-storagefy';

test('exposes nullable storage values and an updater with an explicit previous value', () => {
  expectTypeOf<ReturnType<typeof useStoragefy<number>>>().toEqualTypeOf<
    readonly [number | null, StoragefySetter<number>]
  >();
  expectTypeOf<StoragefyUpdater<number>>().toEqualTypeOf<
    number | null | ((previous: number | null) => number | null)
  >();
  expectTypeOf<keyof UseStoragefyOptions>().toEqualTypeOf<'expires'>();
});

test('SSR uses an isolated empty MemoryStorage without resolving browser storage', async () => {
  const child = Bun.spawn({
    cmd: [
      Bun.which('bun')!,
      '-e',
      `
      import { createElement } from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { MemoryStorage, Storagefy } from '@momots/host/storage';
      import { useStoragefy } from ${JSON.stringify(new URL('./use-storagefy.ts', import.meta.url).pathname)};
      let resolved = 0;
      const cell = new Storagefy('browser', () => {
        resolved++;
        throw new Error('Browser storage must not be resolved during SSR');
      });
      const memory = new MemoryStorage();
      const populated = new Storagefy('server-data', memory);
      populated.set({ count: 9 });
      function Probe({ storage }) {
        const [value] = useStoragefy(storage);
        return createElement('output', null, JSON.stringify(value));
      }
      const render = storage => renderToStaticMarkup(createElement(Probe, { storage }));
      console.log(JSON.stringify({
        first: render(cell),
        second: render(cell),
        independent: render(populated),
        resolved,
        kept: populated.get(),
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
    first: '<output>null</output>',
    second: '<output>null</output>',
    independent: '<output>null</output>',
    resolved: 0,
    kept: { count: 9 },
  });
});
