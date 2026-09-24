import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

type Manifest = Record<string, unknown>;

export const TOPOLOGY_ACTIVE_ENV = 'MOMO_TOPOLOGY_ACTIVE';

export interface TopologyOptions {
  /** 从此目录向上查找 workspace 根，默认 process.cwd()。 */
  cwd?: string;
  /** 包名或相对 workspace 根目录的路径 glob；自动包含所选包的上游依赖。 */
  filters?: string[];
}

export interface TopologyPackage {
  name: string;
  directory: string;
  dependencies: string[];
  /** 缺少 build 脚本的包参与排序，但不执行构建。 */
  build: string | null;
}

export interface TopologyPlan {
  root: string;
  /** 依赖优先的稳定拓扑顺序。 */
  packages: TopologyPackage[];
}

function isRecord(value: unknown): value is Manifest {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function readManifest(path: string): Promise<Manifest> {
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!isRecord(value)) throw new Error(`${path} 必须包含 JSON 对象。`);
  return value;
}

function workspacePatterns(manifest: Manifest, root: string): string[] {
  const value = isRecord(manifest.workspaces)
    ? manifest.workspaces.packages
    : manifest.workspaces;
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string' && item.trim())
  ) {
    throw new Error(
      `${join(root, 'package.json')} 的 workspaces 必须是路径字符串数组。`,
    );
  }
  return value;
}

async function findWorkspace(
  cwd: string,
): Promise<{ root: string; patterns: string[] }> {
  let directory = resolve(cwd);
  while (true) {
    let manifest: Manifest | undefined;
    const path = join(directory, 'package.json');
    try {
      manifest = await readManifest(path);
    } catch (error) {
      if (!isRecord(error) || error.code !== 'ENOENT') {
        throw new Error(`无法读取 ${path}：${String(error)}`);
      }
    }
    if (manifest?.workspaces !== undefined) {
      return {
        root: directory,
        patterns: workspacePatterns(manifest, directory),
      };
    }
    const parent = dirname(directory);
    if (parent === directory)
      throw new Error('未找到声明 workspaces 的 package.json。');
    directory = parent;
  }
}

function normalizePattern(pattern: string): string {
  return pattern.replace(/^\.\//, '').replace(/\/+$/, '');
}

async function discoverManifests(
  root: string,
  patterns: string[],
): Promise<Map<string, { directory: string; manifest: Manifest }>> {
  const paths = new Set<string>();
  const excluded = patterns
    .filter((pattern) => pattern.startsWith('!'))
    .map((pattern) => new Bun.Glob(normalizePattern(pattern.slice(1))));

  for (const pattern of patterns.filter((item) => !item.startsWith('!'))) {
    if (isAbsolute(pattern) || pattern.split('/').includes('..')) {
      throw new Error(`workspace 路径必须位于根目录内：${pattern}`);
    }
    const glob = new Bun.Glob(`${normalizePattern(pattern)}/package.json`);
    for await (const path of glob.scan({ cwd: root, onlyFiles: true })) {
      const directory = dirname(path).split(sep).join('/');
      if (
        directory === '.' ||
        directory
          .split('/')
          .some((part) => part === 'node_modules' || part === '.git')
      )
        continue;
      if (!excluded.some((exclude) => exclude.match(directory)))
        paths.add(path);
    }
  }

  const packages = new Map<string, { directory: string; manifest: Manifest }>();
  for (const path of [...paths].sort()) {
    const absolute = resolve(root, path);
    let manifest: Manifest;
    try {
      manifest = await readManifest(absolute);
    } catch (error) {
      throw new Error(`无法读取 ${absolute}：${String(error)}`);
    }
    const { name } = manifest;
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error(`${absolute} 缺少有效的包名。`);
    }
    if (packages.has(name)) {
      throw new Error(
        `workspace 包名重复：${name}（${packages.get(name)?.directory}、${dirname(absolute)}）。`,
      );
    }
    packages.set(name, { directory: dirname(absolute), manifest });
  }
  return packages;
}

