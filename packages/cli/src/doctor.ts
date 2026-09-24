import { readFile, realpath, stat } from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

import type { MomoBuildConfig } from './config';
import { collectEntrypoints } from './runner/collect-entrypoints';
import { findConfig } from './runner/find-config';
import { loadConfig } from './runner/load-config';
import type {
  AddDiagnostic,
  DoctorDiagnostic,
} from './runner/validate-build-config';
import { isRecord, validateBuildConfig } from './runner/validate-build-config';

export interface DoctorOptions {
  /** 查找配置的起始目录，默认 process.cwd()。 */
  cwd?: string;
  /** 显式指定配置文件，相对 cwd 或使用绝对路径。 */
  config?: string;
}

export interface DoctorReport {
  root: string;
  config: string | null;
  ok: boolean;
  summary: { errors: number; warnings: number };
  diagnostics: DoctorDiagnostic[];
}

export function createDoctorReport(
  root: string,
  config: string | null,
  diagnostics: DoctorDiagnostic[],
): DoctorReport {
  const errors = diagnostics.filter(
    ({ severity }) => severity === 'error',
  ).length;
  const warnings = diagnostics.length - errors;
  return {
    root,
    config,
    ok: errors === 0,
    summary: { errors, warnings },
    diagnostics,
  };
}

function isMissing(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT';
}

