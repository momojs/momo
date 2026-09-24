import { afterEach, describe, expect, test } from 'bun:test';

import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { doctor } from './doctor';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(
  config: unknown = { build: { scripts: [] } },
  manifest: unknown = { name: '@fixture/doctor', type: 'module' },
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'momots-cli-doctor-spec-'));
  roots.push(root);
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'src/index.ts'), 'export const value = 42;\n');
  await writeFile(
    join(root, 'momo.config.ts'),
    `export default ${JSON.stringify(config)};\n`,
  );
  if (manifest !== undefined)
    await writeFile(join(root, 'package.json'), JSON.stringify(manifest));
  return root;
}

async function output(
  root: string,
  path: string,
  source = 'export const value = 42;\n',
) {
  const file = join(root, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, source);
}

async function snapshot(root: string): Promise<Record<string, string>> {
  const files = await readdir(root, { recursive: true, withFileTypes: true });
  const contents = await Promise.all(
    files
      .filter((file) => file.isFile())
      .map(async (file) => {
        const path = join(file.parentPath, file.name);
        return [path, await readFile(path, 'utf8')] as const;
      }),
  );
  return Object.fromEntries(contents);
}

const codes = (report: Awaited<ReturnType<typeof doctor>>) =>
  report.diagnostics.map(({ code }) => code);

