# momo

momo 是一组使用 TypeScript 编写的工具包，提供 React 组件与动画、数据处理、
宿主环境工具和 HTTP 客户端。各包可分别安装，支持子路径导入。

[组件文档](./website/content/docs/design/index.mdx) ·
[Drive 设计说明](./website/content/docs/drive/philosophy.mdx) ·
[全部文档](./website/content/docs/index.mdx) ·
[反馈问题](https://github.com/momojs/momo/issues)

## 主要功能

### Design：React 组件与动画

`@momots/design` 基于 Base UI、Motion 和 Tailwind CSS，提供 React 控件、状态反馈、
动画与主题。目标是让应用中的控件、反馈和状态切换保持一致的交互行为。

- **状态过渡**：改变 `Icon` 的图标数据即可变形；`Spinner` 可以从当前加载弧过渡到结果图标。
- **动画配置**：通过动画主题设置控件、反馈与大面积过渡的默认参数。
- **减少动态效果**：受管理的动画支持 `calm` 与 `off` 策略，装饰性循环停止。
- **独立入口**：组件、Hooks、动画主题和视觉主题可以分别导入。

动画主题作用于 momo 管理的 Motion 动画；自定义动画由调用方负责，Drawer / Sheet
等 CSS 过渡保持各自的行为。详见 [Design README](./packages/design/README.md)。

### Drive：Fetch 客户端与中间件

`@momots/drive` 在 Fetch 之上提供洋葱式中间件，按路径或谓词组织鉴权、日志和错误处理。
多个接口可以复用同一客户端的中间件，接口函数负责传参和返回结果。

- `query`、`json`、`body` 明确数据去向。
- 快捷方法返回解析后的结果；`request()` 保留状态码、响应头、原始响应和流。
- 继续使用 `Headers`、`Response`、`AbortSignal` 等平台概念。
- HTTP 错误解释、重试与缓存由应用按需要配置。

少量互不相关的请求可以直接使用 `fetch`。
阅读 [设计理念](./website/content/docs/drive/philosophy.mdx) 与
[接入教程](./website/content/docs/drive/tutorial.mdx)。

### TypeScript：类型推断与约束

类型设计覆盖值的收窄、受控与非受控状态、回调参数和不合法的选项组合。
例如 `useControllableValue` 根据默认值和控制模式推断返回值，Drive 的类型约束阻止
`json` 与 `body` 同时出现。这些约定有编译期类型测试支持。

类型声明与运行时校验各有边界：Drive 的响应泛型 `T` 是调用方对接口契约的断言，
不会自动验证服务端数据。

## 包与文档

| 包 | 适合处理什么 | 文档 |
| --- | --- | --- |
| `@momots/design` | React 控件、状态反馈、动画与主题 | [开始](./packages/design/README.md) |
| `@momots/drive` | Fetch 请求、中间件与传输策略 | [开始](./packages/drive/README.md) |
| `@momots/core` | 与环境无关的纯函数、类型与数据处理 | [开始](./packages/core/README.md) |
| `@momots/host` | Storage、二进制、DOM 与 Web Platform 能力 | [开始](./packages/host/README.md) |
| `@momots/refine` | Luhn、MOD 11-2 与号码解析校验 | [开始](./packages/refine/README.md) |
| `@momots/cli` | Bun 包构建、类型生成与工作区构建顺序 | [开始](./website/content/docs/cli/index.mdx) |

各包目前处于 alpha / beta 阶段，公开 API 仍可能调整。安装时使用对应预发布标签，
具体要求以各包 README 和 `package.json` 为准。

## 使用 Design

适用于 React 19.2+ 与 Tailwind CSS v4 项目。当前 React / React DOM 的 peer 范围为
`^19.2.7`，两者应使用相同版本。

```sh
bun add @momots/design@alpha @momots/core@beta @momots/host@beta
bun add @base-ui/react @hugeicons/core-free-icons @hugeicons/react
bun add react@^19.2.7 react-dom@^19.2.7
bun add cn cva date-fns motion remeda tailwindcss type-fest
```

也可使用 npm 或 pnpm 安装；上述公共依赖由应用管理版本。
在应用主样式表中引入 Tailwind、组件类扫描入口和视觉主题：

```css
@import "tailwindcss";
@import "@momots/design/tailwind.css";
@import "@momots/design/themes/neutral.css";
```

下面的组件可直接展示按下反馈与图标状态变形：

```tsx
'use client';

import { useState } from 'react';
import { CheckmarkCircle02Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@momots/design/components/button';
import { Icon } from '@momots/design/components/icon';

export function Confirmation() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className='theme-neutral'>
      <Button onClick={() => setConfirmed((value) => !value)}>
        <Icon icon={confirmed ? CheckmarkCircle02Icon : Tick02Icon} />
        {confirmed ? '已确认，再试一次' : '确认选择'}
      </Button>
    </div>
  );
}
```

需要统一调整动画时，使用
[`MotionUIThemeProvider` 与 `defineTheme`](./packages/design/README.md#motion-themes)。
日期与时间选择器还需要引入 `@momots/design/picker.css`。

## 使用 Drive

```sh
bun add @momots/drive@beta @momots/core@beta remeda
```

以下示例在客户端中配置鉴权与 HTTP 错误处理，并提供查询用户的方法：

```ts
import { Drive } from '@momots/drive';

type User = { id: string; name: string };

export function createUserApi(getToken: () => string) {
  const drive = new Drive().use('/api/**', async (context, next) => {
    context.req.headers.set('Authorization', `Bearer ${getToken()}`);
    await next();

    const { raw } = context.res;
    if (raw && !raw.ok) throw new Error(`HTTP ${raw.status}`);
  });

  return {
    detail: (id: string) =>
      drive.get<User>({
        api: `https://example.com/api/users/${encodeURIComponent(id)}`,
      }),
  };
}
```

Drive 不添加 base URL，也不默认把 `4xx` / `5xx` 转换成异常；上例显式设置了错误策略。
Bun 与 Node.js 通常应使用绝对地址。需要响应元数据或流时，改用 `request()`。

## 本地开发

仓库当前使用 Bun 安装依赖、运行开发服务和执行构建。各包支持的运行环境见对应文档。

```sh
bun install
bun run build
bun run --filter website dev
```

打开 [本地文档站](http://localhost:3000)，可在首页直接操作 Design 组件，
也可进入组件文档查看示例与 API。

```sh
bun run typecheck                       # 包源码类型检查
bun run --filter './packages/*' typecheck:spec  # 测试与类型契约检查
bun run test:unit                       # 单元测试
bunx playwright install chromium webkit # 首次运行浏览器测试前安装
bun run test:browser                    # 真实浏览器交互测试
bun run --filter website types:check    # 网站类型检查
```
