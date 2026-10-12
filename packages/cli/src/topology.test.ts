import { afterEach, describe, expect, test } from 'bun:test';

import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { planTopology } from './topology';

const roots: string[] = [];
const BIN = resolve(import.meta.dir, 'bin.ts');

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixture(
  packages: Record<string, Record<string, unknown>>,
  workspaces: unknown = ['packages/*'],
): Promise<string> {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'momots-topology-spec-')),
  );
  roots.push(root);
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ name: 'root', private: true, workspaces }),
  );
  for (const [directory, manifest] of Object.entries(packages)) {
    const path = join(root, directory);
    await mkdir(path, { recursive: true });
    await writeFile(join(path, 'package.json'), JSON.stringify(manifest));
  }
  return root;
}

async function run(cwd: string, ...args: string[]) {
  const child = Bun.spawn([process.execPath, BIN, 'topology', ...args], {
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

async function traceBuild(
  root: string,
  directory: string,
  name: string,
  failure = false,
) {
  await writeFile(
    join(root, directory, 'build.ts'),
    `
import { appendFile } from 'node:fs/promises';
await appendFile(${JSON.stringify(join(root, 'trace.txt'))}, ${JSON.stringify(`${name}:start\n`)});
await Bun.sleep(10);
await appendFile(${JSON.stringify(join(root, 'trace.txt'))}, ${JSON.stringify(`${name}:end\n`)});
process.exit(${failure ? 7 : 0});
`,
  );
}

const names = (plan: Awaited<ReturnType<typeof planTopology>>) =>
  plan.packages.map(({ name }) => name);

describe('planTopology', () => {
  test('orders all four dependency kinds, including versioned peers, before consumers', async () => {
    const root = await fixture({
      'packages/z-cli': { name: '@test/cli' },
      'packages/z-core': {
        name: '@test/core',
        devDependencies: { '@test/cli': 'workspace:*' },
      },
      'packages/a-host': {
        name: '@test/host',
        peerDependencies: { '@test/core': '^1.0.0', external: '^1.0.0' },
      },
      'packages/b-design': {
        name: '@test/design',
        dependencies: { '@test/host': '*' },
        optionalDependencies: { '@test/core': '*' },
      },
      'packages/c-drive': {
        name: '@test/drive',
        devDependencies: { '@test/host': 'workspace:*' },
      },
    });
    expect(names(await planTopology({ cwd: root }))).toEqual([
      '@test/cli',
      '@test/core',
      '@test/host',
      '@test/design',
      '@test/drive',
    ]);
  });

  test('finds the workspace from a nested directory and includes transitive dependencies outside the filter', async () => {
    const root = await fixture(
      {
        'packages/tool': { name: 'tool' },
        'packages/bridge': {
          name: 'bridge',
          dependencies: { tool: 'workspace:*' },
        },
        'apps/web': { name: 'web', dependencies: { bridge: '*' } },
        'apps/other': { name: 'other' },
      },
      ['packages/*', 'apps/*'],
    );
    await mkdir(join(root, 'apps/web/src'));
    const plan = await planTopology({
      cwd: join(root, 'apps/web/src'),
      filters: ['./apps/web'],
    });
    expect(plan.root).toBe(root);
    expect(names(plan)).toEqual(['tool', 'bridge', 'web']);
  });

  test('supports name globs, repeated filters and deduplicated dependency edges', async () => {
    const root = await fixture({
      'packages/a': { name: '@test/a' },
      'packages/b': {
        name: '@test/b',
        dependencies: { '@test/a': '*' },
        peerDependencies: { '@test/a': '*' },
      },
      'packages/c': { name: 'c' },
    });
    const plan = await planTopology({
      cwd: root,
      filters: ['@test/*', 'packages/b/'],
    });
    expect(names(plan)).toEqual(['@test/a', '@test/b']);
    expect(plan.packages[1]?.dependencies).toEqual(['@test/a']);
  });

  test('supports object workspaces and exclusions, and never includes the root as a member', async () => {
    const root = await fixture(
      {
        'packages/a': { name: 'a' },
        'packages/ignored': { name: 'ignored' },
      },
      { packages: ['.', 'packages/*', './packages/a', '!packages/ignored'] },
    );
    expect(names(await planTopology({ cwd: root }))).toEqual(['a']);
  });

  test('reports a concrete cycle before constructing a runnable plan', async () => {
    const root = await fixture({
      'packages/a': { name: 'a', dependencies: { b: '*' } },
      'packages/b': { name: 'b', peerDependencies: { c: '*' } },
      'packages/c': { name: 'c', devDependencies: { a: 'workspace:*' } },
    });
    await expect(planTopology({ cwd: root })).rejects.toThrow('a → b → c → a');
  });

  test('detects self-dependencies', async () => {
    const root = await fixture({
      'packages/a': { name: 'a', dependencies: { a: '*' } },
    });
    await expect(planTopology({ cwd: root })).rejects.toThrow('a → a');
  });

  test('does not visit cycles outside the selected dependency closure', async () => {
    const root = await fixture({
      'packages/a': { name: 'a' },
      'packages/b': { name: 'b', dependencies: { b: '*' } },
    });
    expect(names(await planTopology({ cwd: root, filters: ['a'] }))).toEqual([
      'a',
    ]);
  });

  test('rejects duplicate names and missing explicit workspace dependencies', async () => {
    const duplicate = await fixture({
      'packages/a': { name: 'a' },
      'packages/b': { name: 'a' },
    });
    await expect(planTopology({ cwd: duplicate })).rejects.toThrow('包名重复');
    const missing = await fixture({
      'packages/a': { name: 'a', dependencies: { missing: 'workspace:*' } },
    });
    await expect(planTopology({ cwd: missing })).rejects.toThrow(
      '不存在的 workspace 依赖：missing',
    );
  });

  test('rejects unmatched or empty filters and invalid build scripts', async () => {
    const root = await fixture({
      'packages/a': { name: 'a', scripts: { build: 123 } },
    });
    await expect(
      planTopology({ cwd: root, filters: ['typo'] }),
    ).rejects.toThrow('未匹配');
    await expect(planTopology({ cwd: root, filters: [''] })).rejects.toThrow(
      '--filter',
    );
    await expect(planTopology({ cwd: root })).rejects.toThrow(
      'build 脚本必须是非空字符串',
    );
  });

  test('reports malformed member manifests and invalid workspace declarations', async () => {
    const root = await fixture({ 'packages/a': { name: 'a' } });
    await writeFile(join(root, 'packages/a/package.json'), '{');
    await expect(planTopology({ cwd: root })).rejects.toThrow(
      'packages/a/package.json',
    );
    const invalid = await fixture({}, 'packages/*');
    await expect(planTopology({ cwd: invalid })).rejects.toThrow(
      'workspaces 必须是路径字符串数组',
    );
    const empty = await fixture({});
    await expect(planTopology({ cwd: empty })).rejects.toThrow('没有找到');
  });
});

describe('momo topology', () => {
  test('runs builds serially in dependency order, including through packages without build scripts', async () => {
    const root = await fixture(
      {
        'packages/tool': { name: 'tool', scripts: { build: 'bun ./build.ts' } },
        'packages/bridge': { name: 'bridge', dependencies: { tool: '*' } },
        'packages/app': {
          name: 'app',
          dependencies: { bridge: '*' },
          scripts: { build: 'bun ./build.ts' },
        },
        'apps/untouched': { name: 'untouched', scripts: { build: 'exit 42' } },
      },
      ['packages/*', 'apps/*'],
    );
    await traceBuild(root, 'packages/tool', 'tool');
    await traceBuild(root, 'packages/app', 'app');
    const result = await run(root, '--filter', './packages/*');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('tool → bridge → app');
    expect(result.stdout).toContain('bridge：跳过');
    expect(await readFile(join(root, 'trace.txt'), 'utf8')).toBe(
      'tool:start\ntool:end\napp:start\napp:end\n',
    );
  });

  test('dry-run prints the plan and never executes a build', async () => {
    const root = await fixture({
      'packages/a': { name: 'a', scripts: { build: 'exit 42' } },
    });
    const result = await run(root, '--dry-run', '-f', 'a');
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('构建顺序: a');
  });

  test('returns the first failing build exit code and does not run later packages', async () => {
    const root = await fixture({
      'packages/a': { name: 'a', scripts: { build: 'bun ./build.ts' } },
      'packages/b': {
        name: 'b',
        dependencies: { a: '*' },
        scripts: { build: 'bun ./build.ts' },
      },
    });
    await traceBuild(root, 'packages/a', 'a', true);
    await traceBuild(root, 'packages/b', 'b');
    const result = await run(root);
    expect(result.exitCode).toBe(7);
    expect(result.stderr).toContain('a 构建失败');
    expect(await readFile(join(root, 'trace.txt'), 'utf8')).toBe(
      'a:start\na:end\n',
    );
  });

  test('validates the whole selected graph before starting any build', async () => {
    const root = await fixture({
      'packages/a': { name: 'a', scripts: { build: 'bun ./build.ts' } },
      'packages/b': {
        name: 'b',
        dependencies: { b: '*' },
        scripts: { build: 'exit 42' },
      },
    });
    await traceBuild(root, 'packages/a', 'a');
    const result = await run(root);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('b → b');
    expect(await Bun.file(join(root, 'trace.txt')).exists()).toBe(false);
  });

  test('rejects recursive topology calls from a package build', async () => {
    const root = await fixture({
      'packages/a': {
        name: 'a',
        scripts: { build: `bun '${BIN.replaceAll("'", "'\\''")}' topology` },
      },
    });
    const result = await run(root);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('不能递归执行');
  });

  test.each(
    [['--filter'], ['--filter='], ['--unknown'], ['build']].map((args) => ({
      args,
    })),
  )('rejects invalid arguments %j', async ({ args }) => {
    const root = await fixture({ 'packages/a': { name: 'a' } });
    expect((await run(root, ...args)).exitCode).toBe(1);
  });

  test('shows help without a workspace', async () => {
    const root = await fixture({});
    await rm(join(root, 'package.json'));
    expect((await run(root, '--help')).exitCode).toBe(0);
    const result = await run(root);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('未找到声明 workspaces');
  });
});
