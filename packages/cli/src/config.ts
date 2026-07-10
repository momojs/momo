/** Bun.WebView 渲染后端，默认 macOS 上为零依赖的 WebKit。 */
export type MomoWebViewBackend = 'webkit' | 'chrome';

export interface MomoCoverageConfig {
  /** 参与统计的源码 glob，相对 momo.config.ts 目录，默认 src 下所有 .ts 文件。 */
  include?: string | string[];
  /** 排除的 glob。 */
  exclude?: string | string[];
  /** 报告格式，默认 `text`。 */
  reporter?: 'text' | 'lcov' | ('text' | 'lcov')[];
  /** 报告输出目录，默认 `coverage`。 */
  dir?: string;
}

export interface MomoTestConfig {
  /**
   * 需要在 Bun.WebView 中运行的 `.spec.ts` 文件 glob，
   * 相对于 `momo.config.ts` 所在目录解析。
   */
  include: string | string[];
  /** 需要从匹配结果中排除的 glob。 */
  exclude?: string | string[];
  /** WebView 视口宽度（像素），默认 1280。 */
  width?: number;
  /** WebView 视口高度（像素），默认 720。 */
  height?: number;
  /** 渲染后端，默认 `webkit`。 */
  backend?: MomoWebViewBackend;
  /**
   * 在每个 spec 之前注入到浏览器环境的初始 HTML body，
   * 用于准备 DOM 结构。默认空 body。
   */
  html?: string;
  /** 开启覆盖率；`true` 使用默认选项，或传入详细配置。 */
  coverage?: boolean | MomoCoverageConfig;
}

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
  test?: MomoTestConfig;
  build?: MomoBuildConfig;
}

/** 提供类型推断与自动补全的配置帮助函数。 */
export function defineConfig(config: MomoConfig): MomoConfig {
  return config;
}
