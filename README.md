# Steam Insight

Steam 游戏数据分析与折扣助手（Windows 桌面版）。

基于 **Electron + React 19 + TypeScript + Tailwind CSS 4** 构建，通过 **Steam 官方 OpenID** 与 **Steam Web API** 获取你的公开数据，
在本地 **SQLite** 中建立分析库，提供比原生 Steam 更细的时长分析、成就统计、年度报告、愿望单降价提醒与折扣浏览体验。

> 这是独立桌面软件，**不修改 Steam 客户端、不读取账号密码、不修改任何游戏数据**。

---

## 快速开始

```bash
npm install          # 依赖（已配置 npmmirror 镜像与 Electron 镜像）
npm run dev          # 开发模式（HMR）
npm run build        # 构建到 out/
npm run typecheck    # 主进程 + 渲染层双向类型检查
npm run dist         # 打包 Windows 安装包（electron-builder）
npm run dist:dir     # 只产出免安装目录版，便于快速验证
```

Node 22+ / npm 10+。首次 `npm install` 会下载 Electron 二进制（约 110MB，走 `.npmrc` 里的镜像）。

---

## 怎么启动（三种方式）

| 方式 | 操作 | 说明 |
| --- | --- | --- |
| **① 免安装直接跑**（最快） | 双击桌面的 `Steam Insight` 快捷方式，或直接运行 `dist/win-unpacked/Steam Insight.exe` | 不写注册表、不装服务，删目录即卸载干净 |
| **② 安装版** | 双击 `dist/Steam Insight-1.0.0-setup.exe` | 装到 `%LOCALAPPDATA%\Programs\Steam Insight`，自动创建桌面与开始菜单快捷方式，可从「应用和功能」卸载 |
| **③ 开发模式** | `npm run dev` | 改代码时用，带 HMR 热更新 |

> 桌面快捷方式已预置（系统桌面为 `C:\桌面`），指向免安装版本，双击即用。
> 若移动了项目目录，该快捷方式会失效 —— 重新执行 `npm run dist:dir` 后重建快捷方式，或直接用方式 ②。
> 打包时会删除已有 `dist/`，在受管沙盒中需先设 `CODEBUDDY_SAFE_DELETE_ENABLED=0` 再跑 `npm run dist`。

---

## 首次使用

启动后进入 **Welcome** 页，只有两个入口：

| 入口 | 行为 |
| --- | --- |
| **快捷登录（检测到本机已登录时出现）** | 自动读出本机 Steam 当前登录的账号，一键把 SteamID64 填入表单 |
| **使用 Steam 登录** | 打开系统默认浏览器 → Steam 官方 OpenID 授权 → 回调本地 `127.0.0.1` 校验 `check_authentication` → 换取 SteamID64 → 自动同步 |
| **导入本地 Steam 数据（离线模式）** | 不联网，用内置演示数据集 + 本地会话采样填充数据库，用于无网络时浏览历史数据与全部界面 |

> **「客户端是否登录」怎么判的**：只看 `loginusers.vdf` 会**永远误报未登录** ——
> 新版 Steam 已不再写 `MostRecent` 字段。所以判据是注册表
> `HKCU\Software\Valve\Steam\ActiveProcess\ActiveUser`（非 0 = 当前在线用户的 SteamID3，
> 换算成 SteamID64 需要 BigInt），并用其中的 `pid` 与 `tasklist` 的 `steam.exe` PID 交叉校验，
> 避免采信上一次会话的残留值。`loginusers.vdf` 只用来取昵称与账号名。
>
> **网络检测走 Electron 的 `net`（Chromium 网络栈）**，才能读到系统代理与系统证书链。
> 用 Node 自带的 `https` 在开着本地加速器的机器上会**稳定误报「不可达」**。
> 检测结果里的「经代理 127.0.0.1:7897」就是实际生效的出口。

