# Agent 指南

本文件约定 AI / 协作者在本仓库工作的方式。修改代码前先读它；需要更多上下文时，
再看对应包源码、`package.json#exports`、`README.md` 与 `website/content/docs/`。

---

## 1. 协作原则

### 沟通

- 默认使用 **简体中文**。

- 回复直接、简洁，聚焦改动、验证结果和未处理风险。
- 遇到合理假设时，先说明假设并继续推进；不要因小选择空转等待。

### Skill

- 调用 Skill 后，在回复中说明用过的 Skill 名称。
- 不允许主动调用 `wesure-code-review`。

### 工作边界

- 严格遵循：do what has been asked, nothing more, nothing less。
- 除非明确要求，不做大规模重写、跨包重构或风格统一。
- 可能存在用户未提交的改动；不要覆盖、回滚或格式化无关文件。
- 没有明确要求时，不要 `git commit`、`git push`、`git tag`。
- 不要使用 `git reset --hard`、`git checkout --` 等破坏性命令，除非用户明确要求。
- 命令和脚本不要随意修改 git config。

---

## 2. 项目概览

`momo` 是一套 **Bun 优先**、面向函数式与可组合性的 React 工具链。它不是
React、TanStack、Remeda、Effect 或请求客户端的替代品，而是一组可独立引入、
支持 tree-shaking 的 workspace packages。

`momo` 读作 `mo-mo`。项目强调轻量、清晰边界和可组合性。

### 结构

```text
momo/
├── packages/
│   ├── cli/       # momo CLI：构建工具
│   ├── core/      # 纯函数与类型工具
│   ├── design/    # React 组件、hooks、主题
│   ├── drive/     # 基于 Fetch 的 HTTP 驱动
│   └── host/      # Web Platform / 宿主环境能力
├── website/       # TanStack Start + Fumadocs 文档站
├── examples/
├── templates/
├── biome.json
├── package.json
└── tsconfig.json
```

### 依赖方向

```text
drive -> host -> core
design -> host/core（按需）
cli 独立作为开发工具包
website -> packages 的文档消费者
```

- `@momots/core` 不能依赖 DOM、BOM、Fetch、Storage、Blob、URL 等宿主 API。
- `@momots/host` 可以依赖 `core`，不能依赖 `drive`。
- `@momots/drive` 可以依赖 `core` 与 `host`，但不要把 `host` 工具转发为
  `drive` API。
- `@momots/design` 面向 React UI，避免承载业务逻辑。
- `@momots/cli` 是开发工具层；库包通过 devDependency 使用它的 `momo build`。

### 包职责

| 包 | 负责 | 不应放入 |
| --- | --- | --- |
| `core` | 纯函数、类型工具、数据结构、类型守卫、值归一 | 宿主环境 API |
| `host` | DOM/BOM/Web Platform、二进制、URL、Storage、CSS、Fetch 工具 | 请求客户端编排、业务协议 |
| `drive` | Fetch 请求驱动、中间件、请求编码、响应解析、可选发送阶段 | 缓存、默认自动重试、全局 throw-on-error |
| `design` | React 组件、hooks、动画效果、主题与 Tailwind 辅助 | 业务状态、产品流程 |
| `cli` | Bun 包构建与配置 | 通用运行时工具、测试 runner |

归属判断：

- 仓库开发与构建命令：放 `cli`。
- 离开浏览器 / 运行时仍成立的纯变换：放 `core`。
- 依赖 Web Platform 类型或能力：放 `host`。
- 围绕 Fetch 调用链、上下文、中间件执行顺序：放 `drive`。
- 组件、交互、主题、UI hooks：放 `design`。

---

## 3. 编码规范

### TypeScript

- 优先使用解构从对象 / 数组中取值。
- 禁止用 `any` 兜底；不可避免时使用 `unknown` 并完成收窄。
- 优先 `const`；只有确需可变绑定时才使用 `let`；禁止 `var`。
- 类型导入使用 `import type`。
- 公共 API 应有 JSDoc，说明用途、参数、返回值和典型示例。

### 数据与函数

