# Agent 指南

> 本文件用于约定 AI / 协作者在本仓库工作的方式、技术栈与项目规范。
> 修改任何代码前请先通读本文件，并在必要时查看 `README.md` 与 `docs/guide/`。不确定时以现有源码、
`package.json` exports、`website/content/docs/` 中的文档为准。

---

## 1. Agents 协作约定

### 1.1 沟通

- 默认使用 **简体中文** 与我沟通。
- 回复风格：直接、简洁、聚焦在改动本身；避免不必要的客套与铺陈。
- 当出现假设或选择时，先说明假设并继续推进，不要空转等待确认。
- 在调用 Skill 之后，告知所有调用的 Skill 名称。

### 1.2 Skill 黑名单

以下 Skill 在本仓库**禁用**，不要主动调用：

- `wesure-code-review`

### 1.3 编码要求

- 除非显式要求，**不要**对包级源码做大规模重写或重构。
- 严格遵循 `do what has been asked, nothing more, nothing less`。

#### TypeScript

- 优先使用 **解构语法** 从对象 / 数组中取值。
- 严禁使用 `any` 兜底类型；不可避免时使用 `unknown` + 收窄。
- 优先使用 `const`，避免 `let`，禁止 `var`；如确需可变绑定，**先获得授权**再使用。

#### UI 样式

- 优先使用 Tailwind 原子类，不写零散自定义 CSS。
- 颜色 / 间距 / 字号必须使用主题 token，不要硬编码。
- 移动端优先（mobile-first）；交互动画走 `motion`，不要直接写 `@keyframes`。

#### 代码注释

- 不写无意义的"叙事性注释"（如 `// 调用函数`）。
- 允许 **尾部悬空注释 //**（保留注释残留，便于灰度 / 回滚阅读）。
- 公共 API 必须有 JSDoc，包含用途、参数、返回值与典型示例。

#### 编程范式与数学语义

- 本项目推崇信息论、范畴论与函数式编程的思维方式，以代码可读性、类型清晰和业务表达准确为边界。
- 命名、数据结构与逻辑表达优先贴近数学定义、领域模型和不变量；优先使用能表达变换、投影、组合、归约、分组、排序、等价关系、谓词、边界和信息流的名称。
- 逻辑优先建模为纯函数：输入显式、输出显式、无隐藏副作用；优先不可变数据转换，不直接修改入参。
- 优先使用表达式、函数组合和小型可复用变换来组织逻辑；避免把可推导状态长期存储为可变状态。
- 对失败、空值和不完整数据保持显式建模，优先使用类型收窄、判别联合、谓词函数或 Result / Option-like 流程表达不确定性。
- 优先使用 `remeda` 处理集合、对象、谓词、分组、排序、去重、管道组合等纯数据变换；避免重复手写已有的通用工具逻辑。
- 优先使用 `date-fns` 处理日期解析、格式化、比较、区间、加减计算和边界判断；避免手写时间戳魔法值或字符串拼接日期逻辑。
- 当 `remeda` / `date-fns` 已在目标包内可用时，AI 应优先考虑使用它们；若需要新增依赖，必须先获得用户授权，并遵循本仓库包间依赖边界。
- 不为了"函数式"引入难读的抽象，也不要把普通业务概念强行术语化；数学语义用于减少歧义，而不是制造理解成本。

### 1.4 提交 & 分支

- commit message 默认使用 **简体中文**。
- 仓库内部命令 / 脚本不要随意修改 git config。
- 没有显式要求时**不要**自动 `git commit`、`git push`、`git tag`。

---

## 2. 项目概述

MomoTS 是一套 **Bun 优先**、面向函数式与可组合的 React 工具链。
它不是 React、TanStack、Remeda、Effect 或请求客户端的替代品，而是一组
可独立引入、支持 tree-shaking 的工具包。

