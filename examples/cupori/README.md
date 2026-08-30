# Cupori

## 背景与形态

> 签到每一天，了解你的饮品节奏与花销。

Cupori 是一款轻量级咖啡与茶饮记录应用，灵感来自 Cafeor 等产品。面向日常咖啡与茶饮用者，帮助用户通过**饮用打卡**记录每一杯饮品、追踪花销与营养节奏，并从打卡时刻留存照片记忆。

**Cupori 是移动优先的跨端应用，不是 Web 网站。** 一套 React + TypeScript 代码经 **Capacitor** 打包为 **iOS / Android** 原生应用；**交付目标仅为 App Store 与 Google Play**。浏览器仅用于开发期预览，不作为安装或发布渠道。

## 产品定位

Cupori 应给人平静、可爱、简洁、个人化的感受——咖啡与茶饮日常习惯追踪器，而非冲煮实验室、门店发现、购物或社交产品。

**避免做成：** 豆子/茶叶库存管理 · 专业冲煮/冲泡配方日志 · 咖啡馆/茶馆地图 · 社交/社区 · 重度服务端 SaaS。

## 功能范围

App 分为三个底部 Tab：**日历 · 统计 · 设置**。

### 版本口径

- **1.0（首版 MVP）**只验证一条可靠的离线记录闭环：识别一杯饮品、
  新增、按月和按日查看、编辑或删除、查看月度基础统计，并可导出与恢复。
- **1.1**再加入周视图、地点、通知、HealthKit、iCloud 同步和主题色。
- 已经实现但超出 1.0 验收基线的增强能力可以保留，但不应阻塞首版发布。

### 1.0（首版 MVP）

#### 日历 Tab

- 月历与每日签到次数
- 选择日期后查看当日饮品列表
- 按钮「添加一杯」打开 Sheet
  - 具体饮品类型必填；分类仅用于选择页分组，不额外要求名称输入
  - 轻点饮品类型行后，在同一 Sheet 内切换到分组列表；分类标题不可选择
  - 最多显示 3 个最近使用的具体类型；选择后立即返回表单
  - 热量、糖度、咖啡因、品牌、价格、评分与备注可选
  - 照片可选，保存在本地
  - 保存成功后显示明确完成态，可选择「完成」或「再记一杯」
- 查看、编辑与删除记录
  - 删除记录时同时清理对应的本地照片

#### 统计 Tab

- 月度杯数
- 月度花销
- 月度热量
- 月度咖啡因

#### 设置 Tab

- 语言：英文 / 简体中文
- 外观：跟随系统 / 明亮 / 深色
- 导出与恢复
  - 导出内容同时包含 SQLite 数据、照片和 schema version
  - 恢复前校验备份格式，并避免覆盖有效数据

#### 离线与数据边界

- 核心路径不依赖网络
- 记录与照片在 App 重启后仍可读取
- 新增、编辑和删除后，日历、每日列表与统计保持一致
- 数据库升级使用可追踪的版本化 migration

### 1.1

- 日历与统计的周/月切换
- 跨日期的最近饮品记录
- 更丰富的 Drink Graph 与品牌分布
- 照片 EXIF 时间解析
- 地点获取、手选或反地理编码，以及地点分布
- 本地通知开关与提醒时间
- Apple 健康 / HealthKit 权限与咖啡因、能量基础写入
- iCloud 同步、备份与恢复
- 主题色切换

### 集成说明

| 能力            | 版本 | 验收边界                                                    |
| --------------- | ---- | ----------------------------------------------------------- |
| SQLite           | 1.0  | 离线持久化、版本化 migration、完整新增/读取/编辑/删除       |
| 照片             | 1.0  | 可选；保存在本地；支持随记录删除、随备份导出与恢复          |
| 手动导出与恢复   | 1.0  | 不依赖账号或云服务；同时覆盖数据库、照片和 schema version   |
| 地点             | 1.1  | 设备定位或手选/反地理编码，并用于地点统计                   |
| 本地通知         | 1.1  | 设置页开关与时间偏好；scheduled notification                |
| Apple 健康       | 1.1  | HealthKit 权限与咖啡因、能量基础写入；真机验证              |
| iCloud           | 1.1  | 设置页开关与基于 iOS 能力的同步、备份和恢复                 |

### 后续 Roadmap（1.2+）

- 安卓/iOS 原生登录/账号体系
- 社交
- 咖啡馆/茶馆发现
- 订阅/支付
- 小组件/Apple Watch
- 签到、付费补签
- 签到返现

---

## 技术栈

### 总览

| 维度     | 说明                                        |
| -------- | ------------------------------------------- |
| 产品形态 | 跨端移动应用（iOS 优先，后续 Android）      |
| 应用形态 | **Capacitor 原生应用**（单一代码库）        |
| 本地存储 | **SQLite**（`@capacitor-community/sqlite`） |
| 动画     | **Motion**（`motion`）+ **Motion+**（按需） |
| 长期交付 | **App Store / Google Play**（iOS、Android） |

