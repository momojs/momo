import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { MomoTarballCheckContext } from '@momots/cli';

type PackageManifest = {
  name: string;
  version?: string;
  exports?: Record<string, unknown>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  publishConfig?: { tag?: string };
};

type PackedPackage = {
  filename: string;
};

const pack = async (
  sourceDirectory: string,
  destinationDirectory: string,
  cacheDirectory: string,
  run: MomoTarballCheckContext['run'],
): Promise<string> => {
  const output = await run(
    'npm',
    [
      'pack',
      '--json',
      '--ignore-scripts',
      '--pack-destination',
      destinationDirectory,
      '--cache',
      cacheDirectory,
    ],
    { cwd: sourceDirectory },
  );
  const result = JSON.parse(output) as PackedPackage[];
  const filename = result.at(0)?.filename;

  if (!filename || result.length !== 1) {
    throw new Error(`Unexpected npm pack output: ${output}`);
  }

  return join(destinationDirectory, filename);
};

const localPackage = async (path: string): Promise<string> => {
  const sourceDirectory = await realpath(path);
  const manifest = JSON.parse(
    await readFile(join(sourceDirectory, 'package.json'), 'utf8'),
  ) as PackageManifest;

  if (!manifest.name) {
    throw new Error(`Local dependency has no package name: ${sourceDirectory}`);
  }

  return `file:${sourceDirectory}`;
};

const runnerSource = String.raw`
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = resolve(projectDirectory, 'node_modules/@momots/drive');
const manifest = JSON.parse(
  await readFile(resolve(packageDirectory, 'package.json'), 'utf8'),
);

if (manifest.version !== '0.1.0-beta.0') {
  throw new Error('Unexpected packed version: ' + manifest.version);
}
if (manifest.publishConfig?.tag !== 'beta') {
  throw new Error('Packed package does not use the beta dist-tag');
}
if (manifest.dependencies?.['@momots/host']) {
  throw new Error('@momots/host must be bundled, not a runtime dependency');
}

const importTarget = (value) => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return undefined;
  return importTarget(value.import ?? value.default);
};

const entries = Object.entries(manifest.exports ?? {}).filter(
  ([subpath, value]) => !subpath.includes('*') && importTarget(value),
);

if (entries.length === 0) {
  throw new Error('The installed package exposes no static import paths');
}

const namespaces = new Map();

for (const [subpath, value] of entries) {
  const target = importTarget(value);
  await access(resolve(packageDirectory, target));

  const specifier =
    subpath === '.' ? manifest.name : manifest.name + subpath.slice(1);
  namespaces.set(subpath, await import(specifier));
  console.log('imported ' + specifier);
}

const root = namespaces.get('.');
const identities = [
  ['Drive', './core'],
  ['DriveContext', './context'],
  ['parser', './parser'],
  ['isRawTextBody', './parser'],
  ['repeat', './stages'],
  ['repeat', './stages/repeat'],
];

for (const [name, subpath] of identities) {
  if (root?.[name] !== namespaces.get(subpath)?.[name]) {
    throw new Error(name + ' identity differs between root and ' + subpath);
  }
}

if (root?.toSearchParams({ page: 1 }).get('page') !== '1') {
  throw new Error('toSearchParams is not available from the root export');
}
`;

const consumerSource = String.raw`
import {
  Drive,
  type DriveFetchedContext,
  toSearchParams,
} from '@momots/drive';

const drive = new Drive();
const params: URLSearchParams = toSearchParams({ page: 1 });

export const request: Promise<DriveFetchedContext<unknown>> = drive.request({
  api: 'https://example.com',
  query: params,
});
`;

export async function checkDriveTarball({
  root: packageDirectory,
  run,
  tarball: driveTarball,
  temporaryDirectory,
}: MomoTarballCheckContext): Promise<void> {
  const workspaceDirectory = resolve(packageDirectory, '../..');
  const tarballDirectory = join(temporaryDirectory, 'dependency-tarballs');
  const projectDirectory = join(temporaryDirectory, 'npm-consumer');
  const npmCacheDirectory = join(temporaryDirectory, 'npm-cache');
  await Promise.all([
    mkdir(tarballDirectory),
    mkdir(projectDirectory),
    mkdir(npmCacheDirectory),
  ]);

  const coreTarball = await pack(
    resolve(workspaceDirectory, 'packages/core'),
    tarballDirectory,
    npmCacheDirectory,
    run,
  );

  const dependencies = {
    '@momots/core': `file:${coreTarball}`,
    '@momots/drive': `file:${driveTarball}`,
    mime: await localPackage(resolve(packageDirectory, 'node_modules/mime')),
    nanoid: await localPackage(
      resolve(packageDirectory, 'node_modules/nanoid'),
    ),
    remeda: await localPackage(
      resolve(packageDirectory, 'node_modules/remeda'),
    ),
    'type-fest': await localPackage(
      resolve(workspaceDirectory, 'packages/core/node_modules/type-fest'),
    ),
    'wildcard-match': await localPackage(
      resolve(packageDirectory, 'node_modules/wildcard-match'),
    ),
  };

  await Promise.all([
    writeFile(
      join(projectDirectory, 'package.json'),
      `${JSON.stringify(
        {
          name: 'drive-tarball-consumer',
          private: true,
          type: 'module',
          dependencies,
        },
        undefined,
        2,
      )}\n`,
    ),
    writeFile(join(projectDirectory, 'check.mjs'), runnerSource),
    writeFile(join(projectDirectory, 'check.ts'), consumerSource),
  ]);

  await run(
    'npm',
    [
      'install',
      '--offline',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      '--cache',
      npmCacheDirectory,
    ],
    { cwd: projectDirectory },
  );

  const [bunImported, nodeImported] = await Promise.all([
    run('bun', ['--no-install', 'check.mjs'], { cwd: projectDirectory }),
    run('node', ['check.mjs'], { cwd: projectDirectory }),
  ]);
  await run(
    'bun',
    [
      resolve(workspaceDirectory, 'node_modules/typescript/bin/tsc'),
      '--noEmit',
      '--module',
      'preserve',
      '--moduleResolution',
      'bundler',
      '--target',
      'esnext',
      '--strict',
      'check.ts',
    ],
    { cwd: projectDirectory },
  );

  process.stdout.write(bunImported);
  process.stdout.write(nodeImported);
  console.log('Verified npm-installed Drive consumer');
}
