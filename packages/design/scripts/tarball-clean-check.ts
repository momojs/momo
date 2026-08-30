import { access, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import type { MomoTarballCheckContext } from '@momots/cli';
import { compile } from '@tailwindcss/node';

type PackageManifest = {
  name: string;
  exports?: Record<string, unknown>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
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
    access(join(installedPackageDirectory, 'dist/tailwind.css')),
  ]);
  if (
    await Bun.file(
      join(installedPackageDirectory, 'src/styles/tailwind.css'),
    ).exists()
  ) {
    throw new Error(
      'Packed package contains the obsolete source Tailwind entry',
    );
  }

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
      `@import "${join(installedPackageDirectory, 'dist/tailwind.css')}";`,
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
const [root, alert, button, toast, effects, hooks, shared, tailwind] = await Promise.all([
  import('@momots/design'),
  import('@momots/design/components/alert'),
  import('@momots/design/components/button'),
  import('@momots/design/components/toast'),
  import('@momots/design/effects'),
  import('@momots/design/hooks'),
  import('@momots/design/shared'),
  import('@momots/design/tailwind'),
]);
const { createElement } = await import('react');

const identities = [
  ['Alert', root.Alert, alert.Alert],
  ['Button', root.Button, button.Button],
  ['ToastRoot', root.ToastRoot, toast.ToastRoot],
  ['ToastProvider', root.ToastProvider, toast.ToastProvider],
  ['createToastManager', root.createToastManager, toast.createToastManager],
  ['useToast', root.useToast, toast.useToast],
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
const alertElement = alert.Alert({ title: 'alpha' });
if (!alertElement?.type) throw new Error('Alert did not return a React element');
const toastProvider = createElement(toast.ToastProvider, { timeout: 0 });
if (!toastProvider?.type) throw new Error('ToastProvider did not return a React element');
const toastManager = toast.createToastManager();
const toastId = toastManager.add({ title: 'alpha' });
if (typeof toastId !== 'string') throw new Error('Toast manager did not return an id');
toastManager.close(toastId);

console.log('production imports and render passed');
`;

const consumerSource = String.raw`
import {
  Alert,
  type AlertProps,
  Button,
  type ButtonProps,
  ToastProvider,
  type ToastProviderProps,
  createToastManager,
} from '@momots/design';
import { AlertRoot } from '@momots/design/components/alert';
import {
  type ToastManager,
  type ToastObject,
  ToastRoot,
  useToast,
} from '@momots/design/components/toast';
import { Drawer } from '@momots/design/components/drawer';
import { Highlight } from '@momots/design/effects';
import { cx } from '@momots/design/tailwind';

const props: ButtonProps = { children: 'alpha' };
const alertProps: AlertProps = { title: 'notice', variant: 'info' };
const toastProviderProps: ToastProviderProps = { timeout: 0, limit: 4 };
type ToastData = { source: string };
const toastManager: ToastManager<ToastData> = createToastManager<ToastData>();
const toastObject: ToastObject<ToastData> = {
  id: 'alpha',
  data: { source: 'consumer' },
};

function ToastConsumer() {
  const toast = useToast<ToastData>();
  return (
    <button
      type="button"
      onClick={() => {
        toast.add({
          title: 'alpha',
          data: { source: 'component' },
        });
      }}
    >
      toast
    </button>
  );
}

export const className = cx('block');
export const notice = <Alert {...alertProps} />;
export const notifications = <ToastProvider {...toastProviderProps} />;
export const externalToast = toastManager.add({
  title: 'external',
  data: { source: toastObject.data?.source ?? 'fallback' },
});
export const view = <Button {...props} />;
export { AlertRoot, Drawer, Highlight, ToastConsumer, ToastRoot };
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

export async function checkDesignTarball({
  consumerDirectory: projectDirectory,
  packageDirectory: installedPackageDirectory,
  root: packageDirectory,
  run,
}: MomoTarballCheckContext): Promise<void> {
  const workspaceDirectory = resolve(packageDirectory, '../..');
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
  const runtimeOutput = await run('bun', ['--no-install', 'check.mjs'], {
    cwd: projectDirectory,
    env: productionEnvironment,
  });
  process.stdout.write(runtimeOutput);

  const tsc = join(workspaceDirectory, 'node_modules/.bin/tsc');
  await run(tsc, ['--project', 'tsconfig.bundler.json'], {
    cwd: projectDirectory,
  });
  console.log('TypeScript Bundler consumer passed');
  await run(tsc, ['--project', 'tsconfig.nodenext.json'], {
    cwd: projectDirectory,
  });
  console.log('TypeScript NodeNext consumer passed');
}