async function fileStatus(path: string) {
  try {
    return await stat(path);
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
}

function contains(directory: string, path: string): boolean {
  const subpath = relative(directory, path);
  return (
    subpath === '' ||
    (subpath !== '..' &&
      !subpath.startsWith(`..${sep}`) &&
      !isAbsolute(subpath))
  );
}

// 尚不存在的输出路径也要解析已有父目录中的符号链接。
async function physicalPath(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch (error) {
    if (!isMissing(error) || dirname(path) === path) throw error;
    return join(await physicalPath(dirname(path)), basename(path));
  }
}

async function readManifest(
  root: string,
  build: MomoBuildConfig,
  add: AddDiagnostic,
): Promise<Record<string, unknown> | undefined> {
  const path = join(root, 'package.json');
  try {
    const manifest: unknown = JSON.parse(await readFile(path, 'utf8'));
    if (!isRecord(manifest)) throw new Error('package.json 必须是对象。');
    return manifest;
  } catch (error) {
    if (isMissing(error)) {
      if (
        (build.scripts ?? ['typecheck', 'types']).length ||
        build.bundle?.length
      ) {
        add(
          'error',
          'manifest.missing',
          '构建脚本或 bundle 配置需要 package.json。',
          path,
        );
      }
    } else {
      add(
        'error',
        'manifest.invalid',
        `无法读取 package.json：${String(error)}`,
        path,
      );
    }
    return;
  }
}

function stringMap(
  manifest: Record<string, unknown>,
  key: string,
  add: AddDiagnostic,
): Record<string, string> {
  const value = manifest[key];
  if (value === undefined) return {};
  if (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  ) {
    return value as Record<string, string>;
  }
  add(
    'error',
    'manifest.invalid-field',
    `${key} 必须是字符串映射。`,
    `package.json#${key}`,
  );
  return {};
}

function checkDependencies(
  manifest: Record<string, unknown>,
  build: MomoBuildConfig,
  add: AddDiagnostic,
): void {
  const scripts = stringMap(manifest, 'scripts', add);
  for (const script of build.scripts ?? ['typecheck', 'types']) {
    if (!Object.hasOwn(scripts, script) || !scripts[script]?.trim()) {
      add(
        'error',
        'script.missing',
        `缺少构建脚本 ${script}；请添加脚本或调整 build.scripts。`,
        `package.json#scripts.${script}`,
      );
    }
  }

  const declared = new Set(
    [
      'dependencies',
      'peerDependencies',
      'optionalDependencies',
      'devDependencies',
    ].flatMap((key) => Object.keys(stringMap(manifest, key, add))),
  );
  for (const name of new Set(build.bundle ?? [])) {
    if (!declared.has(name)) {
      add(
        'warning',
        'bundle.undeclared',
        `bundle 中的 ${name} 未在当前包声明；请确认包名及依赖声明。`,
        'build.bundle',
      );
    }
  }
}

function checkBundleConflicts(
  build: MomoBuildConfig,
  add: AddDiagnostic,
): void {
  for (const name of new Set(build.bundle ?? [])) {
    const conflict = build.external?.find((external) => {
      const expression = external
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*');
      return (
        new RegExp(`^(?:${expression})(?:/.*)?$`).test(name) ||
        external.startsWith(`${name}/`)
      );
    });
    if (conflict) {
      add(
        'error',
        'bundle.external-conflict',
        `${name} 同时被 bundle 和 external (${conflict}) 覆盖；请明确只内联还是外部化。`,
        'build.bundle',
      );
    }
  }
}

async function hasExportTarget(root: string, target: string): Promise<boolean> {
  if (!target.includes('*'))
    return (await fileStatus(resolve(root, target)))?.isFile() ?? false;

  const prefix = target.slice(0, target.indexOf('*'));
  const directory = resolve(
    root,
    prefix.endsWith('/') ? prefix : dirname(prefix),
  );
  if (!(await fileStatus(directory))?.isDirectory()) return false;
  const expression = target
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  const pattern = new RegExp(`^${expression}$`);
  for await (const file of new Bun.Glob('**/*').scan({
    cwd: directory,
    onlyFiles: true,
  })) {
    const subpath = `./${relative(root, resolve(directory, file)).split(sep).join('/')}`;
    if (pattern.test(subpath)) return true;
  }
  return false;
}

async function checkPaths(
  root: string,
  build: MomoBuildConfig,
  add: AddDiagnostic,
): Promise<{ outdir: string; hasOutput: boolean }> {
  const src = resolve(root, build.src ?? 'src');
  const outdir = resolve(root, build.outdir ?? 'dist');
  const [physicalRoot, physicalSrc, physicalOutdir] = await Promise.all(
    [root, src, outdir].map(physicalPath),
  );

  if (
    contains(physicalOutdir, physicalRoot) ||
    contains(physicalOutdir, physicalSrc) ||
    contains(physicalSrc, physicalOutdir)
  ) {
    add(
      'error',
      'output.unsafe',
      'outdir 与包根目录或源码目录重叠；构建清理可能删除源码，或让产物成为下一次构建入口。',
      outdir,
    );
  } else if (!contains(physicalRoot, physicalOutdir)) {
    add(
      'warning',
      'output.outside-root',
      'outdir 位于包根目录之外；构建会递归清理该目录，请确认路径。',
      outdir,
    );
  }

  const sourceStatus = await fileStatus(src);
  if (!sourceStatus?.isDirectory()) {
    add('error', 'source.missing', '源码目录不存在或不是目录。', src);
  } else if ((await collectEntrypoints(src)).length === 0) {
    add(
      'error',
      'source.empty',
      '没有可构建的 .ts/.tsx 入口（声明文件和 spec 不计入）。',
      src,
    );
  }

  const outputStatus = await fileStatus(outdir);
  const hasOutput = outputStatus?.isDirectory() ?? false;
  if (!outputStatus) {
    add(
      'warning',
      'output.missing',
      '尚无输出目录；请运行 momo build 后再检查产物。',
      outdir,
    );
  } else if (!hasOutput) {
    add('error', 'output.not-directory', 'outdir 已存在但不是目录。', outdir);
  }

  const checkDestination = async (
    destination: string,
  ): Promise<string | undefined> => {
    const path = resolve(outdir, destination);
    const physical = await physicalPath(path);
    if (!contains(physicalOutdir, physical) || physical === physicalOutdir) {
      add(
        'error',
        'output.path-escape',
        '资源目标和可执行文件必须位于 outdir 内。',
        path,
      );
      return;
    }
    return path;
  };

  for (const [source, destination] of Object.entries(build.assets ?? {})) {
    const path = resolve(root, source);
    if (!(await fileStatus(path))?.isFile()) {
      add('error', 'asset.missing', '静态资源来源不存在或不是文件。', path);
    }
    if (contains(physicalOutdir, await physicalPath(path))) {
      add(
        'error',
        'asset.in-output',
        '资源来源位于 outdir 内，会在复制前被构建清理删除。',
        path,
      );
    }
    const output = await checkDestination(destination);
    if (output && (await fileStatus(output))?.isDirectory()) {
      add(
        'error',
        'asset.destination-directory',
        '资源目标已是目录，copyFile 需要文件路径。',
        output,
      );
    }
  }

  for (const executable of build.executables ?? []) {
    const path = await checkDestination(executable);
    if (!path || !hasOutput) continue;
    const status = await fileStatus(path);
    if (!status?.isFile()) {
      add(
        'error',
        'executable.missing',
        '配置的可执行产物不存在或不是文件；请构建后复查。',
        path,
      );
    } else if (process.platform !== 'win32' && (status.mode & 0o111) === 0) {
      add(
        'warning',
        'executable.permissions',
        '产物尚无可执行权限；momo build 会设置权限。',
        path,
      );
    }
  }

  return { outdir, hasOutput };
}

async function checkExports(
  root: string,
  value: unknown,
  outdir: string,
  hasOutput: boolean,
  add: AddDiagnostic,
  field = 'package.json#exports',
): Promise<void> {
  if (value === undefined || value === null) return;
  if (typeof value === 'string') {
    const target = resolve(root, value);
    if (!value.startsWith('./') || !contains(root, target)) {
      add(
        'error',
        'exports.invalid-target',
        `导出目标必须以 ./ 开头且位于包内：${value}。`,
        field,
      );
      return;
    }
    if (!hasOutput && contains(outdir, target)) return;
    if (!(await hasExportTarget(root, value))) {
      add(
        'error',
        'exports.missing',
        `导出目标不存在或不是文件：${value}。`,
        field,
      );
    }
    return;
  }
  if (Array.isArray(value) || isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      await checkExports(
        root,
        child,
        outdir,
        hasOutput,
        add,
        `${field}[${JSON.stringify(key)}]`,
      );
    }
    return;
  }
  add(
    'error',
    'exports.invalid',
    'exports 必须使用字符串、条件对象、数组或 null。',
    field,
  );
}

