# momo

momo 是一组用 TypeScript 编写、面向 React 应用的工具包：纯函数与类型工具、
Web Platform 工具、基于 Fetch 的请求客户端，以及 React 组件与动画。各包可以单独
安装，支持子路径导入和 tree-shaking。

momo 尝试对 React、TanStack、Remeda 补充应用里反复出现、又不值得每个项目重写一遍的那部分代码。

## 包

各包目前处于 alpha / beta 阶段，公开 API 仍可能调整。

| 包               | 负责                                                 | 文档                                |
| ---------------- | ---------------------------------------------------- | ----------------------------------- |
| `@momots/core`   | 与宿主环境无关的纯函数、类型工具、数据结构与类型守卫 | [开始](https://momojs.github.io/momo/zh/docs/core)   |
| `@momots/host`   | DOM / BOM、Storage、URL、二进制等 Web Platform 能力  | [开始](https://momojs.github.io/momo/zh/docs/host)   |
| `@momots/drive`  | Fetch 请求、中间件与可选的重复发送阶段               | [开始](https://momojs.github.io/momo/zh/docs/drive)  |
| `@momots/design` | React 控件、Hooks、动画与主题                        | [开始](https://momojs.github.io/momo/zh/docs/design) |

## 设计取向

下面这些约定贯穿所有包，每条都落在具体的 API 决定上。

**沿用平台概念。**

**副作用留在边界上。**

**类型说明连接条件。**

**小能力组合成大行为。**

**相同的概念用相同的写法。**

**先有真实用法，再提取抽象。**

## 本地开发

仓库使用 Bun workspace。

```sh
bun install
bun run build
bun run --filter website dev
```

`bun run build` 由 `momo topology` 按包依赖顺序串行构建，避免上游清空 `dist/` 时
下游找不到类型声明。文档站启动后访问 <http://localhost:3000>。

```sh
bun run typecheck                               # 包源码类型检查
bun run --filter './packages/*' typecheck:spec  # 测试与类型契约检查
bun run test:unit                               # 单元测试（*.test.ts）
bunx playwright install chromium webkit         # 首次运行浏览器测试前安装
bun run test:browser                            # 浏览器测试（*.spec.ts）
bun run --filter website types:check            # 网站类型检查
```

协作约定见 [AGENT.md](./AGENT.md)。
