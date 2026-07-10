# MomoTS Agent 指南

本文档供 AI 编码助手在 **momo / momots** 仓库中工作时参考。
动手前先理解包边界、构建顺序与文档约定；不确定时以现有源码、
`package.json` exports、`website/content/docs/` 中的文档为准。

## 1. 项目定位

MomoTS 是一套 **Bun 优先**、面向函数式与可组合的 React 工具链。
它不是 React、TanStack、Remeda、Effect 或请求客户端的替代品，而是一组
可独立引入、支持 tree-shaking 的工具包。

名字 `momo` 读作 `mo-mo`。项目强调轻量、清晰边界和可组合性：把 React
项目中经常散落的纯函数、宿主环境能力、请求驱动与 CLI 工具整理成可复用
的 workspace packages。

## 2. 仓库结构

```text
momo/
├── packages/
│   ├── cli/       # momo CLI：构建、WebView 测试、覆盖率
│   ├── core/      # 纯函数与类型工具
│   ├── host/      # Web Platform / 宿主环境能力
│   └── drive/     # 基于 Fetch 的 HTTP 驱动
├── website/       # TanStack Start + Fumadocs 文档站
├── examples/      # 示例 workspace
├── templates/     # 脚手架模板 workspace
├── biome.json     # 根 Biome 配置
├── package.json   # Bun workspace 根脚本
└── tsconfig.json  # 根 TypeScript 配置
```

### 依赖方向

只允许沿下面方向依赖：

```text
drive -> host -> core
cli   -> core / host（作为工具包构建与测试能力）
website -> packages 的文档消费者
```

- `@momots/core` 不能依赖 DOM、BOM、Fetch、Storage、Blob、URL 等宿主 API。
- `@momots/host` 可以依赖 `core`，不能依赖 `drive`。
- `@momots/drive` 可以依赖 `core` 与 `host`，但不应把 `host` 的工具重新转发为
  `drive` API。
- `@momots/cli` 是开发工具层；库包通过 devDependency 使用它的 `momo build`。

## 3. 包边界

| 包              | 职责                                                                                 | 不应放入                                                               |
| --------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `@momots/core`  | 纯函数、类型工具、数据结构、类型守卫、值归一                                         | 任何宿主环境 API                                                       |
| `@momots/host`  | 浏览器 / Web Platform / 运行时工具，如 DOM 守卫、Storage、URL、Blob、CSS、Fetch 辅助 | 请求客户端编排、业务协议                                               |
| `@momots/drive` | Fetch 请求驱动、洋葱模型中间件、请求编码、响应解析                                   | `toCurl` 这类 host/fetch 工具转发、缓存、重试、throw-on-error 全局策略 |
| `@momots/cli`   | 构建、测试 runner、Bun.WebView、覆盖率                                               | 通用运行时工具                                                         |

### 归属判断

- 离开浏览器/运行时仍成立的纯变换：放 `core`。
- 依赖 Web Platform 类型或能力：放 `host`。
- 围绕 Fetch 调用链、上下文、中间件执行顺序：放 `drive`。
- 面向仓库开发、测试、构建命令：放 `cli`。

示例：

- `asArray`、`cardinality`、`realize`：`core`
- `isBlob`、`blobToBytes`、`toSearchParams`、`toCurl`：`host`
- `Drive`、`compose`、`filtering`、`parser`：`drive`
- `momo build`、`momo test`：`cli`

## 4. 公开 API 与导出

所有发布包都应保持：

- `"type": "module"`
- `"sideEffects": false`
- `dist` 作为发布文件
- `package.json#exports` 明确声明根入口和子路径

新增公开 API 时：

1. 在 `src/` 下新增实现。
2. 为同目录添加兄弟测试文件：`xxx.spec.ts`。
3. 更新对应包的 `src/index.ts`，只在适合根入口时导出。
4. 更新 `package.json#exports`，优先支持子路径导入。
5. 同步 `website/content/docs/<pkg>/`。
6. 运行目标包测试、类型检查和构建。

不要为了“方便”把所有能力都堆到根入口。子路径是默认优先级，根入口只放最常用、
语义稳定的能力。

## 5. 构建与测试

根目录使用 Bun workspace：