describe('doctor', () => {
  test('checks an existing build without executing scripts or changing files', async () => {
    const root = await fixture(
      { build: { executables: ['index.js'] } },
      {
        name: '@fixture/doctor',
        scripts: { typecheck: 'touch SHOULD_NOT_EXIST', types: 'exit 99' },
        exports: {
          '.': { import: './dist/index.js', types: './dist/index.d.ts' },
        },
      },
    );
    await output(root, 'dist/index.js');
    await output(
      root,
      'dist/index.d.ts',
      'export declare const value: number;\n',
    );
    await chmod(join(root, 'dist/index.js'), 0o755);
    const before = await snapshot(root);

    const report = await doctor({ cwd: join(root, 'src') });

    expect(report.root).toBe(root);
    expect(report.config).toBe(join(root, 'momo.config.ts'));
    expect(report.ok).toBe(true);
    expect(report.summary).toEqual({ errors: 0, warnings: 0 });
    expect(await snapshot(root)).toEqual(before);
  });

  test('reports an unbuilt package as a warning without cascading missing exports', async () => {
    const root = await fixture(
      { build: { scripts: [], executables: ['index.js'] } },
      {
        exports: {
          '.': { import: './dist/index.js', types: './dist/index.d.ts' },
        },
      },
    );
    const report = await doctor({ cwd: root });
    expect(report.ok).toBe(true);
    expect(codes(report)).toEqual(['output.missing']);
    expect(await readdir(root)).not.toContain('dist');
  });

  test('supports manifest-free builds with no scripts or selective bundle', async () => {
    const root = await fixture();
    await rm(join(root, 'package.json'));
    const report = await doctor({ cwd: root });
    expect(report.ok).toBe(true);
    expect(codes(report)).toEqual(['output.missing']);
  });

  test('reports a missing manifest when default scripts or selective bundle need it', async () => {
    for (const build of [{}, { scripts: [], bundle: ['internal'] }]) {
      const root = await fixture({ build });
      await rm(join(root, 'package.json'));
      const report = await doctor({ cwd: root });
      expect(report.ok).toBe(false);
      expect(codes(report)).toContain('manifest.missing');
    }
  });

  test('aggregates missing scripts and bundle conflicts while accepting devDependencies', async () => {
    const root = await fixture(
      {
        build: {
          bundle: ['@fixture/internal', 'typo'],
          external: ['@fixture/*'],
        },
      },
      { devDependencies: { '@fixture/internal': 'workspace:*' } },
    );
    const report = await doctor({ cwd: root });
    expect(report.summary.errors).toBe(3);
    expect(codes(report)).toContain('bundle.external-conflict');
    expect(
      report.diagnostics.filter(({ code }) => code === 'script.missing'),
    ).toHaveLength(2);
    expect(
      report.diagnostics.filter(({ code }) => code === 'bundle.undeclared'),
    ).toEqual([
      expect.objectContaining({ message: expect.stringContaining('typo') }),
    ]);
  });

  test.each(
    [
      null,
      [],
      { build: null },
      { build: [] },
      { build: { src: 2 } },
      { build: { target: ['browser'] } },
      { build: { bundle: 'pkg' } },
      { build: { assets: { a: false } } },
    ].map((config) => ({ config })),
  )('reports invalid configuration %j instead of throwing', async ({
    config,
  }) => {
    const root = await fixture(config);
    const report = await doctor({ cwd: root });
    expect(report.ok).toBe(false);
    expect(
      report.diagnostics.some(({ code }) => code.startsWith('config.')),
    ).toBe(true);
    expect(codes(report)).not.toContain('inspection.failed');
  });

  test('warns about unknown fields', async () => {
    const root = await fixture({
      test: {},
      build: { scripts: [], typo: true },
    });
    const report = await doctor({ cwd: root });
    expect(report.ok).toBe(true);
    expect(
      report.diagnostics.filter(({ code }) => code === 'config.unknown-field'),
    ).toHaveLength(2);
  });

  test('reports config load failures and malformed manifests', async () => {
    const root = await fixture();
    await writeFile(join(root, 'broken.ts'), 'export default {');
    expect(codes(await doctor({ cwd: root, config: 'broken.ts' }))).toContain(
      'config.load',
    );
    expect(codes(await doctor({ cwd: root, config: 'missing.ts' }))).toContain(
      'config.load',
    );
    await writeFile(join(root, 'package.json'), '{');
    expect(codes(await doctor({ cwd: root }))).toContain('manifest.invalid');
  });

  test('detects an empty source tree using the same entry rules as build', async () => {
    const root = await fixture();
    await rm(join(root, 'src/index.ts'));
    await output(root, 'src/index.spec.ts');
    await output(root, 'src/index.spec.tsx');
    await output(root, 'src/index.d.ts');
    expect(codes(await doctor({ cwd: root }))).toContain('source.empty');
  });

  test.each([
    '.',
    '..',
    'src',
    'src/generated',
  ])('detects destructive or overlapping outdir %s without deleting it', async (outdir) => {
    const root = await fixture({ build: { scripts: [], outdir } });
    const before = await snapshot(root);
    const report = await doctor({ cwd: root });
    expect(codes(report)).toContain('output.unsafe');
    expect(await snapshot(root)).toEqual(before);
  });

  test('resolves output and asset symlinks when checking containment', async () => {
    const root = await fixture({
      build: {
        scripts: [],
        outdir: 'linked/generated',
        assets: { 'src/index.ts': 'out.js' },
      },
    });
    await symlink(join(root, 'src'), join(root, 'linked'), 'dir');
    expect(codes(await doctor({ cwd: root }))).toContain('output.unsafe');

    const other = await fixture({
      build: { scripts: [], assets: { 'src/index.ts': 'escape/copied.ts' } },
    });
    await mkdir(join(other, 'dist'));
    await symlink(join(other, 'src'), join(other, 'dist/escape'), 'dir');
    expect(codes(await doctor({ cwd: other }))).toContain('output.path-escape');
  });

  test('checks assets and executables, including traversal and sources removed by clean', async () => {
    const root = await fixture({
      build: {
        scripts: [],
        assets: { 'missing.css': '../outside.css', 'dist/index.js': 'copy.js' },
        executables: ['missing.js', '../src/index.ts'],
      },
    });
    await output(root, 'dist/index.js');
    const report = await doctor({ cwd: root });
    expect(codes(report)).toContain('asset.missing');
    expect(codes(report)).toContain('asset.in-output');
    expect(codes(report)).toContain('executable.missing');
    expect(
      report.diagnostics.filter(({ code }) => code === 'output.path-escape'),
    ).toHaveLength(2);
  });

  test('checks nested and wildcard exports against files in an existing build', async () => {
    const root = await fixture(undefined, {
      exports: {
        '.': [{ node: { import: './dist/index.js' } }],
        './nested/*': './dist/nested/*.js',
        './missing': './dist/missing.js',
        './empty/*': './dist/empty/*.js',
        './disabled': null,
        './outside': '../outside.js',
      },
    });
    await output(root, 'dist/index.js');
    await output(root, 'dist/nested/deep/value.js');
    const report = await doctor({ cwd: root });
    expect(
      report.diagnostics.filter(({ code }) => code === 'exports.missing'),
    ).toHaveLength(2);
    expect(codes(report)).toContain('exports.invalid-target');
    expect(report.summary.errors).toBe(3);
  });
});
