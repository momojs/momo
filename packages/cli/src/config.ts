export interface MomoBuildConfig {
  /** 源码目录（相对配置文件或绝对路径），默认 `src`。 */
  src?: string;
  /** 输出目录（相对配置文件或绝对路径），默认 `dist`。 */
  outdir?: string;
  /** 产物模块格式，默认 `esm`。 */
  format?: 'esm' | 'cjs' | 'iife';
  /** 构建目标，默认 `browser`。 */
  target?: 'browser' | 'bun' | 'node';
  /** 依赖处理方式，默认 `external`（不打包依赖）。 */
  packages?: 'bundle' | 'external';
  /**
   * 即使默认不打包依赖，也内联进产物的包名。
   * 设置后会改为 `packages: 'bundle'`，并把 package.json 中其余
   * `dependencies` / `peerDependencies` / `optionalDependencies` 标为 external。
   */
  bundle?: string[];
  /** 额外保持外部化的包名，不会打进产物。 */
  external?: string[];
  /** 是否为多个 ESM 入口提取共享 chunk，以保留跨入口的引用身份。 */
  splitting?: boolean;
  /** 添加到每个 JavaScript 产物顶部的文本，例如 React Client Component 指令。 */
  banner?: string;
  /** 构建前依次执行的 package 脚本（`bun run <script>`），默认 `['typecheck', 'types']`。 */
  scripts?: string[];
  /** 构建后需要置为可执行（0o755）的产物，相对 outdir，如 `['bin.js']`。 */
  executables?: string[];
  /** 构建后复制的静态文件：键相对包根目录，值相对 outdir。 */
  assets?: Record<string, string>;
}

export interface MomoTarballIdentityConfig {
  /** 需要保持引用身份的导出名称。 */
  export: string;
  /** 参与比较的包导出子路径，例如 `['.', './core']`。 */
  from: string[];
}

export interface MomoTarballCheckContext {
  /** 原始包根目录。 */
  root: string;
  /** 本次校验使用的临时目录。 */
  temporaryDirectory: string;
  /** 干净消费项目目录。 */
  consumerDirectory: string;
  /** 解压后的包目录，位于消费项目的 node_modules 中。 */
  packageDirectory: string;
  /** 生成的 `.tgz` 路径。 */
  tarball: string;
  /** tarball 内的 package.json。 */
  manifest: Record<string, unknown>;
  /** 在指定目录执行命令，并在失败时抛错。 */
  run(
    command: string,
    args: string[],
    options?: {
      cwd?: string;
      env?: Record<string, string | undefined>;
    },
  ): Promise<string>;
}

export interface MomoTarballConfig {
  /**
   * 在干净消费项目中动态导入的包子路径。
   * 默认导入 package.json 中所有非通配符静态 export。
   */
  imports?: string[];
  /** 检查同一导出从多个入口导入时是否保持引用身份。 */
  identities?: MomoTarballIdentityConfig[];
  /** 不得残留在 JavaScript 或声明产物中的包导入。 */
  forbidImports?: string[];
  /** 包级扩展校验，在通用校验和运行时导入通过后执行。 */
  check?: (context: MomoTarballCheckContext) => Promise<void> | void;
}

export interface MomoConfig {
  build?: MomoBuildConfig;
  tarball?: MomoTarballConfig;
}

/** 提供类型推断与自动补全的配置帮助函数。 */
export function defineConfig(config: MomoConfig): MomoConfig {
  return config;
}