- 优先纯函数：输入显式、输出显式、无隐藏副作用。
- 不直接修改入参，优先不可变数据转换。
- 不把可推导状态长期存为可变状态。
- 对失败、空值和不完整数据显式建模，优先使用类型收窄、判别联合或谓词函数。
- 命名贴近领域模型、不变量和数据流；数学语义用于减少歧义，不制造理解成本。
- 目标包已可用时，优先用 `remeda` 处理集合、对象、谓词、分组、排序、去重和管道组合。
- 目标包已可用时，优先用 `date-fns` 处理日期解析、格式化、比较、区间和边界判断。
- 新增依赖前先获得用户授权，并遵守包间依赖边界。

### UI 与样式

- 优先 Tailwind 原子类，不写零散自定义 CSS。
- 颜色、间距、字号使用主题 token，不硬编码。
- 移动端优先。
- 交互动画使用 `motion`；不要直接写 `@keyframes`。
- 组件状态、动画状态、样式变体要有清晰边界。

### 注释

- 不写无意义的叙事性注释，如 `// 调用函数`。
- 保留已有用于分隔、灰度或回滚阅读的尾部悬空注释。
- 只在复杂逻辑、公共 API 或非显然约束处补充说明。

---

## 4. 公开 API 与文档

所有发布包默认保持：

- `"type": "module"`
- `dist` 作为发布文件
- `package.json#exports` 明确声明根入口和子路径
- 除主题 CSS 等必要资源外，尽量保持无副作用

新增公开 API 时：

1. 在对应包的 `src/` 下新增实现。
2. 添加同目录兄弟测试：`xxx.spec.ts`。
3. 更新对应包的 `src/index.ts`，只在适合根入口时导出。
4. 更新 `package.json#exports`，优先支持子路径导入。
5. 同步 `website/content/docs/<pkg>/`。
6. 运行目标包测试、类型检查和必要构建。

不要为了“方便”把所有能力堆到根入口。子路径导入优先；根入口只放最常用、
语义稳定的能力。

文档位于 `website/content/docs/`，使用 Fumadocs MDX：

```text
website/content/docs/
├── index.mdx
├── cli/
├── core/
├── design/
├── drive/
└── host/
```

写作要求：

- 使用规范中文，偏教材式表达。
- 术语先定义后使用。
- API 名称、代码标识保持英文。
- 少用营销词，多说明边界、行为和例外。
- 公开 API 行为变化必须同步文档。

---

## 5. 构建、测试与格式

根目录使用 Bun workspace：

```bash
bun install
bun run build
bun run typecheck
bun run lint
bun run format
```

根构建脚本当前顺序：

```text
cli -> core -> host -> drive
```

`momo build` 会先清理当前包的 `dist/`，再执行校验和类型产物生成。不要把依赖包与
被依赖包并行构建，否则下游可能在上游 `dist/` 被清空时找不到声明文件。

单包常用命令：

```bash
bun run --filter './packages/<pkg>' test
bun run --filter './packages/<pkg>' typecheck
bun run --filter './packages/<pkg>' typecheck:spec
bun run --filter './packages/<pkg>' build
node_modules/.bin/biome check packages/<pkg>
```

示例：

```bash
bun run --filter './packages/core' test
bun run --filter './packages/host' test:browser
bun run --filter './packages/design' typecheck
```

测试约定：

- 普通测试使用 `bun test src`。
- 测试文件与目标文件同目录，命名为 `xxx.spec.ts`。
- 真实浏览器测试放在包内 `browser-tests/`，通过 `test:browser` 运行。
- `tsconfig.spec.json` 必须包含 `types: ["bun"]`。
- 不要只依赖构建通过；行为变化应有对应测试。

Biome 约定：

- 单引号
- 分号
- 尾逗号
- 行宽 80
- 不手写构建产物

`website/biome.json` 是单独的 Biome root。处理 website 文件时优先运行：

```bash
bun run --filter website types:check
bun run --filter website build
```

如需整理 website 的 Biome 配置，应作为单独任务处理。

---

## 6. 包内注意事项

### `@momots/core`

- 原则：纯、可组合、零宿主依赖。
- 常见目录：`as/*`、`cast/*`、`casing/*`、`guard/*`、`tree/*`。
- `realize` 会把函数值视为 thunk / resolver；函数本身是业务值时不要直接传入。
- 不要出现 `window`、`document`、`Headers`、`Blob`、`Storage` 等宿主类型。