```bash
bun install
bun run build
bun run typecheck
bun run lint
bun run format
```

当前根构建顺序是：

```text
cli -> core -> host -> drive
```

这个顺序很重要。`momo build` 会先清理当前包的 `dist/`，再执行 `typecheck` 与
`types`。不要把依赖包和被依赖包并行构建，否则可能出现下游包在上游 `dist/`
被清空的窗口里找不到类型声明。

单包常用命令：

```bash
bun run --filter './packages/core' test
bun run --filter './packages/core' typecheck
bun run --filter './packages/core' build

bun run --filter './packages/host' test
bun run --filter './packages/host' test:webview
bun run --filter './packages/host' typecheck:spec

bun run --filter './packages/drive' test
bun run --filter './packages/drive' typecheck:spec
```

### 测试约定

- 普通测试使用 `bun test src`。
- 测试文件与目标文件同目录，命名为 `xxx.spec.ts`。
- WebView 相关测试使用 `momo test` 或包内 `test:webview`。
- `tsconfig.spec.json` 必须包含 `types: ["bun"]`，让 IDE 正确识别 Bun 测试环境。
- 不要只依赖构建通过；行为变化应有对应测试。

## 6. 代码风格

项目使用 Biome：

- 单引号
- 分号
- 尾逗号
- 行宽 80
- 类型导入使用 `import type`
- 不手写构建产物

```bash
node_modules/.bin/biome check packages/core
node_modules/.bin/biome check packages/host
node_modules/.bin/biome check packages/drive
```

注意：`website/biome.json` 是单独的 Biome root 配置。根目录执行
`biome check .` 可能会因为嵌套 root configuration 报错。处理 website 文件时，
优先运行：

```bash
bun run --filter website types:check
bun run --filter website build
```

如需整理 website 的 Biome 配置，应作为单独任务处理，不要混在功能改动里。

## 7. 各包工作要点

### `@momots/core`

核心原则：纯、可组合、零宿主依赖。

常见能力：

- `as/*`：值归一
- `cast/*`：类型层面的显式 cast，如 `writable`
- `casing/*`：键名大小写转换
- `guard/*`：纯类型守卫
- `tree/*`：树结构处理
- `compact`、`eliminate`、`realize`、`singleton`、`substitute`、`sumdig`

注意：

- `realize` 会把函数值视为 thunk/resolver；如果函数本身是业务值，不要直接用
  `realize` 处理。
- `core` 中不要出现 `window`、`document`、`Headers`、`Blob`、`Storage` 等类型。

### `@momots/host`

核心原则：Web Platform 与运行时能力的工具层。

常见能力：

- `guard/*`：DOM、BOM、运行时、二进制相关守卫
- `buffer`：`blobToBytes`、hex 编解码
- `url`：`toSearchParams`
- `storage`：`MemoryStorage`、`Storagefy`、`StoragefyAsync`
- `persistent`：持久缓冲
- `css/*`：CSS 颜色与变量处理
- `fetch`：Fetch 相关工具，如 `toCurl`、`FetchMethod`、`methods`
- `fingerprint`：单独子路径导入

注意：

- `toCurl` 属于 `@momots/host/fetch`，不要从 `drive` 转发。
- 需要真实浏览器 realm 的 guard 测试放 WebView spec。
- `host` 根入口可以导出常用能力，但 niche 或较重能力应保留子路径。

### `@momots/drive`

核心原则：保留原生 Fetch 语义，只提供请求编排模型。

核心对象：

- `Drive`
- `DriveContext`
- `compose`
- `filtering` / `isMatch`
- `parser`

默认管线：

```text
matched middlewares
-> per-request middlewares
-> prepare（编码请求体、timeout）
-> send（fetch）
-> receive（parser）
```

行为约定：

- 快捷方法如 `drive.get<T>()` 返回 `Promise<T | undefined>`。
- `request<T>()` 返回 `DriveFetchedContext<T>`。
- 不内置 retry、缓存、全局 throw-on-error。
- 4xx / 5xx 是否抛错交给中间件或上层库。
- `toCurl` 不属于 `drive`。

### `@momots/cli`

核心原则：仓库开发工具层。

能力：

