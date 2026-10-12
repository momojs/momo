import { expect, test } from 'bun:test';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { build } from '@momots/cli/build';

import config from '../../momo.config';

test('builds valid ESM for every host entry and shared chunk', async () => {
  const outdir = await mkdtemp(join(tmpdir(), 'momots-host-build-spec-'));
  try {
    await build({
      ...config.build,
      root: resolve(import.meta.dir, '../..'),
      outdir,
      scripts: [],
    });

    // Bun can report a successful build while emitting undefined exports.
    const parser = new Bun.Transpiler({ loader: 'js' });
    const files = await Array.fromAsync(
      new Bun.Glob('**/*.js').scan({ cwd: outdir, absolute: true }),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = await Bun.file(file).text();
      expect(() => parser.transformSync(source), file).not.toThrow();
    }

    const guards: typeof import('./index') = await import(
      join(outdir, 'guard/index.js')
    );
    const android: typeof import('./is-android') = await import(
      join(outdir, 'guard/is-android.js')
    );
    const ssr: typeof import('./is-ssr') = await import(
      join(outdir, 'guard/is-ssr.js')
    );
    expect(guards.isAndroid).toBe(android.isAndroid);
    expect(guards.isSSR).toBe(ssr.isSSR);
    expect(guards.isAndroid('Mozilla/5.0 (Linux; Android 14)')).toBe(true);
    expect(guards.isSSR()).toBe(true);
  } finally {
    await rm(outdir, { recursive: true, force: true });
  }
});