登录前需要先在 Welcome 页展开「高级设置」，或在「设置 → Steam 账号与 API」中填入
[Steam Web API Key](https://steamcommunity.com/dev/apikey)（免费）。
**OpenID 只用于确认身份，读取游戏库/成就/愿望单必须要有 Web API Key。**

同时请把 Steam 隐私设置中的「游戏详情」设为公开，否则游戏库会返回空。

---

## 11 个页面

| 页面 | 内容 |
| --- | --- |
| Welcome | 5 项 Steam 环境检测（安装 / 运行 / 登录 / 网络 / 路径）+ 在线账号快捷登录 + Steam 登录 / 离线导入 |
| 首页 Dashboard | 本周时长、连续天数、本周 TOP 游戏、愿望单降价数、今日摘要、本周柱状图、30 天趋势、最近游玩 |
| 游戏分析 | 周/月/年/全部四维度、每日柱状图、全年热力图、排行榜、类型饼图、常玩时段分布 |
| 游戏库 | 全库检索（名称 / 开发商 / 发行商 / 标签）、玩过与否与有无成就筛选、四种排序、点开进入游戏详情 |
| 游戏详情 | 时长与成就概览、月度趋势、每年累计、最近解锁成就、会话明细 |
| 成就中心 | 总成就数/完成数/完成率/稀有成就、最近解锁、即将完成、游戏搜索 |
| 成就追猎 | 「稀有 + 尚未解锁」待办清单，按剩余缺口 / 完成度 / 解锁难度排序；每日最多提醒一次 |
| 折扣商城 | 今日热门 / 史低专区 / 高评分折扣 / 限时免费 四个 Tab，四种排序 |
| 愿望单 | 降价条目、标签分类、四种排序、只看史低、**自定义价格阈值**（降到 ¥X 以下提醒）、手动与自动降价通知 |
| Steam Wrapped | **年度 / 月度 / 周度**报告 + TOP5 + 类型/时段/月度榜单，导出 PNG 分享海报与 PDF 完整报告 |
| 设置 | 通用 / 通知 / 外观 / 账号与 API / **网络自检** / 数据（分表导出 · 数据包 · 诊断包） / 关于 |

外观为 Steam 蓝 + Windows 11 Fluent 毛玻璃风格，支持深色 / 浅色 / 跟随系统。

---

## 数据从哪来（重要，别被"看起来像"骗了）

Steam 官方 API 的能力边界决定了这个软件能做什么、不能做什么。以下三点在界面上也都有明示：

1. **每日游玩时长不是 Steam 给的。** `GetOwnedGames` 只返回「累计时长」和「最近两周时长」。
   本软件的 `play_sessions` 表来自两种来源：
   - **快照差分采样**（真实数据）：每次同步把每款游戏的 `playtime_forever` 写入 `snapshots` 表，
     与上次的差值归到当天，生成一条会话。用越久越准，但**无法追溯安装本软件之前的历史**。
   - **内置演示数据集**：首次启动 / 离线模式下填充，用于让全部页面上手即有内容。

2. **「史低」是本机口径。** Steam 没有历史最低价接口。`price_history` 每次同步追加采样，
   `isHistoricalLow` = 当前价 ≤ 本机采样到的最低价。刚安装时它只代表「你见过的最低价」；
   首次采样没有可比基线，因此**不算**史低——需要两次以上同步才会有结果。

3. **「限时免费」只认 100% 折扣。** Steam 的 `featuredcategories` 里没有 free 分类，
   本软件用官方搜索接口（`maxprice=free&specials=1`）发现候选，再逐个确认「原价 > 0 且现价 0」。
   永久免费（Free to Play）不计入；当前没有免费活动时这个 Tab 为空是正常的。

4. **成就名与图标来自两个接口。** 名字与描述必须显式传 `l=schinese` 才会返回
   （不传时 Steam 干脆不给这两个字段）；图标来自 `GetSchemaForGame`。
   取不到全球解锁率时界面显示「未知」，而不是「0.0% 玩家拥有」。

5. **首次游玩日期是推算值。** Steam 不提供。取「最早会话」与「最早解锁成就」的较小值，
   并在界面上以「约」标注（`firstPlayedEstimated`）。

---

## 目录结构

```
steam-insight/
├─ electron/                 主进程
│  ├─ main/                  窗口 / 检测 / OpenID / API / 同步 / 通知 / 导出 / 数据库仓储
│  └─ preload/               contextBridge 暴露 window.steamInsight
│     └─ shared/             IPC 通道常量与负载契约（主/渲染共用）
├─ src/                      渲染进程
│  ├─ pages/                 11 个页面
│  ├─ components/
│  │  ├─ ui/                 基础组件（Card / Button / DataTable / GameCover / PriceTag …）
│  │  ├─ charts/             Recharts 图表（柱状 / 折线 / 饼图 / 日历热力图 / 价格走势）
│  │  ├─ layout/             标题栏 / 侧边导航 / 同步状态 / 窗口按钮
│  │  └─ shared/             跨页面复用块（页头 / 游戏卡 / 折扣卡 / 成就条目 / 指标块）
│  ├─ layouts/               主框架
│  ├─ services/              IPC 桥、演示数据集
│  ├─ store/                 Zustand（应用状态 / 数据快照 + 派生指标）
│  ├─ database/              SQLite schema、SQL 语句、渲染侧 DAO 门面
│  ├─ hooks/                 useNow / useRangeAnalysis
│  ├─ types/                 领域模型与 IPC 契约
│  └─ utils/                 format / stats / analytics / wrapped / constants
├─ assets/  public/  docs/
```

## 更多文档

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) —— 架构、数据流、8 张表结构、能力边界、展示口径约定
- [`docs/PRD.md`](docs/PRD.md) —— 产品需求文档归档（含逐条交付状态与已知偏离）
- [`docs/VERIFICATION.md`](docs/VERIFICATION.md) —— 验收记录：构建、类型检查、真机截图、缺陷清单与实测结论
- [`docs/DEPLOY-AND-NETWORK.md`](docs/DEPLOY-AND-NETWORK.md) —— 网络依赖（要不要开加速器 / VPN）与分享给他人时的环境要求，含 A/B 实测证据
- [`docs/ROADMAP.md`](docs/ROADMAP.md) —— 优化与功能候选清单（按优先级，逐条标注文件/行号依据；**含「明确不建议做」的三条与 P2-5 的调研结论**）
- [`docs/SELF-CHECK-REPORT.md`](docs/SELF-CHECK-REPORT.md) —— ROADMAP 全量交付的自检报告：92 条断言、自检揪出的两个真缺陷、未做项与遗留
- [`docs/ROADMAP-V2.md`](docs/ROADMAP-V2.md) —— V1 交付后的**新一轮**候选清单：两张采样表无保留策略（一年上百万行）、`PriceLineChart` 死代码、库价值分析等，附真实数据库实测数字
- [`docs/SELF-CHECK-REPORT-V2.md`](docs/SELF-CHECK-REPORT-V2.md) —— ROADMAP-V2 全量交付的自检报告：153 条断言、修掉的 3 个真缺陷（含「分析页空白」根因）、12 张新功能截图与未验证项

