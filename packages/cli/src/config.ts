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
  /** 构建前依次执行的 package 脚本（`bun run <script>`），默认 `['typecheck', 'types']`。 */
  scripts?: string[];
  /** 构建后需要置为可执行（0o755）的产物，相对 outdir，如 `['bin.js']`。 */
  executables?: string[];
}

export interface MomoConfig {
  build?: MomoBuildConfig;
}

/** 提供类型推断与自动补全的配置帮助函数。 */
export function defineConfig(config: MomoConfig): MomoConfig {
  return config;
}
