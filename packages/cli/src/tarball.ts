import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

import type { MomoTarballCheckContext, MomoTarballConfig } from './config';

type PackageManifest = Record<string, unknown> & {
  name?: string;
  exports?: Record<string, unknown>;
};

export interface TarballOptions extends MomoTarballConfig {
  /** 包根目录，默认 process.cwd()。 */
  root?: string;
  /** 永久保留 tarball 的目录；默认在临时目录中生成并在校验后删除。 */
  destination?: string;
  /** 保留干净消费项目，方便排查失败。 */
  keep?: boolean;
}

export interface TarballResult {
  name: string;
  tarball: string;
  /** 仅在 `keep` 为 true 时返回。 */
  temporaryDirectory?: string;
  /** tarball 是否会在命令完成后继续存在。 */
  preserved: boolean;
}

async function run(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: Record<string, string | undefined>;
  } = {},
): Promise<string> {
  const child = Bun.spawn([command, ...args], {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stderr: 'pipe',
    stdout: 'pipe',
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited with ${exitCode}\n${stderr}${stdout}`,
    );
  }

  return stdout;
}

function packagePath(nodeModules: string, name: string): string {
  const segments = name.split('/');
  if (
    segments.length > 2 ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error(`Invalid package name: ${name}`);
  }
  return join(nodeModules, ...segments);
}

function importTarget(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return undefined;

  const conditions = value as Record<string, unknown>;
  for (const condition of ['import', 'bun', 'node', 'browser', 'default']) {
    const target = importTarget(conditions[condition]);
    if (target) return target;
  }
  return undefined;
}

function exportTargets(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value as Record<string, unknown>).flatMap(exportTargets);
}

async function assertManifestAndExports(
  packageDirectory: string,
  sourceManifest: PackageManifest,
): Promise<PackageManifest> {
  const path = join(packageDirectory, 'package.json');
  const source = await readFile(path, 'utf8');
  const manifest = JSON.parse(source) as PackageManifest;

  if (!manifest.name || manifest.name !== sourceManifest.name) {
    throw new Error(
      `Unexpected packed package name: ${String(manifest.name ?? '(missing)')}`,
    );
  }
  if (source.includes('workspace:')) {
    throw new Error('Packed package still contains a workspace: dependency');
  }

  for (const [subpath, value] of Object.entries(manifest.exports ?? {})) {
    if (subpath.includes('*')) continue;
    for (const target of exportTargets(value)) {
      if (target.includes('*')) continue;
      await access(resolve(packageDirectory, target));
    }
  }

  return manifest;
}

async function linkDependencies(
  sourceNodeModules: string,
  destinationNodeModules: string,
  excluded: Set<string>,
): Promise<void> {
  try {
    await access(sourceNodeModules);
  } catch {
    return;
  }

  await mkdir(destinationNodeModules, { recursive: true });
  for (const entry of await readdir(sourceNodeModules, {
    withFileTypes: true,
  })) {
    if (entry.name.startsWith('.')) continue;

    const source = join(sourceNodeModules, entry.name);
    const destination = join(destinationNodeModules, entry.name);
    if (!entry.name.startsWith('@')) {
      if (excluded.has(entry.name)) continue;
      await symlink(await realpath(source), destination, 'dir');
      continue;
    }

    await mkdir(destination, { recursive: true });
    for (const scopedEntry of await readdir(source, { withFileTypes: true })) {
      const name = `${entry.name}/${scopedEntry.name}`;
      if (excluded.has(name)) continue;
      await symlink(
        await realpath(join(source, scopedEntry.name)),
        join(destination, scopedEntry.name),
        'dir',
      );
    }
  }
}

async function collectProductFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectProductFiles(path)));
    } else if (
      entry.isFile() &&
      /(?:\.d\.(?:c|m)?ts|\.(?:c|m)?js)$/u.test(entry.name)
    ) {
      files.push(path);
    }
  }
  return files;
}

async function assertForbiddenImports(
  packageDirectory: string,
  specifiers: string[],
): Promise<void> {
  if (specifiers.length === 0) return;

  const files = await collectProductFiles(join(packageDirectory, 'dist'));
  for (const path of files) {
    const source = await readFile(path, 'utf8');
    for (const specifier of specifiers) {
      const quoted = [
        `'${specifier}'`,
        `"${specifier}"`,
        `'${specifier}/`,
        `"${specifier}/`,
      ];
      if (quoted.some((token) => source.includes(token))) {
        throw new Error(`${path} still imports forbidden package ${specifier}`);
      }
    }
  }
}