/** 只读诊断配置与本地产物；加载配置模块，但不执行构建或包脚本。 */
export async function doctor(
  options: DoctorOptions = {},
): Promise<DoctorReport> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const diagnostics: DoctorDiagnostic[] = [];
  const add: AddDiagnostic = (severity, code, message, path) => {
    diagnostics.push({ severity, code, message, ...(path ? { path } : {}) });
  };
  let root = cwd;
  let configPath: string | null = null;

  try {
    configPath = options.config
      ? resolve(cwd, options.config)
      : ((await findConfig(cwd))?.path ?? null);
    if (!configPath) {
      add(
        'error',
        'config.not-found',
        '未找到 momo.config.*；请创建配置或使用 --config 指定。',
        cwd,
      );
    } else {
      root = dirname(configPath);
      let config: unknown;
      try {
        config = await loadConfig(configPath);
      } catch (error) {
        add(
          'error',
          'config.load',
          `无法加载配置：${String(error)}`,
          configPath,
        );
        return createDoctorReport(root, configPath, diagnostics);
      }
      const build = validateBuildConfig(config, add);
      if (build) {
        checkBundleConflicts(build, add);
        const manifest = await readManifest(root, build, add);
        if (manifest) checkDependencies(manifest, build, add);
        const { outdir, hasOutput } = await checkPaths(root, build, add);
        if (manifest)
          await checkExports(root, manifest.exports, outdir, hasOutput, add);
      }
    }
  } catch (error) {
    add(
      'error',
      'inspection.failed',
      `无法完成文件检查：${String(error)}`,
      root,
    );
  }

  return createDoctorReport(root, configPath, diagnostics);
}