- `momo build`：清理 `dist`、运行校验脚本、用 `Bun.build` 输出 ESM。
- `momo test`：在 Bun.WebView 中运行指定 spec。
- 覆盖率相关能力在 `src/coverage/`。

注意：

- 修改 CLI 后先构建 `cli`，再构建其他包。
- `packages/*/momo.config.ts` 定义包级构建 target 与 WebView 测试范围。

## 8. 文档约定

文档位于 `website/content/docs/`，使用 Fumadocs MDX。

```text
website/content/docs/
├── index.mdx
├── core/
├── host/
├── drive/
└── cli/
```

写作风格：

- 使用规范中文，偏教材式表达。
- 术语先定义后使用。
- API 名称、代码标识保持英文。
- 少用营销词，多说明边界、行为和例外。
- 公开 API 行为变化必须同步文档。

内容放置：

- 首页 hero：一句定位、读音、最短价值表达。
- `docs/index.mdx`：项目初衷、愿景、设计思路、竞品差异。
- 包内 `index.mdx`：安装、定位、最小示例、能力地图。
- `tutorial.mdx`：从零到一的完整场景。
- `guide.mdx`：主题化 API 说明。
- `examples.mdx`：可复制片段。

`drive` 额外文档：

- `philosophy.mdx`：理念
- `parsing.mdx`：响应解析

## 9. 变更流程

开始前：

1. 用 `rg` / `find` / `sed` 读当前实现。
2. 确认包边界和 exports。
3. 确认是否需要同步 docs。

修改时：

1. 只编辑 `src/`、配置或文档；不要手写 `dist/`。
2. 新增行为配套 `*.spec.ts`。
3. 公共 helper 先放内部文件，确认复用需求后再公开。
4. 避免新增依赖；先查 workspace 内是否已有能力。

收尾时：

```bash
bun run --filter './packages/<pkg>' test
bun run --filter './packages/<pkg>' typecheck
bun run --filter './packages/<pkg>' typecheck:spec
bun run --filter './packages/<pkg>' build
node_modules/.bin/biome check packages/<pkg>
```

跨包变更时运行：

```bash
bun run build
```

website 变更时运行：

```bash
bun run --filter website types:check
bun run --filter website build
```

## 10. Git 与工作区安全

- 只在用户明确要求时 commit。
- 不要主动 push。
- 不要使用 `git reset --hard`、`git checkout --` 等破坏性命令，除非用户明确要求。
- 可能存在用户未提交的改动；不要覆盖或回滚无关文件。
- 如果 `dist/` 是构建产物变化，说明它来自 build；不要手工编辑。

## 11. 常见坑

- **并行构建竞态**：上游包清理 `dist` 时，下游类型检查可能找不到声明文件。
  使用根脚本的顺序构建或手动按 `cli -> core -> host -> drive` 执行。
- **`realize` 与函数值**：函数会被调用；如果函数本身是配置值，不要传给
  `realize`。
- **Bun build 纯 re-export**：多入口构建时，纯 re-export 可能生成不理想产物。
  对公开 wrapper 优先使用显式 import 后再 export const。
- **WebView 测试**：真实 DOM realm 的能力用 `Bun.WebView` 验证；环境不可用时应
  温和跳过，不要让非浏览器 CI 直接崩掉。
- **website Biome**：网站有 nested root Biome 配置；不要把这个问题混入普通功能
  改动。

## 12. 快速速查

| 任务                    | 优先查看                                                                     |
| ----------------------- | ---------------------------------------------------------------------------- |
| 新增纯函数              | `packages/core/src/`、`packages/core/package.json#exports`                   |
| 新增 Web API 工具       | `packages/host/src/`、`packages/host/src/guard/`、`packages/host/src/fetch/` |
| 修改 HTTP 驱动          | `packages/drive/src/core.ts`、`context.ts`、`types.ts`                       |
| 修改构建 / WebView 测试 | `packages/cli/src/`、各包 `momo.config.ts`                                   |
| 更新文档                | `website/content/docs/<pkg>/`                                                |
| 修改首页品牌叙事        | `website/src/components/hero.tsx` 与 `website/content/docs/index.mdx`        |

完成任务时，最终回复应说明改了什么、验证了什么、是否有未处理的已知问题。
