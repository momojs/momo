import { $ } from 'bun';

import { chmod, copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';

import type { MomoBuildConfig } from './config';
import { collectEntrypoints } from './runner/collect-entrypoints';

type PackageManifest = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function resolvePackageHandling(
  manifest: PackageManifest,
  options: MomoBuildConfig,
): { packages: 'bundle' | 'external'; external?: string[] } {
  const bundle = options.bundle ?? [];
  if (bundle.length === 0) {
    return {
      packages: options.packages ?? 'external',
      ...(options.external ? { external: options.external } : {}),
    };
  }

  const bundled = new Set(bundle);
  const declared = [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ].filter((name) => !bundled.has(name));

  return {
    packages: 'bundle',
    external: unique([...(options.external ?? []), ...declared]),
  };
}

export interface BuildOptions extends MomoBuildConfig {
  /** 包根目录，默认 process.cwd()。 */
  root?: string;
}

function resolve(root: string, path: string): string {
  return isAbsolute(path) ? path : join(root, path);
}

/**
 * momots 各包通用的构建流程：清理 dist → 运行校验脚本 → 用 Bun.build
 * 把 `src` 下的每个入口编译到 `dist`（保持目录结构）。
 */
export async function build(options: BuildOptions = {}): Promise<void> {
  const root = options.root ?? process.cwd();
  const srcRoot = resolve(root, options.src ?? 'src');
  const distRoot = resolve(root, options.outdir ?? 'dist');

  await rm(distRoot, { recursive: true, force: true });

  for (const script of options.scripts ?? ['typecheck', 'types']) {
    await $`bun run ${script}`.cwd(root);
  }

  const manifest: PackageManifest = options.bundle?.length
    ? (JSON.parse(
        await readFile(join(root, 'package.json'), 'utf8'),
      ) as PackageManifest)
    : {};
  const { packages, external } = resolvePackageHandling(manifest, options);
  const entrypoints = await collectEntrypoints(srcRoot);
  const result = await Bun.build({
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    banner: options.banner,
    entrypoints,
    external,
    format: options.format ?? 'esm',
    naming: '[dir]/[name].[ext]',
    outdir: distRoot,
    packages,
    root: srcRoot,
    splitting: options.splitting ?? false,
    target: options.target ?? 'browser',
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }

    throw new Error('Bun build failed');
  }

  for (const [source, destination] of Object.entries(options.assets ?? {})) {
    const output = resolve(distRoot, destination);
    await mkdir(dirname(output), { recursive: true });
    await copyFile(resolve(root, source), output);
  }

  for (const file of options.executables ?? []) {
    await chmod(resolve(distRoot, file), 0o755);
  }
}