/** 根据 workspace 包名建立依赖图并预检；此阶段不执行任何脚本。 */
export async function planTopology(
  options: TopologyOptions = {},
): Promise<TopologyPlan> {
  const { root, patterns } = await findWorkspace(options.cwd ?? process.cwd());
  const manifests = await discoverManifests(root, patterns);
  const names = [...manifests.keys()].sort();
  const filters = options.filters ?? [];
  const selected = new Set<string>(filters.length ? [] : names);
  for (const filter of filters) {
    if (!filter.trim() || filter.startsWith('!'))
      throw new Error('--filter 需要非空的包名或路径 glob，不支持排除表达式。');
    const glob = new Bun.Glob(normalizePattern(filter));
    const matches = names.filter((name) => {
      const entry = manifests.get(name);
      return (
        glob.match(name) ||
        (entry !== undefined &&
          glob.match(relative(root, entry.directory).split(sep).join('/')))
      );
    });
    if (!matches.length)
      throw new Error(`--filter 未匹配任何 workspace 包：${filter}`);
    for (const name of matches) selected.add(name);
  }
  if (!selected.size) throw new Error('没有找到可处理的 workspace 包。');

  const ordered: TopologyPackage[] = [];
  const visited = new Set<string>();
  const visiting: string[] = [];

  const visit = (name: string): void => {
    if (visited.has(name)) return;
    const cycle = visiting.indexOf(name);
    if (cycle !== -1) {
      throw new Error(
        `检测到 workspace 循环依赖：${[...visiting.slice(cycle), name].join(' → ')}`,
      );
    }
    const entry = manifests.get(name);
    if (!entry) throw new Error(`未找到 workspace 包：${name}`);
    const { directory, manifest } = entry;
    const dependencies = new Set<string>();
    for (const field of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]) {
      const value = manifest[field];
      if (value === undefined) continue;
      if (!isRecord(value)) throw new Error(`${name} 的 ${field} 必须是对象。`);
      for (const [dependency, version] of Object.entries(value)) {
        if (typeof version !== 'string')
          throw new Error(`${name} 的 ${field}.${dependency} 必须是字符串。`);
        // peer 常使用发布版本范围；本地包名匹配就建立构建依赖。
        if (manifests.has(dependency)) dependencies.add(dependency);
        else if (version.startsWith('workspace:'))
          throw new Error(
            `${name} 声明了不存在的 workspace 依赖：${dependency}`,
          );
      }
    }
    const scripts = manifest.scripts;
    if (scripts !== undefined && !isRecord(scripts))
      throw new Error(`${name} 的 scripts 必须是对象。`);
    const build = isRecord(scripts) ? scripts.build : undefined;
    if (build !== undefined && (typeof build !== 'string' || !build.trim())) {
      throw new Error(`${name} 的 build 脚本必须是非空字符串。`);
    }

    visiting.push(name);
    const dependencyNames = [...dependencies].sort();
    for (const dependency of dependencyNames) visit(dependency);
    visiting.pop();
    visited.add(name);
    ordered.push({
      name,
      directory,
      dependencies: dependencyNames,
      build: typeof build === 'string' ? build : null,
    });
  };

  for (const name of [...selected].sort()) visit(name);
  return { root, packages: ordered };
}

/** 串行执行预检后的 build 脚本；首个失败立即终止并返回原退出码。 */
export async function runTopology(plan: TopologyPlan): Promise<number> {
  for (const [index, entry] of plan.packages.entries()) {
    const prefix = `[${index + 1}/${plan.packages.length}] ${entry.name}`;
    if (entry.build === null) {
      console.log(`${prefix}：跳过（未定义 build 脚本）`);
      continue;
    }
    console.log(`\n${prefix}：bun run build`);
    const child = Bun.spawn([process.execPath, 'run', 'build'], {
      cwd: entry.directory,
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
      env: { ...process.env, [TOPOLOGY_ACTIVE_ENV]: '1' },
    });
    const exitCode = await child.exited;
    if (exitCode !== 0) {
      console.error(
        `${entry.name} 构建失败（退出码 ${exitCode}），已停止后续构建。`,
      );
      return exitCode > 0 ? exitCode : 1;
    }
  }
  return 0;
}
