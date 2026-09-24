import { afterEach, describe, expect, test } from 'bun:test';

import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const roots: string[] = [];
const BIN = resolve(import.meta.dir, '../bin.ts');

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(): Promise<string> {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'momots-doctor-command-spec-')),
  );
  roots.push(root);
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'src/index.ts'), 'export const answer = 42;');
  await writeFile(
    join(root, 'custom.config.ts'),
    'export default { build: { scripts: [] } };',
  );
  return root;
}

async function run(cwd: string, ...args: string[]) {
  const child = Bun.spawn([process.execPath, BIN, 'doctor', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, exitCode };
}

describe('momo doctor', () => {
  test('prints JSON and succeeds with only warnings, accepting a relative --config', async () => {
    const root = await fixture();
    const { stdout, stderr, exitCode } = await run(
      root,
      '--json',
      '--config=custom.config.ts',
    );
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(JSON.parse(stdout)).toMatchObject({
      root,
      config: join(root, 'custom.config.ts'),
      ok: true,
      summary: { errors: 0, warnings: 1 },
      diagnostics: [expect.objectContaining({ code: 'output.missing' })],
    });
    expect(await readdir(root)).not.toContain('dist');
    expect(await readFile(join(root, 'src/index.ts'), 'utf8')).toContain('42');
  });

  test('prints a readable report with -c', async () => {
    const root = await fixture();
    const { stdout, exitCode } = await run(root, '-c', 'custom.config.ts');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('警告 [output.missing]');
    expect(stdout).toContain('检查通过：0 个错误，1 个警告');
  });

  test('reports missing configuration as JSON and exits with 1', async () => {
    const root = await fixture();
    const { stdout, stderr, exitCode } = await run(root, '--json');
    expect(exitCode).toBe(1);
    expect(stderr).toBe('');
    expect(JSON.parse(stdout).diagnostics[0].code).toBe('config.not-found');
  });

  test('reports a broken config as JSON and exits with 1', async () => {
    const root = await fixture();
    await writeFile(
      join(root, 'custom.config.ts'),
      'throw new Error("broken config");',
    );
    const { stdout, stderr, exitCode } = await run(
      root,
      '-c',
      'custom.config.ts',
      '--json',
    );
    expect(exitCode).toBe(1);
    expect(stderr).toBe('');
    expect(JSON.parse(stdout).diagnostics[0].code).toBe('config.load');
  });

  test.each(
    [
      ['--config'],
      ['--config='],
      ['--unknown'],
      ['unexpected'],
      ['--config', '--json'],
    ].map((args) => ({ args })),
  )('rejects invalid arguments %j with a machine-readable error', async ({
    args,
  }) => {
    const root = await fixture();
    const { stdout, stderr, exitCode } = await run(root, '--json', ...args);
    expect(exitCode).toBe(1);
    expect(stderr).toBe('');
    expect(JSON.parse(stdout).diagnostics[0].code).toBe('arguments.invalid');
  });

  test('shows command help without requiring a config', async () => {
    const root = await fixture();
    const { stdout, exitCode } = await run(root, '--help');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('用法: momo doctor');
    expect(stdout).toContain('--json');
  });
});
