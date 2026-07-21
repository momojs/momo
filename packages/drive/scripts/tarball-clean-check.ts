import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type PackageManifest = {
  name: string;
  exports?: Record<string, unknown>;
};

type PackedPackage = {
  filename: string;
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = resolve(scriptDirectory, '..');
const workspaceDirectory = resolve(packageDirectory, '../..');
const keepTemporaryDirectory =
  process.env.MOMOTS_DRIVE_KEEP_TARBALL_TMP === '1';

const run = async (
  command: string,
  args: string[],
  cwd: string,
): Promise<string> => {
  const child = Bun.spawn([command, ...args], {
    cwd,
    env: process.env,
    stderr: 'inherit',
    stdout: 'pipe',
  });
  const output = await new Response(child.stdout).text();
  const exitCode = await child.exited;

  if (exitCode !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${exitCode}`);
  }

  return output;
};

const pack = async (
  sourceDirectory: string,
  destinationDirectory: string,
  cacheDirectory: string,
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
    sourceDirectory,
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
const packageDirectory = resolve(
  projectDirectory,
  'node_modules/@momots/drive',
);
const manifest = JSON.parse(
  await readFile(resolve(packageDirectory, 'package.json'), 'utf8'),
);

const importTarget = (value) => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return undefined;
  return importTarget(value.import);
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
`;

const temporaryDirectory = await mkdtemp(
  join(tmpdir(), 'momots-drive-tarball-'),
);

try {
  const tarballDirectory = join(temporaryDirectory, 'tarballs');
  const projectDirectory = join(temporaryDirectory, 'consumer');
  const npmCacheDirectory = join(temporaryDirectory, 'npm-cache');
  await Promise.all([
    mkdir(tarballDirectory),
    mkdir(projectDirectory),
    mkdir(npmCacheDirectory),
  ]);

  const [coreTarball, hostTarball, driveTarball] = await Promise.all([
    pack(
      resolve(workspaceDirectory, 'packages/core'),
      tarballDirectory,
      npmCacheDirectory,
    ),
    pack(
      resolve(workspaceDirectory, 'packages/host'),
      tarballDirectory,
      npmCacheDirectory,
    ),
    pack(packageDirectory, tarballDirectory, npmCacheDirectory),
  ]);

  const dependencies = {
    '@momots/core': `file:${coreTarball}`,
    '@momots/drive': `file:${driveTarball}`,
    '@momots/host': `file:${hostTarball}`,
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
    projectDirectory,
  );

  const imported = await run(
    'bun',
    ['--no-install', 'check.mjs'],
    projectDirectory,
  );
  process.stdout.write(imported);
  console.log(`Verified npm tarball: ${driveTarball}`);
} finally {
  if (keepTemporaryDirectory) {
    console.log(`Kept temporary project: ${temporaryDirectory}`);
  } else {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}
