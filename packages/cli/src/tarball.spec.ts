import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { tarball } from './tarball';

async function fixture(source = 'export const value = {};\n'): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'momots-cli-tarball-spec-'));
  await mkdir(join(root, 'dist'));
  await Promise.all([
    writeFile(
      join(root, 'package.json'),
      `${JSON.stringify(
        {
          name: '@fixture/package',
          version: '1.0.0',
          type: 'module',
          files: ['dist'],
          exports: {
            '.': {
              types: './dist/index.d.ts',
              import: './dist/index.js',
            },
            './focused': {
              types: './dist/focused.d.ts',
              import: './dist/focused.js',
            },
          },
        },
        undefined,
        2,
      )}\n`,
    ),
    writeFile(join(root, 'dist/index.js'), source),
    writeFile(
      join(root, 'dist/focused.js'),
      "export { value } from './index.js';\n",
    ),
    writeFile(
      join(root, 'dist/index.d.ts'),
      'export declare const value: object;\n',
    ),
    writeFile(
      join(root, 'dist/focused.d.ts'),
      "export { value } from './index.js';\n",
    ),
  ]);
  return root;
}

describe('tarball', () => {
  test('packs, imports, compares identities, and runs a package check', async () => {
    const root = await fixture();
    let packedName: unknown;

    try {
      const result = await tarball({
        root,
        keep: true,
        identities: [{ export: 'value', from: ['.', './focused'] }],
        check: async ({ manifest, packageDirectory }) => {
          packedName = manifest['name'];
          expect(
            await readFile(join(packageDirectory, 'dist/index.js'), 'utf8'),
          ).toContain('value');
        },
      });

      expect(result.name).toBe('@fixture/package');
      expect(result.preserved).toBe(true);
      expect(result.temporaryDirectory).toBeDefined();
      expect(packedName).toBe('@fixture/package');
      if (result.temporaryDirectory) {
        await rm(result.temporaryDirectory, { force: true, recursive: true });
      }
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  test('rejects forbidden imports without exposing the dependency to consumer', async () => {
    const root = await fixture("export { value } from '@fixture/forbidden';\n");

    try {
      await expect(
        tarball({ root, forbidImports: ['@fixture/forbidden'] }),
      ).rejects.toThrow('still imports forbidden package @fixture/forbidden');
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});
