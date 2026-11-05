import { expect, test } from 'bun:test';

import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { build } from '@momots/cli/build';

import config from '../../momo.config';

test('builds loadable ESM error helpers in the root and error entries', async () => {
  const root = resolve(import.meta.dir, '../..');
  const outdir = await mkdtemp(join(tmpdir(), 'momots-core-build-spec-'));
  try {
    await build({ ...config.build, root, outdir, scripts: [] });
    await writeFile(join(outdir, 'package.json'), '{"type":"module"}');
    await symlink(
      join(root, 'node_modules'),
      join(outdir, 'node_modules'),
      'dir',
    );

    // Node also rejects undefined exports that Bun's build can overlook.
    const result = Bun.spawnSync([
      'node',
      '--input-type=module',
      '--eval',
      `
        import { strict as assert } from 'node:assert';
        import { pathToFileURL } from 'node:url';

        for (const path of process.argv.slice(1)) {
          const api = await import(pathToFileURL(path));
          assert.equal(api.toErrorMessage(new Error('failed')), 'failed');
          assert.equal(
            api.toErrorSummary(new TypeError('failed')),
            'TypeError: failed',
          );
        }
      `,
      join(outdir, 'index.js'),
      join(outdir, 'error/index.js'),
    ]);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
  } finally {
    await rm(outdir, { recursive: true, force: true });
  }
});