### `@momots/host`

- 原则：Web Platform 与运行时能力的工具层。
- 常见能力：DOM/BOM guard、`buffer`、`url`、`storage`、`persistent`、`css/*`、
  `fetch`、`fingerprint`。
- `toCurl` 属于 `@momots/host/fetch`，不要从 `drive` 转发。
- 需要真实浏览器 realm 的 guard 测试放 `browser-tests/`。

### `@momots/drive`

- 原则：保留原生 Fetch 语义，只提供请求编排模型。
- 核心对象：`Drive`、`DriveContext`、`compose`、`filtering` / `isMatch`、`parser`。
- 默认管线：

```text
matched middlewares
-> per-request middlewares
-> prepare（编码请求体、timeout）
-> send（fetch）
-> receive（parser）
```

- 快捷方法如 `drive.get<T>()` 返回 `Promise<T | undefined>`。
- `request<T>()` 返回 `DriveFetchedContext<T>`。
- 默认不启用自动重试、缓存、全局 throw-on-error；`repeat` 仅作为可选的重复发送阶段提供。
- 4xx / 5xx 是否抛错交给中间件或上层库。

### `@momots/design`

- 原则：组件轻量、状态边界清晰、主题 token 优先。
- 组件放 `src/components/`，hooks 放 `src/hooks/`，动画 / 视觉效果放 `src/effects/`。
- 受控 / 非受控状态优先复用现有 hooks。
- 样式变体优先用 `cva` 和主题 token 表达。
- 对外导出时同步 `src/components/index.ts`、包 `exports` 和文档。

### `@momots/cli`

- 原则：仓库开发工具层。
- `momo build` 负责清理 `dist`、运行校验脚本、用 `Bun.build` 输出 ESM。
- 修改 CLI 后先构建 `cli`，再构建其他包。
- `packages/*/momo.config.ts` 定义包级构建 target。

---

## 7. 变更流程

开始前：

1. 用 `rg` / `sed` / `find` 读当前实现。
2. 确认包边界、依赖方向和 exports。
3. 判断是否需要同步测试与文档。

修改时：

1. 只编辑源码、配置或文档；不要手写 `dist/`。
2. 新增行为配套 `*.spec.ts`。
3. 公共 helper 先放内部文件，确认复用需求后再公开。
4. 避免新增依赖；先查 workspace 内是否已有能力。

收尾时按影响范围选择命令，不必为了小改动跑全量检查。

最终回复应说明改了什么、验证了什么、是否有未处理的已知问题。

---

## 8. 常见坑

- **并行构建竞态**：上游包清理 `dist` 时，下游类型检查可能找不到声明文件。
  使用根脚本顺序构建，或手动按 `cli -> core -> host -> drive` 执行。
- **`realize` 与函数值**：函数会被调用；如果函数本身是配置值，不要传给 `realize`。
- **Bun build 纯 re-export**：多入口构建时，纯 re-export 可能生成不理想产物。
  公开 wrapper 优先显式 import 后再 `export const`。
- **浏览器测试**：真实 DOM realm 的能力用 bunwright 验证；运行环境需要已有
  Chrome 或 WebKit。
- **website Biome**：网站有 nested root Biome 配置；不要把这个问题混入普通功能改动。

---

## 9. 快速速查

| 任务 | 优先查看 |
| --- | --- |
| 新增纯函数 | `packages/core/src/`、`packages/core/package.json#exports` |
| 新增 Web API 工具 | `packages/host/src/`、`packages/host/src/guard/`、`packages/host/src/fetch/` |
| 修改 HTTP 驱动 | `packages/drive/src/core.ts`、`context.ts`、`types.ts` |
| 修改 UI 组件 | `packages/design/src/components/`、`hooks/`、`effects/` |
| 修改构建 | `packages/cli/src/`、各包 `momo.config.ts` |
| 修改浏览器测试 | 包内 `browser-tests/`、`bunwright` |
| 更新文档 | `website/content/docs/<pkg>/` |
| 修改首页叙事 | `website/src/components/hero.tsx` 与 `website/content/docs/index.mdx` |