名字 `momo` 读作 `mo-mo`。项目强调轻量、清晰边界和可组合性：把 React
项目中经常散落的纯函数、宿主环境能力、请求驱动与 CLI 工具整理成可复用
的 workspace packages。

## 2.1 仓库结构

```text
momo/
├── packages/
│   ├── cli/       # momo CLI：构建
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

### 2.2 依赖方向

只允许沿下面方向依赖：

```text
drive -> host -> core
cli（独立的开发工具包）
website -> packages 的文档消费者
```

- `@momots/core` 不能依赖 DOM、BOM、Fetch、Storage、Blob、URL 等宿主 API。
- `@momots/host` 可以依赖 `core`，不能依赖 `drive`。
- `@momots/drive` 可以依赖 `core` 与 `host`，但不应把 `host` 的工具重新转发为
  `drive` API。
- `@momots/cli` 是开发工具层；库包通过 devDependency 使用它的 `momo build`。

## 3. 职责梳理

| 包              | 职责                                                                   | 不应放入                            |
| --------------- | ---------------------------------------------------------------------- | ------------------------------------|
| `@momots/core`  | 纯函数、类型工具、数据结构、类型守卫、值归一                           | 任何宿主环境 API                    |
| `@momots/host`  | 浏览器 / Web Platform / 运行时工具，如 DOM 守卫、Blob、CSS、Fetch 辅助 | 请求客户端编排、业务协议            |
| `@momots/drive` | Fetch 请求驱动、洋葱模型中间件、请求编码、响应解析                     | 缓存、重试、throw-on-error 全局策略 |
| `@momots/cli`   | Bun 包构建与配置                                                       | 通用运行时工具、测试 runner         |

### 3.1 归属判断

- 面向仓库开发与构建命令：放 `cli`。
- 离开浏览器/运行时仍成立的纯变换：放 `core`。
- 依赖 Web Platform 类型或能力：放 `host`。
- 围绕 Fetch 调用链、上下文、中间件执行顺序：放 `drive`。

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
bun run --filter './packages/host' test:browser
bun run --filter './packages/host' typecheck:spec

bun run --filter './packages/drive' test
bun run --filter './packages/drive' typecheck:spec
```

### 测试约定

- 普通测试使用 `bun test src`。
- 测试文件与目标文件同目录，命名为 `xxx.spec.ts`。
- 真实浏览器测试使用 `bun:test` + `bunwright`，放在包内 `browser-tests/` 并通过
  `test:browser` 运行。
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
- 需要真实浏览器 realm 的 guard 测试放 `browser-tests/`，使用 bunwright 驱动。
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

注意：

- 修改 CLI 后先构建 `cli`，再构建其他包。
- `packages/*/momo.config.ts` 定义包级构建 target。

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
- **浏览器测试**：真实 DOM realm 的能力用 bunwright 验证；bunwright 不下载
  浏览器，运行环境需要已有 Chrome 或 WebKit。
- **website Biome**：网站有 nested root Biome 配置；不要把这个问题混入普通功能
  改动。

## 12. 快速速查

| 任务                    | 优先查看                                                                     |
| ----------------------- | ---------------------------------------------------------------------------- |
| 新增纯函数              | `packages/core/src/`、`packages/core/package.json#exports`                   |
| 新增 Web API 工具       | `packages/host/src/`、`packages/host/src/guard/`、`packages/host/src/fetch/` |
| 修改 HTTP 驱动          | `packages/drive/src/core.ts`、`context.ts`、`types.ts`                       |
| 修改构建                | `packages/cli/src/`、各包 `momo.config.ts`                                   |
| 修改浏览器测试          | 包内 `browser-tests/`、`bunwright`                                            |
| 更新文档                | `website/content/docs/<pkg>/`                                                |
| 修改首页品牌叙事        | `website/src/components/hero.tsx` 与 `website/content/docs/index.mdx`        |

完成任务时，最终回复应说明改了什么、验证了什么、是否有未处理的已知问题。