## 验收工具

仓库同级的 `tools/` 目录放着一套验收脚本（Node 22 内置 `WebSocket` / `fetch`，无第三方依赖）。
**渲染层**用构建产物 + 静态服务器 + 无头 Chrome/CDP 走查，**主进程链路**直接用真实 Electron 挂载
`out/main/index.js` 做端到端取证：

| 脚本 | 作用 |
| --- | --- |
| `serve-renderer.mjs` | 把 `out/renderer` 挂到本地 HTTP |
| `verify-steam-insight.mjs` | 13 张截图走查 + 运行时错误收集 |
| `scan-pages.mjs` | 逐页扫描文本与 SVG 文本节点，查 `NaN` / `undefined` 等污染 |
| `probe-dataset.mjs` | 量化演示数据集的自洽性 |
| `probe-dashboard.mjs` | 用数据集反算 KPI 期望值，与界面显示值对账 |
| `probe-poster-geom.mjs` / `probe-poster.mjs` | 实测分享海报的铺满情况并截图 |
| `cdp-eval.mjs` | 通用 CDP 求值器（直接读 DOM 取数，不靠肉眼读截图） |
| `probe-external-link.js` | **真实 Electron 里**派发真实鼠标点击并拦截 `shell.openExternal`，验证外部链接链路与协议白名单 |

另有一批**按功能域分组**的探针放在应用自己的 `tools/` 下（`tools/probe-*/`），
每个目录自带 `.cjs` 运行器与 esbuild 入口，跑法一致 —— 例如
`tools/probe-net/net-probe.cjs`（用应用真实传输层逐个探测 5 个 Steam 域名的可达性，
是「要不要开加速器」这个问题的实测依据）、`tools/probe-tray/`、`tools/probe-openid/` 等。

用法见 [`docs/VERIFICATION.md`](docs/VERIFICATION.md) §7；
网络类结论同时记在 [`docs/DEPLOY-AND-NETWORK.md`](docs/DEPLOY-AND-NETWORK.md)。
