# Steam Insight 架构说明

本文记录**实际实现**的架构、数据流、表结构与能力边界。凡是「界面看起来像但底层做不到」的地方都在这里写明，避免后来者按想象改代码。

---

## 1. 进程模型

```
┌─────────────────────────── Electron 主进程 (electron/main) ───────────────────────────┐
│  index.ts          应用入口：单实例锁、协议、生命周期                                    │
│  window.ts         BrowserWindow 创建、无边框窗口控制、最大化状态广播                     │
│  paths.ts          userData / 数据库文件 / 设置文件路径                                  │
│  settings.ts       settings.json 读写（原子写：先写临时文件再 rename）                    │
│  database.ts       sql.js(WASM) 持有者：建表、schema 版本迁移、事务、防抖落盘              │
│  mappers.ts        行(snake_case) ↔ 领域对象(camelCase) 映射（纯函数，从 repository 拆出）  │
│  repository.ts     SQL 执行 / upsert / 同步后清理残留 / 11 个具名查询 / loadSnapshot        │
│  steam-detect.ts   本机 Steam 检测（注册表 / reg 查询 / tasklist / loginusers.vdf / 网络探针）│
│  http.ts           统一 HTTPS 传输层：Electron net（读系统代理+系统证书链）优先，node:https 回退 │
│  api-base.ts       API 共享地基：JSON 请求 + 宽松解析（数字/布尔可能是字符串）+ 并发池      │
│  steam-openid.ts   OpenID 登录：本地 127.0.0.1 回环服务 + check_authentication 校验       │
│  steam-api.ts      Steam Web API（需 Key）：玩家 / 游戏库 / 成就 / 愿望单                  │
│  steam-store.ts    商店公开接口：appdetails / appreviews / featuredcategories / 免费搜索   │
│  sync.ts           同步编排：demo / api 两种模式，快照差分生成 play_sessions              │
│  achievement-sync.ts  成就按需拉取（增量），判定逻辑抽成纯函数 planAchievementTargets       │
│  notifications.ts  Windows 原生通知 + 点击跳转                                          │
│  notify-plan.ts    通知判定纯函数（该弹哪些 + 去重）+ 回写 wishlist.notified_at           │
│  exporter.ts       CSV / XLSX / PNG / PDF 导出                                         │
└──────────────────────────────────────────────────────────────────────────────────────┘
                    ▲                                            │
                    │ contextBridge (window.steamInsight)         │ ipcMain.handle / webContents.send
                    ▼                                            ▼
┌─────────────────────────── 渲染进程 (src) ────────────────────────────────────────────┐
│  pages/       10 个页面                                                                │
│  components/  ui(18) · charts(8) · layout(4) · shared(5)                                │
│  store/       useAppStore（导航/主题/设置/同步/检测）· useDataStore（快照 + 派生指标）    │
│  services/    bridge.ts（原生桥 / 预览桥）+ mock/（演示数据集）                          │
│  utils/       format · stats · analytics · wrapped · constants                          │
│  database/    schema.ts + queries.ts + client.ts（渲染侧 DAO 门面）                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**单一事实来源**：IPC 通道名只在 `electron/shared/channels.ts` 定义，负载类型只在 `electron/shared/contract.ts` 定义，main / preload / renderer 三方都引用，避免通道名与签名漂移。

---

## 2. 数据流

```
启动 → useAppStore.bootstrap()
        ├─ bridge.app.info()            环境信息
        ├─ bridge.settings.get()        本机设置
        ├─ bridge.steam.detect()        Steam 环境检测（8 个探针，各自 3–8s 超时）
        └─ bridge.db.loadSnapshot()     一次性读出全量快照
                                        ↓
                              useDataStore.snapshot（唯一真源）
                                        ↓
                              derived（一次性算好的索引与聚合）
                                        ↓
                              页面全部从 snapshot / derived 取值渲染