| 技术                  | 职责                     |
| --------------------- | ------------------------ |
| React 19 + TypeScript | 组件化 UI、类型安全      |
| TanStack Router       | 文件路由（`src/routes`） |
| TanStack Query        | 异步数据、缓存、mutation |
| TanStack Form         | 表单与快速录入           |
| TanStack Store        | 跨组件 UI / 会话态       |
| Tailwind CSS v4       | 静态样式与移动布局       |
| Motion、Motion+       | 状态切换与交互动效       |
| Paraglide             | i18n（英文、简体中文）   |

### Capacitor

以 **iOS / Android 原生应用** 为唯一交付目标，经 Capacitor 打包同一套 Web 技术栈代码。

**1.0 所需原生能力**：

- 相机 / 相册（打卡照片）
- SQLite（离线记录）
- Filesystem、Share 或系统文件选择器（本地导出与恢复）

**1.1 原生能力**：

- Geolocation（地点）
- Local Notifications（提醒）
- HealthKit（Apple 健康）
- iCloud（平台桥接或 CloudKit 封装）
- Haptics（次要）

### SQLite

核心路径不依赖网络，数据持久化在 SQLite，弱网不白屏。1.0 通过手动导出与
恢复提供数据迁移能力；iCloud 同步属于 1.1。

数据访问使用 `@capacitor-community/sqlite` + Drizzle `sqlite-proxy`。Drizzle
schema 是表结构的唯一来源；Drizzle Kit 在开发期生成 SQLite migration，构建
脚本再将 SQL 转为可由 Capacitor WebView 加载的 TypeScript manifest。App
运行时只通过 `PRAGMA user_version` 和 Capacitor upgrade statements 追踪版本，
不使用只能访问开发机 SQLite 文件的 `drizzle-kit push`。

修改 `src/databases/schemas` 后执行：

```sh
bun run db:generate
```

该命令同时生成 `drizzle/` migration 和运行时 manifest。`bun run db:check`
校验 migration 历史、schema 是否存在未生成的变更，以及 manifest 是否同步；
正式构建也会自动执行此检查。

当前数据兼容基线 `DATABASE_BASELINE_VERSION` 设为 V0。V0 代表数据可丢弃的
测试阶段：每次应用进程初始化都会清除 SQLite 与本地照片，并从 Drizzle 基线
重建到运行时 schema V1。准备开始保留 TestFlight 或正式数据前，必须把兼容
基线提升为 V1；已经生成的 migration 必须冻结，后续结构变更只能追加新版本。

### Paraglide

使用 Paraglide；面向用户文案便于本地化，避免硬编码。

**目标语言：** 英文 · 简体中文。

早期可优先代码清晰，发布前集中整理文案。

### Motion

使用 [Motion](https://motion.dev) 与 [Motion+](https://motion.dev/plus)（已授权）为唯一动画方案。

### TanStack

全面使用 TanStack，**禁止**用 `useEffect` / `useCallback` 手写异步数据层。

| 场景         | 使用            | 避免                                                          |
| ------------ | --------------- | ------------------------------------------------------------- |
| 路由         | TanStack Router | 手写 history                                                  |
| 异步数据     | TanStack Query  | `useEffect` + `useState` 拉数；`useCallback` 包装异步业务方法 |
| 表单         | TanStack Form   | 大量受控 `useState`                                           |
| 跨组件 UI 态 | TanStack Store  | 随意 Context / prop drilling                                  |

### Effect-ts

在遇到以下场景时考虑接入 Effect-ts

- 云同步、冲突合并、离线队列回放
- 批量导入 / 导出、长时后台任务
- `bootstrap` + `migrator` 多步骤编排（重试、超时、资源释放）

若确认接入，仅约束 `src/servers/` 或专用 orchestration 模块，边界 `Effect.runPromise` 交给启动层，**不**渗透 React 组件树。

---

## 发布

### App Store / 移动端

1.0 提交前优先保证：完整记录闭环 · 离线可用 · 数据库可升级 ·
导出恢复可往返 · 照片与记录一致 · 触控友好 · 安全区与键盘 ·
精致空/加载/错误态 · 清晰隐私立场。

首版以 iOS 为优先验收平台；至少通过模拟器、真实设备和 TestFlight 验证
新增、编辑、删除、照片权限、离线重启与备份恢复。

从 Xcode 调试前先执行 `bun run ios:sync`，确保最新 Web bundle、数据库迁移
和 Capacitor 插件已经同步到 `ios/App`；也可以执行 `bun run ios:open` 完成
同步后直接打开 Xcode 工程。Archive 前同样必须重新同步。

### 命名

| 用途           | 名称                          |
| -------------- | ----------------------------- |
| 工作产品名     | Cupori                        |
| App Store 建议 | Cupori · Coffee & Tea Tracker |

发布前在 App Store Connect 完成最终命名与商标核查。
