import { $ } from 'bun';

import { chmod, readdir, rm } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

import type { MomoBuildConfig } from './config';

export interface BuildOptions extends MomoBuildConfig {
  /** 包根目录，默认 process.cwd()。 */
  root?: string;
}

async function collectEntrypoints(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const entrypoints = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectEntrypoints(path);
      }

      if (
        entry.isFile() &&
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
        !entry.name.endsWith('.d.ts') &&
        !entry.name.endsWith('.spec.ts') &&
        !entry.name.endsWith('.spec.tsx')
      ) {
        return [path];
      }

      return [];
    }),
  );

  return entrypoints.flat().sort();
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

  const entrypoints = await collectEntrypoints(srcRoot);
  const result = await Bun.build({
    entrypoints,
    format: options.format ?? 'esm',
    naming: '[dir]/[name].[ext]',
    outdir: distRoot,
    packages: options.packages ?? 'external',
    root: srcRoot,
    target: options.target ?? 'browser',
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }

    throw new Error('Bun build failed');
  }

  for (const file of options.executables ?? []) {
    await chmod(resolve(distRoot, file), 0o755);
  }
}