function resolveImports(
  manifest: PackageManifest,
  configured?: string[],
): string[] {
  if (configured) return configured;
  return Object.entries(manifest.exports ?? {})
    .filter(
      ([subpath, value]) =>
        !subpath.includes('*') && importTarget(value) !== undefined,
    )
    .map(([subpath]) => subpath);
}

async function assertRuntimeImports(
  context: Pick<
    MomoTarballCheckContext,
    'consumerDirectory' | 'manifest' | 'run'
  >,
  imports: string[],
  identities: NonNullable<MomoTarballConfig['identities']>,
): Promise<void> {
  if (imports.length === 0) return;

  const name = context.manifest['name'];
  if (typeof name !== 'string') throw new Error('Packed package has no name');
  const runner = String.raw`
const name = ${JSON.stringify(name)};
const paths = ${JSON.stringify(imports)};
const identities = ${JSON.stringify(identities)};
const namespaces = new Map();

for (const path of paths) {
  const specifier = path === '.' ? name : name + path.slice(1);
  namespaces.set(path, await import(specifier));
  console.log('imported ' + specifier);
}

for (const identity of identities) {
  const [first, ...rest] = identity.from;
  const expected = namespaces.get(first)?.[identity.export];
  if (expected === undefined) {
    throw new Error(identity.export + ' is not exported from ' + first);
  }
  for (const path of rest) {
    if (namespaces.get(path)?.[identity.export] !== expected) {
      throw new Error(
        identity.export + ' identity differs between ' + first + ' and ' + path,
      );
    }
  }
}
`;
  const runnerPath = join(context.consumerDirectory, 'tarball-check.mjs');
  await writeFile(runnerPath, runner);
  const output = await context.run('bun', ['--no-install', runnerPath], {
    cwd: context.consumerDirectory,
    env: { ...process.env, NODE_ENV: 'production' },
  });
  process.stdout.write(output);
}

/** 打包当前 package，并在隔离的消费项目中验证发布产物。 */
export async function tarball(
  options: TarballOptions = {},
): Promise<TarballResult> {
  const root = resolve(options.root ?? process.cwd());
  const sourceManifest = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8'),
  ) as PackageManifest;
  if (!sourceManifest.name) {
    throw new Error(`${root}/package.json is missing name`);
  }

  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'momots-tarball-'));
  const consumerDirectory = join(temporaryDirectory, 'consumer');
  const destination = options.destination
    ? resolve(root, options.destination)
    : join(temporaryDirectory, 'tarballs');
  const nodeModules = join(consumerDirectory, 'node_modules');
  const packageDirectory = packagePath(nodeModules, sourceManifest.name);
  let tarballPath = '';
  let succeeded = false;

  try {
    await Promise.all([
      mkdir(destination, { recursive: true }),
      mkdir(packageDirectory, { recursive: true }),
    ]);
    const output = await run(
      'bun',
      [
        'pm',
        'pack',
        '--ignore-scripts',
        '--destination',
        destination,
        '--quiet',
      ],
      { cwd: root },
    );
    const filename = output.trim().split('\n').at(-1);
    if (!filename) {
      throw new Error(`Unexpected bun pm pack output: ${output}`);
    }
    tarballPath = isAbsolute(filename) ? filename : resolve(root, filename);
    await access(tarballPath);
    await run(
      'tar',
      ['-xzf', tarballPath, '-C', packageDirectory, '--strip-components=1'],
      { cwd: temporaryDirectory },
    );

    const manifest = await assertManifestAndExports(
      packageDirectory,
      sourceManifest,
    );
    const excluded = new Set([
      sourceManifest.name,
      ...(options.forbidImports ?? []),
    ]);
    await linkDependencies(join(root, 'node_modules'), nodeModules, excluded);
    await assertForbiddenImports(packageDirectory, options.forbidImports ?? []);

    const context: MomoTarballCheckContext = {
      root,
      temporaryDirectory,
      consumerDirectory,
      packageDirectory,
      tarball: tarballPath,
      manifest,
      run: (command, args, commandOptions = {}) =>
        run(command, args, {
          cwd: commandOptions.cwd ?? consumerDirectory,
          env: commandOptions.env,
        }),
    };
    await assertRuntimeImports(
      context,
      resolveImports(manifest, options.imports),
      options.identities ?? [],
    );
    await options.check?.(context);
    succeeded = true;

    return {
      name: sourceManifest.name,
      tarball: tarballPath,
      ...(options.keep ? { temporaryDirectory } : {}),
      preserved: options.keep === true || options.destination !== undefined,
    };
  } finally {
    if (options.keep) {
      console.log(`Kept temporary project: ${temporaryDirectory}`);
    } else {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
    if (!succeeded && options.destination && tarballPath) {
      console.error(`Tarball validation failed: ${tarballPath}`);
    }
  }
}