同步 → sync.run(mode)
        ├─ mode='api'   : Steam Web API 拉取 → repository 写入 → 快照差分 → play_sessions
        └─ mode='demo'  : 内置演示数据集写入（离线可用）
        每步通过 sync:status 推进度，渲染层顶部状态条实时反映

导出 → exporter.table(CSV/XLSX) 或 exporter.wrapped(PNG/PDF 或 表格)
```

### 关键约定：统计优先读库

所有统计一律从本地 SQLite 读（`db.loadSnapshot()` 一次读全），**不在渲染层重新请求 Steam API**。理由是避免重复消耗 API 配额、并保证离线可看。只有「同步」这一个动作会联网。

---

## 3. SQLite 表结构

数据库文件由 `sql.js`（WASM，无原生依赖）持有，主进程独占，写入带 **防抖落盘**（避免频繁 fsync）。金额一律 `INTEGER`（单位：分，`-1` 表示未定价），时长 `INTEGER`（分钟），时间戳 `INTEGER`（unix 秒），日期 `TEXT (YYYY-MM-DD)`，数组字段存 JSON 字符串。

### 3.1 八张核心表

| 表 | 主键 | 说明 |
| --- | --- | --- |
| `users` | `steam_id` | 账号资料。`source` 标记数据来源（`api` / `local` / `demo`） |
| `games` | `app_id` | 游戏库。含 `playtime_forever_min` / `playtime_two_weeks_min` / 成就计数 / 首发与末玩时间 / `first_played_estimated` |
| `play_sessions` | `id` AUTOINCREMENT | 会话明细。建立 `play_date`、`app_id` 两个索引 |
| `achievements` | `(app_id, api_name)` | 成就明细，含 `unlocked_at` / `global_percent` / `is_rare` |
| `wishlist` | `(app_id, steam_id)` | 愿望单，含价格、`is_historical_low`、`notified_at` |
| `discounts` | `(app_id, category)` | 折扣条目，按 `hot/lowest/toprated/free` 四个品类分开存 |
| `price_history` | `(app_id, captured_at)` | 每次同步追加一条价格采样 |
| `reports` | `year` | 年度报告缓存（由原始数据推导，不落库业务意义） |

### 3.2 内部表

| 表 | 主键 | 说明 |
| --- | --- | --- |
| `snapshots` | `(app_id, captured_at)` | **差分采样专用**。每次同步记录一次 `playtime_forever`，与上次的差值归到当天，用于生成 `play_sessions` |

> `snapshots` 不计入 PRD 的 8 张核心表，它是 `play_sessions` 的生成依据。

---

## 4. 能力边界（重要）

Steam 官方 API 决定了这个软件能做什么。以下三点在界面上也都有明示文案。

### 4.1 每日游玩时长不是 Steam 给的

`GetOwnedGames` 只返回**累计时长**与**最近两周时长**，没有每日明细。`play_sessions` 有两个来源：

| 来源 | 机制 | 局限 |
| --- | --- | --- |
| 快照差分采样（真实） | 每次同步写 `snapshots`，与上次的 `playtime_forever` 差值归到当天 | **无法追溯安装本软件之前的历史**；采样越久越准 |
| 内置演示数据集 | 首次启动 / 离线模式填充 | 仅用于让界面上手即有内容，顶部会明确标注「预览模式 · 演示数据」 |

### 4.2 「史低」是本机口径

Steam 没有历史最低价接口。`isHistoricalLow` = **当前价 ≤ 本机 `price_history` 采样到的最低价**。刚安装时它只代表「你见过的最低价」，不代表 Steam 全历史最低价。

### 4.3 首次游玩日期是推算值

Steam 不提供。取「最早会话」与「最早解锁成就」的较小值，并以 `first_played_estimated` 标记，界面用「约」字标注。

---

## 5. 展示口径约定（踩过坑，别再犯）

这几条是实测发现过的真实缺陷，属于**约定**，改代码时必须遵守。

### 5.1 时间戳用本地时间，日期字符串用 UTC

- `play_sessions.play_date` 是**日期字符串**，由固定的 UTC 基准推导，保证换机器结果可复现。
- `play_sessions.started_at` 是**时间戳**，必须落在**本地时间**的傍晚（17:00 起）——因为它要经过 `new Date(ts*1000).getHours()` 渲染成「常玩时段」。
  - 曾经把 `started_at` 也写成 UTC 基准，结果 GMT+8 下「傍晚」变成**凌晨 0-6 点**，并且会话卡片上 `play_date` 与 `toYMD(started_at)` **差一天**。
- 生成器在 `src/services/mock/seed.ts` 里同时提供 `dayStartUTC`（推日期字符串 / 星期）与 `dayStartLocal`（推会话时刻）两个基准，**不要混用**。

### 5.2 `MonthlyPoint.month` 必须是原始键

`month` 字段约定为 `YYYY-MM`（年度序列为 `YYYY`），**短标签由图表组件自己格式化**。曾经有两个生产者提前格式化成 `"9 月"`，而消费者按 `YYYY-MM` 解析，页面上出现了满屏 `NaN月` 与 `2026月`。

`MonthlyBarChart.monthLabel()` 现在对已格式化的值也有兜底，但**生产者仍需遵守约定**。

### 5.3 `position: fixed` 的覆盖层必须走 portal

页面容器 `.page-enter` 的入场动画带 `transform`，会给 `position: fixed` 造出**包含块**——覆盖层只会铺满内容区，盖不住顶栏与侧栏。凡是需要铺满整个窗口的覆盖层（如年度分享海报），一律 `createPortal(..., document.body)`。

### 5.4 路由在内存里，不要用 hash 驱动跳转

应用**没有 hash 路由**，路由状态在 `useAppStore.route` / `params`。主进程要切换页面必须走 `navigate` IPC 通道：

```
webContents.send(CH.navigate, { route, params })
```

曾经主进程用 `loadURL(base + '#/wrapped?export=png')` 并等 `did-finish-load` 来导出海报——同文档 hash 导航**不会**触发 `did-finish-load`，渲染层也不认这个 hash，导出会直接挂死。现在改为「发 navigate → 轮询 DOM 确认已绘制 → 截图」。

### 5.5 游戏详情页的「来源」用 `params.from` 传，别在详情页写死返回目标

游戏详情不是导航项，却有 6 个入口：首页 / 游戏分析 / 游戏库 / 成就中心 / 折扣商城 / 愿望单。
`RouteParams.from` 记录来源路由，**两处**消费它：

- 侧边栏高亮：`route === 'game' ? (params.from ?? 'analysis') : route` —— 否则从任何页面点进详情，导航都跳到「游戏分析」上。
- 详情页的返回按钮，以及 App 里「找不到这款游戏」的空状态：回到 `from`，文案取 `ROUTE_LABELS[from]`（`from` 缺失时退回游戏分析）。

**反例**（早期实现）：详情页写死 `navigate('analysis')` + 「返回游戏分析」。从游戏库点进去，按钮却写着「返回游戏分析」，点完跳到分析页——用户会以为点错了。
路由的中文名只在 `store/useAppStore.ts` 的 `ROUTE_LABELS` 里维护一份，侧边栏也从这里取，别再写第二份。

---

## 6. 导出实现

| 格式 | 实现 | 备注 |
| --- | --- | --- |
| CSV | 手写序列化 + **UTF-8 BOM** | BOM 是为了 Excel 打开中文不乱码 |
| XLSX | `exceljs` 真写 | 表头加粗、冻结首行、列宽自适应 |
| PNG | `webContents.capturePage()` | 先切到 Wrapped 海报态（`exportMode='png'`），海报铺满整窗后截屏，再切回首页 |
| PDF | `webContents.printToPDF()` | A4、`printBackground: true` |

导出统一走 `dialog.showSaveDialog`；用户取消返回 `{ ok:false, cancelled:true }`，**不抛错**。

---

## 7. 依赖版本

运行时与构建链的版本是**互相约束**的，升级时注意：

| 包 | 版本 | 备注 |
| --- | --- | --- |
| electron | ^44.4.5 | |
| electron-vite | ^5.0.0 | peer 要求 vite ^5/^6/^7 |
| vite | ^7.3.6 | **不能升到 8** |
| @vitejs/plugin-react | **5.2.0（锁定）** | 6.x 要求 vite ^8，与 electron-vite 5 冲突 |
| react / react-dom | ^19.3.0 | 入口未使用 StrictMode（避免开发期重复副作用） |
| typescript | ^5.9.3 | |
| tailwindcss + @tailwindcss/vite | ^4.3.3 | 通过 `@theme inline` 把 CSS 变量暴露成工具类 |
| zustand | ^5.0.15 | |
| recharts | ^3.10.1 | |
| sql.js | ^1.14.2 | WASM，**零原生依赖**，省掉 better-sqlite3 的编译问题 |
| exceljs | ^4.4.0 | |
| lucide-react | ^1.48.0 | 1.x 有图标改名，见下 |

### 7.1 lucide-react 1.x 改名对照

`Loader2`→`LoaderCircle`、`AlertTriangle`→`TriangleAlert`、`BarChart3`→`ChartColumn`、`PieChart`→`ChartPie`、`LineChart`→`ChartLine`、`Filter`→`Funnel`、`Trash2`→`Trash`。用错会直接构建失败。

---

## 8. 代码约束

- **单文件 ≤ 300 行**（当前最长 285 行，`electron/main/sync.ts`）。超了就按职责抽文件或子组件：`steam-api.ts` 涨到 317 行后按「共享地基 / Web API / 商店接口」拆成 `api-base.ts` + `steam-api.ts` + `steam-store.ts`；`repository.ts` 顶到 300 行后把映射层抽成 `mappers.ts`；`sync.ts` 的成就段抽成 `achievement-sync.ts`；`src/pages/settings/` 下则是设置页抽出来的三个区块。
- **所有 HTTPS 请求统一走 `electron/main/http.ts`**，不要在别处直接 `node:https` 或 `fetch`。其中一条硬约束：**绝不要手工设置 `Content-Length`** —— Electron 的 `net` 底层是 Chromium URLLoader，body 长度必须由它自己算，手工设置会让请求当场报 `net::ERR_INVALID_ARGUMENT`；通道降级到 `node:https` 后，在本机（Steam 域名被本地反代接管）又必然 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`，于是一个 POST 两条通道一起死。`viaNet` / `viaNode` 现已兜底过滤该头，调用方也不应再传。
- 类型检查必须双向通过：`npm run typecheck` 同时跑 `tsconfig.node.json`（主进程）与 `tsconfig.web.json`（渲染层）。
- 预览桥（`src/services/bridge.ts`）在 `window.steamInsight` 缺失时提供内存实现，让页面能在纯浏览器里跑通，便于无 Electron 环境下调试与验收。预览模式会在顶部明确标注，不伪装成真实数据。

---

## 9. 主题与设计令牌

- CSS 变量统一以 `--si-` 前缀、**短横线分隔**：`--si-accent`、`--si-accent-2`、`--si-accent-3`、`--si-ok`、`--si-warn`、`--si-danger`、`--si-heat-0..3`、`--si-grid`、`--si-axis`、`--si-line-2` 等。
- `@theme inline` 再把这些变量映射成 Tailwind 工具类：`bg-app`、`text-accent`、`rounded-card`、`shadow-card`、`bg-heat0..3`。
- 图表不能硬编码颜色，统一通过 `src/components/charts/themeColors.ts` 的 `useCssVar()` 读变量。
  - ⚠️ 变量名写错会得到空字符串，SVG 的 `fill=""` 会**渲染成黑色**——曾经把 `--si-accent-2` 写成 `--si-accent2`，所有柱状图变黑。`useCssVar` 现在有 `currentColor` 兜底与一次性告警。
- 主题支持 深色 / 浅色 / 跟随系统；`data-theme` 挂在 `<html>` 上。
