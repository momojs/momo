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
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '@tailwindcss/node';

type PackageManifest = {
  name: string;
  exports?: Record<string, unknown>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = resolve(scriptDirectory, '..');
const workspaceDirectory = resolve(packageDirectory, '../..');
const keepTemporaryDirectory =
  process.env.MOMOTS_DESIGN_KEEP_TARBALL_TMP === '1';

const run = async (
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string | undefined> = process.env,
): Promise<string> => {
  const child = Bun.spawn([command, ...args], {
    cwd,
    env,
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
};

const pack = async (destinationDirectory: string): Promise<string> => {
  const output = await run(
    'bun',
    [
      'pm',
      'pack',
      '--ignore-scripts',
      '--destination',
      destinationDirectory,
      '--quiet',
    ],
    packageDirectory,
  );
  const filename = output.trim().split('\n').at(-1);

  if (!filename) {
    throw new Error(`Unexpected bun pm pack output: ${output}`);
  }

  await access(filename);
  return filename;
};

const linkPackageDependencies = async (
  sourceDirectory: string,
  destinationDirectory: string,
): Promise<void> => {
  await mkdir(destinationDirectory, { recursive: true });

  for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
    if (entry.name === '.bin') continue;

    const source = join(sourceDirectory, entry.name);
    const destination = join(destinationDirectory, entry.name);

    if (!entry.name.startsWith('@')) {
      await symlink(await realpath(source), destination, 'dir');
      continue;
    }

    await mkdir(destination, { recursive: true });
    for (const scopedEntry of await readdir(source, { withFileTypes: true })) {
      if (entry.name === '@momots' && scopedEntry.name === 'design') continue;

      const scopedSource = join(source, scopedEntry.name);
      const scopedDestination = join(destination, scopedEntry.name);
      await symlink(await realpath(scopedSource), scopedDestination, 'dir');
    }
  }
};

const importTarget = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return undefined;

  const conditions = value as Record<string, unknown>;
  return importTarget(conditions.import ?? conditions.default);
};

const assertPackedFiles = async (
  installedPackageDirectory: string,
): Promise<PackageManifest> => {
  const manifest = JSON.parse(
    await readFile(join(installedPackageDirectory, 'package.json'), 'utf8'),
  ) as PackageManifest;

  if (JSON.stringify(manifest).includes('workspace:')) {
    throw new Error('Packed package still contains a workspace: dependency');
  }
  if (manifest.dependencies?.['@ncdai/react-wheel-picker'] !== '^1.2.2') {
    throw new Error('Wheel picker must be a regular runtime dependency');
  }
  if (manifest.peerDependencies?.['@ncdai/react-wheel-picker']) {
    throw new Error('Wheel picker must not also be a peer dependency');
  }

  await Promise.all([
    access(join(installedPackageDirectory, 'README.md')),
    access(join(installedPackageDirectory, 'src/styles/picker.css')),
    access(join(installedPackageDirectory, 'src/styles/tailwind.css')),
  ]);

  for (const [subpath, value] of Object.entries(manifest.exports ?? {})) {
    if (subpath.includes('*')) continue;

    const target = importTarget(value);
    if (!target) {
      throw new Error(`Export ${subpath} has no importable target`);
    }
    await access(resolve(installedPackageDirectory, target));
  }

  const distDirectory = join(installedPackageDirectory, 'dist');
  for await (const path of new Bun.Glob('**/*.js').scan({
    cwd: distDirectory,
  })) {
    const source = await readFile(join(distDirectory, path), 'utf8');
    if (!source.startsWith("'use client';")) {
      throw new Error(`${path} is missing the React client banner`);
    }
    if (source.includes('react/jsx-dev-runtime')) {
      throw new Error(`${path} uses the development JSX runtime`);
    }
  }

  const relativeSpecifier = /(?:from|export\s+\*)\s*['"](\.{1,2}\/[^'"]+)['"]/g;
  for await (const path of new Bun.Glob('**/*.d.ts').scan({
    cwd: distDirectory,
  })) {
    const source = await readFile(join(distDirectory, path), 'utf8');
    if (source.includes('@ncdai/react-wheel-picker/style.css')) {
      throw new Error(`${path} leaks the picker stylesheet into declarations`);
    }

    for (const match of source.matchAll(relativeSpecifier)) {
      if (!match[1]?.endsWith('.js')) {
        throw new Error(`${path} has an extensionless specifier: ${match[1]}`);
      }
    }
  }

  const compiled = await compile(
    [
      '@import "tailwindcss";',
      `@import "${join(installedPackageDirectory, 'src/styles/tailwind.css')}";`,
      `@import "${join(installedPackageDirectory, 'src/styles/picker.css')}";`,
      `@import "${join(installedPackageDirectory, 'src/themes/neutral.css')}";`,
    ].join('\n'),
    {
      base: dirname(installedPackageDirectory),
      onDependency() {
        // Dependencies are intentionally resolved from the temporary consumer.
      },
    },
  );
  const registeredDist = await realpath(
    resolve(installedPackageDirectory, 'dist'),
  );
  let hasRegisteredDist = false;
  for (const { base, pattern } of compiled.sources) {
    if ((await realpath(resolve(base, pattern))) === registeredDist) {
      hasRegisteredDist = true;
      break;
    }
  }
  if (!hasRegisteredDist) {
    throw new Error(
      'Tailwind entry did not register the packed dist directory',
    );
  }
  const css = compiled.build(['bg-momo-bg-brand', 'inline-flex']);
  if (
    !css.includes('.bg-momo-bg-brand') ||
    !css.includes('.inline-flex') ||
    !css.includes('[data-rwp-wrapper]')
  ) {
    throw new Error('Tailwind entry did not generate component utilities');
  }

  return manifest;
};

const runnerSource = String.raw`
const [root, button, effects, hooks, shared, tailwind] = await Promise.all([
  import('@momots/design'),
  import('@momots/design/components/button'),
  import('@momots/design/effects'),
  import('@momots/design/hooks'),
  import('@momots/design/shared'),
  import('@momots/design/tailwind'),
]);

const identities = [
  ['Button', root.Button, button.Button],
  ['Highlight', root.Highlight, effects.Highlight],
  ['useControllableValue', root.useControllableValue, hooks.useControllableValue],
  ['render', root.render, shared.render],
  ['cx', root.cx, tailwind.cx],
];

for (const [name, rootValue, focusedValue] of identities) {
  if (rootValue !== focusedValue) {
    throw new Error(name + ' identity differs between root and focused entry');
  }
}

const element = button.Button({ children: 'alpha' });
if (!element?.type) throw new Error('Button did not return a React element');

console.log('production imports and render passed');
`;

const consumerSource = String.raw`
import { Button, type ButtonProps } from '@momots/design';
import { Drawer } from '@momots/design/components/drawer';
import { Highlight } from '@momots/design/effects';
import { cx } from '@momots/design/tailwind';

const props: ButtonProps = { children: 'alpha' };

export const className = cx('block');
export const view = <Button {...props} />;
export { Drawer, Highlight };
`;

const tsconfig = (module: 'ESNext' | 'NodeNext') => ({
  compilerOptions: {
    jsx: 'react-jsx',
    module,
    moduleResolution: module === 'NodeNext' ? 'NodeNext' : 'Bundler',
    noEmit: true,
    skipLibCheck: false,
    strict: true,
    target: 'ES2022',
  },
  include: ['index.tsx'],
});

const temporaryDirectory = await mkdtemp(
  join(tmpdir(), 'momots-design-tarball-'),
);

try {
  const tarballDirectory = join(temporaryDirectory, 'tarballs');
  const projectDirectory = join(temporaryDirectory, 'consumer');
  const installedPackageDirectory = join(
    projectDirectory,
    'node_modules/@momots/design',
  );
  await Promise.all([
    mkdir(tarballDirectory),
    mkdir(installedPackageDirectory, { recursive: true }),
  ]);

  const tarball = await pack(tarballDirectory);
  await run(
    'tar',
    ['-xzf', tarball, '-C', installedPackageDirectory, '--strip-components=1'],
    temporaryDirectory,
  );
  await linkPackageDependencies(
    join(packageDirectory, 'node_modules'),
    join(projectDirectory, 'node_modules'),
  );
  const manifest = await assertPackedFiles(installedPackageDirectory);
  if (manifest.name !== '@momots/design') {
    throw new Error(`Unexpected packed package name: ${manifest.name}`);
  }
  await Promise.all([
    writeFile(
      join(projectDirectory, 'package.json'),
      `${JSON.stringify(
        { name: 'design-tarball-consumer', private: true, type: 'module' },
        undefined,
        2,
      )}\n`,
    ),
    writeFile(join(projectDirectory, 'check.mjs'), runnerSource),
    writeFile(join(projectDirectory, 'index.tsx'), consumerSource),
    writeFile(
      join(projectDirectory, 'tsconfig.bundler.json'),
      `${JSON.stringify(tsconfig('ESNext'), undefined, 2)}\n`,
    ),
    writeFile(
      join(projectDirectory, 'tsconfig.nodenext.json'),
      `${JSON.stringify(tsconfig('NodeNext'), undefined, 2)}\n`,
    ),
  ]);

  const productionEnvironment = { ...process.env };
  productionEnvironment['NODE_ENV'] = 'production';
  const runtimeOutput = await run(
    'bun',
    ['--no-install', 'check.mjs'],
    projectDirectory,
    productionEnvironment,
  );
  process.stdout.write(runtimeOutput);

  const tsc = join(workspaceDirectory, 'node_modules/.bin/tsc');
  await run(tsc, ['--project', 'tsconfig.bundler.json'], projectDirectory);
  console.log('TypeScript Bundler consumer passed');
  await run(tsc, ['--project', 'tsconfig.nodenext.json'], projectDirectory);
  console.log('TypeScript NodeNext consumer passed');
  console.log(`Verified package tarball: ${tarball}`);
} finally {
  if (keepTemporaryDirectory) {
    console.log(`Kept temporary project: ${temporaryDirectory}`);
  } else {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}
