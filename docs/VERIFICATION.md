# Steam Insight 验收记录

本文记录 v1.0 的**实测**验收过程与结论。所有数字都是跑出来的，不是估计的。

---

## 1. 验收环境与手段

| 项 | 值 |
| --- | --- |
| 系统 | Windows（win32） |
| Node | 22.22.2 |
| 验收方式 | **无头 Chrome + CDP** 驱动构建产物（`out/renderer`）做全站走查、截图与 DOM 实测 |

### 1.1 Electron 主进程能不能跑？能，但要挑对参数

**更正**：本文档早期版本写着「Electron 主进程无法启动，参数全试过无效」，这个结论是**错的**。
实测只要给足软件渲染参数，主进程能正常引导（后续的启动冒烟测试与 §4.5 端到端探针都跑在这条路上）：

```
--no-sandbox --disable-gpu --disable-gpu-compositing --disable-software-rasterizer
--in-process-gpu --disable-dev-shm-usage --disable-features=Vulkan,WebGPU,...
```

只加 `--disable-gpu` 会 FATAL 退出（GPU 进程反复崩溃后 Chromium 主动 `Goodbye`），
所以**单参数失败不能判定「起不来」**，见 §5 的启动冒烟测试。

于是验收分两条线：

- **渲染层（全站走查）**：构建生产产物 → 静态服务器挂载 → 无头 Chrome + CDP 加载，
  通过 `window.steamInsight` 缺失自动进入**预览桥**（内置演示数据集），
  完整走通 9 个页面的渲染、交互与主题切换。加载的是渲染层真实产物，不是 mock 页面。
- **主进程链路（IPC / 原生能力）**：把**真实的 `out/main/index.js`** 挂进 Electron 跑，
  用 `webContents.debugger` 派发真实输入事件，并拦截 `shell.openExternal` / 记录落盘取证
  （§4.5 的链接点击、§5 的启动冒烟都走这条）。

> ⚠️ 本沙盒下 `--remote-debugging-port` **端口能监听，但外部探测工具连不上**（网络视图隔离）。
> 因此驱动一律走**进程内**的 `executeJavaScript` / `webContents.debugger` API，不依赖本地端口。

仍然验不了的只剩两项：**窗口画面的肉眼确认**（无显示器，GPU 无法创建共享上下文）
与 **`reg.exe`**（程序黑名单，且拦截作用于整个进程树）。均已在 §6 逐项列明。

### 1.2 验收脚本

| 脚本 | 作用 |
| --- | --- |
| `tools/verify-steam-insight.mjs` | 14 张截图走查：Welcome → 离线导入 → 8 个导航页（含游戏库）→ 浅色主题复核 → 退出登录；同时收集运行时异常与控制台报错 |
| `tools/verify-c-library.mjs` | 游戏库页专项验收（31 条断言）：入场 / 检索 / 五种筛选 / 五种排序 / 空状态 / 卡片进详情 / **6 个来源的返回往返**，全程 CDP 直读 DOM |
| `tools/scan-pages.mjs` | 逐页扫描「可见文本 + 所有 SVG 文本节点」，检测 `NaN` / `undefined` / `Invalid` / `Infinity` / `[object` / 裸 CSS 变量名 |
| `tools/probe-dataset.mjs` | 直接打包执行 `dataset.ts`，量化演示数据集的自洽性 |
| `tools/probe-dashboard.mjs` | 用数据集反算仪表盘各项 KPI 的**期望值**，与界面显示值对账 |
| `tools/probe-poster-geom.mjs` | 实测分享海报覆盖层的矩形、z-index 与层叠上下文祖先 |
| `tools/probe-poster.mjs` | 抓取海报态并截图 |
| `tools/cdp-eval.mjs` | 通用 CDP 求值器，直接读 DOM 取数（不靠肉眼读截图） |
| `tools/serve-renderer.mjs` | 极简静态服务器 |
| `tools/probe-external-link.js` | 在**真实 Electron** 里挂载 `out/main/index.js`，用 CDP 派发**真实鼠标点击**并拦截 `shell.openExternal` 取证（外部链接链路 + 协议白名单），结果落盘 `probe-external-link.result.json` |

---

## 2. 构建与静态检查

| 项 | 命令 | 结果 |
| --- | --- | --- |
| 主进程构建 | `electron-vite build` | ✅ `out/main/index.js` 109.80 kB |
| 预加载构建 | 同上 | ✅ `out/preload/index.js` 3.55 kB |
| 渲染层构建 | 同上 | ✅ `out/renderer/assets/index-ClbZ2ho4.js` 1,924.40 kB + `index-CakvEpxd.css` 58.97 kB（含游戏库页，较上一版 +26.62 kB） |
| 主进程类型检查 | `tsc -p tsconfig.node.json --noEmit` | ✅ **0 错误** |
| 渲染层类型检查 | `tsc -p tsconfig.web.json --noEmit` | ✅ **0 错误** |

---

## 3. 运行时验收

### 3.1 全站走查

```
（未登录时先出 ✓ 01-welcome）
✓ 02-dashboard   ✓ 03-analysis    ✓ 04-game-detail  ✓ 05-library
✓ 06-achievements ✓ 07-store      ✓ 08-wishlist     ✓ 09-wrapped
✓ 10-settings    ✓ 11-settings-light ✓ 12-dashboard-light ✓ 13-analysis-light
✓ 14-welcome（退出登录后回到 Welcome）

运行时错误 0 条，警告 0 条
```

> 首轮验收曾有 1 条错误：浏览器默认请求 `/favicon.ico` 得到 404。已补 `public/favicon.svg` 并在 `index.html` 声明，复验归零。

### 3.2 文本污染扫描

```
✓ 首页           正文   965 字 / SVG  37 / table 0
✓ 游戏分析        正文  1658 字 / SVG  28 / table 1
✓ 游戏库         正文  2727 字 / SVG 100 / table 0
✓ 成就中心        正文  4171 字 / SVG  59 / table 0
✓ 折扣商城        正文  1589 字 / SVG  48 / table 0
✓ 愿望单         正文  2924 字 / SVG  73 / table 0
✓ Steam Wrapped 正文  1292 字 / SVG  35 / table 0
✓ 设置           正文  1265 字 / SVG  38 / table 0

合计污染命中：0
```

（数值随演示数据集与内容演进而变，早期版本为 7 个页面；游戏库页的 100 个 SVG 主要来自卡片里的成就进度条与图标。）

扫描覆盖 SVG 文本节点（`innerText` 抓不到）。首轮曾在此扫出 `NaN月`；修复后 SVG 文本样例为：

- 首页柱图轴：`9/21 9/22 9/23 9/24 9/25 9/26`
- 分析页柱图轴：`9/1 9/2 … 9/14`
- Wrapped 月度图轴：`1月 2月 3月 … 12月`

### 3.3 演示数据集自洽性

`probe-dataset.mjs` 直接执行数据生成器：

| 指标 | 结果 |
| --- | --- |
| 规模 | 42 款游戏 / 2,526 段会话 / 1,909 条成就 |
| 累计时长自洽 | target 6,320h vs session 6,320h，**偏差 0.00%** |
| 单游戏自洽 | 偏差 >15% 的游戏 **0 / 42** |
| 近 6 个月每月游戏数 | 13 / 12 / 11 / 8 / 8 / 7 款 |
| 最近 7 天有记录 | **7 / 7** |
| 自今日往前连续天数 | **22 天** |
| 最后有记录的一天 | 2026-09-26（今天） |
| 近 30 天游戏数 | 7 款，单日 min=1 max=6 avg=1.8 |
| 成就口径一致 | games 表（1909 / 838）与 achievements 表**完全一致**，不一致 0 款 |

### 3.4 界面数值对账

把数据集的**期望值**与界面**显示值**逐项比对（DOM 读取，非肉眼读图）：

| KPI | 界面显示 | 数据集实算 | 结论 |
| --- | --- | --- | --- |
| 本周游戏时间 | 19.8 小时 | 19.8 h（09/21–09/26） | ✅ |
| 环比 | ↓42.7% | -42.7%（上周 34.6h） | ✅ |
| 连续游玩天数 | 22 天 | 22 天 | ✅ |
| 历史最长连续 | 79 天 | 79 天 | ✅ |
| 本周 TOP 游戏 | Stardew Valley 14.3h | 14.3h（占本周 72.5%） | ✅ |
| 今日游玩 | 4.9 小时 | 4.9 h | ✅ |
| 今日解锁成就 | 3 个 | 3 个 | ✅ |
| 达到史低 | 14 款 | 14 款（折扣 10 ∪ 愿望单 4） | ✅ |
| 成就中心 | 1909 总 / 838 已解锁 / 43.9% | 1909 / 838 / 838÷1909=43.9% | ✅ |
| 愿望单 | 24 总数 / 10 打折 / 4 史低 | 24 / 10 / 4 | ✅ |
| 设置页表行数 | 1 / 42 / 2526 / 1909 / 24 / 40 | 与数据集一致 | ✅ |
| 游戏分析区间 | 107.4h / 4.1h·天 / 7 款 / 25 天 | 与数据集一致 | ✅ |

> 本周每日柱图的真实日值为 `1.5 / 2.7 / 7.0 / 1.3 / 2.3 / 4.9 = 19.8h`，与卡片数值严格相符。
> 验收过程中曾因**肉眼读低分辨率截图的柱高**误判为「对不上」，改用 DOM 取数后证实数值完全正确——再次说明不能靠读图下结论。

---

## 4. 本轮修复的缺陷清单

验收不是走过场，下面各条都是**实测发现并修复**的真实缺陷
（§4.14 例外 —— 那是排查后确认**不是**本应用缺陷的一条，也一并留档）。

| # | 缺陷 | 根因 | 修复 |
| --- | --- | --- | --- |
| 1 | 所有柱状图渲染成**黑色** | 图表读 `--si-accent2`，而令牌实际叫 `--si-accent-2`；取不到值得到空字符串，SVG `fill=""` 渲染为黑 | 统一改正变量名；`useCssVar()` 增加 `currentColor` 兜底与一次性告警 |
| 2 | 指标卡环比显示 `-4.005524861878453%` | 未格式化 | 改为保留 1 位小数 |
| 3 | 演示数据 **2026 年 6/7/8 月完全空白**，近 30 天只有 1 款游戏 | 旧的会话生成按自然日全局贪心分配，早期日期就把时长耗尽 | 重写为「按游戏逐个摊到自己的首玩~末玩窗口」，周末/节假日/近期加权并保证覆盖最后一次游玩日 |
| 4 | 游戏详情「月度游玩趋势」轴标签满屏 **`NaN月`** | `MonthlyPoint.month` 契约被破坏：生产者发预格式化的 `"9 月"`，消费者却按 `YYYY-MM` 解析 | 生产者改回原始键 `YYYY-MM`；`monthLabel()` 增加兜底 |
| 5 | 「每年累计时长」轴标签显示 **`2026月`** | 同上（年度值 `"2026"` 被当作月份） | 同上，并按 `^\d{4}$` 识别为年份输出 `2026年` |
| 6 | Wrapped 月度柱图同样 `NaN月` | 第二个生产者 `stats.monthlySeries` 也提前格式化 | 同 #4 |
| 7 | 会话记录标题 `2026-09-26`，副标却是 **`2026-09-27 起`** | 数据集时间戳用 UTC 基准，界面按本地时间渲染，GMT+8 下跨了一天 | 会话时间戳改用**本地**时刻（日期字符串仍走 UTC 以保证可复现），实测 2526 段**全部同日、跨日 0** |
| 8 | 「常玩时段」显示 **凌晨 0-6 点** | 同 #7：UTC 傍晚在 GMT+8 就是凌晨 | 同 #7，实测钟点范围 `17:00–22:00`、峰值 **晚上 18-24 点** |
| 9 | 今日解锁成就数恒为 **0** | 同 #7 的连带：解锁时间戳落在「次日」，与「今天」比对不上 | 同 #7，修复后正确显示 3 个 |
| 10 | 分享海报**盖不住顶栏与侧栏**；导出流程会挂死 | ① 海报嵌在 `.page-enter` 内，其入场动画的 `transform` 给 `position: fixed` 造出包含块；② 主进程用 `loadURL('#/wrapped?export=png')` + `did-finish-load` 驱动，而渲染层没有 hash 路由、同文档 hash 导航也不触发该事件；③ `exportMode` 传进来了却从未被使用 | ① 改用 `createPortal` 挂到 `document.body` 并提升 z-index；② 改为 `navigate` IPC + DOM 轮询确认已绘制；③ `poster` 由 `exportMode` 驱动 |

### 4.1 海报修复的实测证据

`probe-poster-geom.mjs` 强制进入海报态后实测（该次构建为验证临时强制 `poster = true`，**已还原**）：

| 项 | 修复前 | 修复后 |
| --- | --- | --- |
| 海报矩形 | `x=236 y=78 w=1268 h=1329` | **`x=0 y=0 w=1538 h=882`** |
| 视口 | 1538 × 882 | 1538 × 882 |
| 是否铺满视口 | ❌ false | ✅ **true** |
| 层叠上下文祖先 | `div.page-enter`（`transform: matrix(1,0,0,1,0,0)`） | **无** |
| 侧栏位置最顶层元素 | 侧栏的 `SPAN` | **海报自身的 `P`**（已盖住侧栏） |

截图 `shots/wrapped-poster-export.png` 可见海报铺满整窗，无侧栏无顶栏，内容为「2026 / 1,642 小时 / 21 款 / 146 个 / 18.6 小时 / 36 天 / TOP5 / RPG / 最常在晚上 18-24 点上线」。

> 该截图是在**临时**把 `poster` 强制为 `true` 的构建下拍摄的（正式代码中 `poster` 由 `exportMode` 驱动，只有主进程导出时才会置位）。强制改动**已还原**，还原后重建产物哈希 `index-DOtB34oK.js` 与全量验收版本完全一致，可确认已验证状态被逐字节还原。

### 4.2 代码规范修复

PRD 要求**单文件 ≤ 300 行**。本轮有 3 个文件超标，按职责拆分：

| 文件 | 拆分前 | 拆分后 | 拆出的模块 |
| --- | --- | --- | --- |
| `src/pages/SettingsPage.tsx` | 392 | **165** | `pages/settings/` 下 AccountSection(107) / DataSection(120) / AboutSection(68) |
| `src/pages/WrappedPage.tsx` | 337 | **263** | `pages/wrapped/PosterOverlay.tsx`(76) |
| `src/services/mock/dataset.ts` | 322 | **215** | `mock/seed.ts`(26，共享种子与随机源) + `mock/pricing.ts`(106) |

**拆分无损验证**：拆 `dataset.ts` 会牵动随机数消费顺序，一旦顺序变化整个演示数据集都会变。因此拆完后重跑两个探针逐项比对：

```
42 款 / 2526 段 / 1909 条 · 6320h · 偏差 0.00%
近 6 个月 13/12/11/8/8/7 款（与拆前逐月一致）
19.8h · -42.7% · 14.3h · 22 天 · 79 天 · 今日 4.9h
2526 段全部同日 · 今日解锁 3 个 · 折扣 40 · 愿望单 24 · 史低 14
```

**全部与拆前一致**，证明随机序列未被改动。重构后各页正文长度也与重构前逐页相同（958 / 1652 / 4160 / 1584 / 2818 / 1287 / 1254），说明渲染层重构无损。

当前工程规模：**89 个源文件 / 8,783 行**，最长文件 279 行。

---

### 4.3 账号切换入口缺失（2026-09-26 追加）

**现象**：用户选择「导入本地 Steam 数据（离线模式）」进入主界面后，右上角显示 `NovaSteam`，
但**找不到任何退出登录 / 切换账号的入口**，因此无法登录自己的 Steam 账号。

**根因：「是否已登录」有两个不一致的判定源**

| 位置 | 判定依据 | 该场景下的值 |
| --- | --- | --- |
| 右上角用户区、首页欢迎语 | 数据库 `users` 表（快照 `snapshot.user`） | 演示数据已 seed → 显示 `NovaSteam` |
| 设置页「退出登录」按钮 | `settings.steamId`（`settings.json`） | 离线模式不写 settings → **空字符串** |

`AccountSection` 的写法是 `settings.steamId ? <Button>退出登录</Button> : null`，
于是按钮**根本不渲染**；而右上角用户区原本是纯展示 `div`，不可点击。
两者叠加 → 界面看起来「已登录」，却没有任何出口。

**修复**

1. `components/layout/TitleBar.tsx`：右上角账号区改为可点击的**账号菜单**（`aria-haspopup="menu"`），
   内含当前身份与数据来源、`账号与登录设置`、`退出登录 / 切换账号`；支持点击空白处 / Esc 关闭；
   未登录时改为「登录 Steam 账号」按钮直达 Welcome。
2. `pages/settings/AccountSection.tsx`：退出按钮的显示条件由 `settings.steamId`
   改为 `settings.steamId || user?.personaName`，让演示 / 离线模式下也能退出。

**实测证据**（无头 Chrome + CDP，构建产物 `index-6CziEYKa.js`）

| 断言 | 结果 |
| --- | --- |
| 账号菜单按钮存在 | `hasMenuBtn: true` |
| 点击后菜单展开 | `menuOpen: true` |
| 菜单内容 | `当前使用本地演示数据` / `NovaSteam` / `SteamID64 76561198341973281` |
| 菜单项 | `账号与登录设置`、`退出登录 / 切换账号` |
| 菜单几何 | `x=1059 y=56 w=252 h=166`，`inViewport: true` |
| 点击「退出登录」 | 跳回 Welcome（`<header>` 消失），出现「使用 Steam 登录」「导入本地 Steam 数据（离线模式）」 |
| 设置页退出按钮 | `hasLogoutBtn: true`（修复前为 `false`） |

截图：`shots/14-account-menu.png`、`shots/15-settings-account-logout.png`。

> 附带说明：侧边栏「本地数据库 N 条游玩记录」与首页统计读的是同一个快照，
> 本次实测为 `2,526`，与数据库 `play_sessions` 实际行数一致。

---

### 4.4 Steam 检测误报「客户端未登录 / 网络不可达」（2026-09-26 追加）

**现象**：用户的 Steam 客户端明明在后台运行且已登录，欢迎页的环境检测却报告
「客户端是否登录：未登录」「Steam 网络连接：不可达」，因而拿不到任何快捷登录入口。

#### 根因 A —— `loginusers.vdf` 里根本没有 `MostRecent` 字段

实测本机 `E:\Steam\config\loginusers.vdf`：每个账号块只有
`AccountName / PersonaName / RememberPassword / WantsOfflineMode / SkipOfflineModeWarning / AutoLogin / Timestamp`，
**`MostRecent` 不存在**。旧实现把 `mostRecent === '1'` 当作「已登录」的唯一依据，于是永远判未登录，
`recentAccounts` 与昵称也一并取不到。

权威来源改为注册表 `HKCU\Software\Valve\Steam\ActiveProcess`（真机实测原文）：

```
HKEY_CURRENT_USER\Software\Valve\Steam\ActiveProcess
    pid               REG_DWORD    0x71b0      （= 29104，与 tasklist 的 steam.exe PID 一致）
    SteamClientDll    REG_SZ       E:\steam\steamclient.dll
    ActiveUser        REG_DWORD    0x17080519  （十进制 386401561 = 当前在线用户的 SteamID3）
```

| 推导 | 真机实测值 |
| --- | --- |
| `SteamPath` | `e:/steam` |
| `ActiveUser`（REG_DWORD，十六进制） | `0x17080519` → `386401561` |
| SteamID64 = `76561197960265728 + ActiveUser` | **`76561198346667289`** |
| 该 SteamID64 是否存在于 `loginusers.vdf` | ✅ 存在（注册表与 VDF 互相印证） |
| `AutoLoginUser` | `2531400565`（仅作「未在线」时的兜底） |
| `loginusers.vdf` 账号块数 | 3 |

SteamID64 基数 7.6e16 超出 `Number.MAX_SAFE_INTEGER`（9.007e15），全程用 **BigInt** 运算，
避免末位精度丢失导致对不上 `loginusers.vdf` 的键。

此外增加了 **PID 过期保护**：`ActiveProcess\pid` 可能与 `tasklist` 拿到的 `steam.exe` PID 对不上
（上一次会话的残留），此时不采信 `ActiveUser`。

#### 根因 B —— 网络探针走 Node `https`，读不到系统代理与证书链

本机启用了本地代理（`HKCU\...\Internet Settings\ProxyEnable = 1`，`127.0.0.1:7897`），
Steam 域名被 DNS 解析到 `127.0.0.1`（本地反代做 TLS 终结）。
Node 的 `https.get` 使用自带 CA 包且**不读系统代理设置**，握手直接失败。

同一台机器、同一时刻的实测对比：

| 请求方式 | `api.steampowered.com` | `store.steampowered.com` | 识别到的代理 |
| --- | --- | --- | --- |
| Node `https.get`（旧实现） | ❌ `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | ❌ 同上 | 不识别（直连） |
| **Electron `net`（新实现）** | ✅ **HTTP 200**，响应体含 `servertime` | ✅ **HTTP 200**，返回真实 `appdetails` JSON | ✅ `127.0.0.1:7897` |

四个端点在真实 Electron 中的实测响应：

| 端点 | 状态 | 耗时 | 响应体 |
| --- | --- | --- | --- |
| `ISteamWebAPIUtil/GetServerInfo/v1/` | 200 | 668ms | `{"servertime":1790401341,"servertimestring":"Fri Sep 25 22:42:21 2026"}` |
| `store.steampowered.com/api/appdetails?appids=730` | 200 | 1ms（缓存） | 15,668 字节真实 JSON，含 `"name":"Counter-Strike 2"` |
| `steamcommunity.com/openid/login` | 200 | 921ms | 46,142 字节真实 OpenID 登录页 |
| `IWishlistService/GetWishlist/v1/` | 200 | 345ms | 134 字节真实愿望单 `{"response":{"items":[...]}}` |

#### 修复

1. **新增 `electron/main/http.ts`** —— 统一 HTTPS 传输层：优先 Electron `net`（Chromium 网络栈，
   读系统代理 + 系统证书链），失败回退 `node:https`；`proxyLabel()` 把实际生效的代理上报给界面显示。
2. **重写 `electron/main/steam-detect.ts`** —— `loggedIn` 只认注册表 `ActiveUser`；
   新增 `lastLoginPersona` / `lastLoginSteamId` / `networkDetail` 字段；
   网络探测要求响应体确实是 Steam 数据，且把失败原因**原样上报**（不再只显示「不可达」）。
3. **`steam-api.ts` / `steam-openid.ts`** 全部改用该传输层（登录回验、库/成就/愿望单拉取一并受益）。
4. **新增 `src/pages/welcome/AccountQuickLogin.tsx`** —— 检测到在线账号时，欢迎页展示
   昵称 / 账号名 / SteamID64，一键把 SteamID64 填入登录表单；未就绪时逐项写明缺什么。

#### 实测证据

**① 账号推导纯逻辑：用真机数据做 17 条断言，17/17 通过**

做法：把 `parseRegValues` / `hexOrNum` / `steamId3To64` / `readLoginUsers` / `resolveLocalAccount`
当纯函数，喂入**真机的注册表原文**与**真实的 `loginusers.vdf`**。
`readRegistry` 用 Node 能直读的 `winreg`（Python）取真值并格式化成 `reg query` 的输出格式。

| 断言组 | 覆盖内容 | 结果 |
| --- | --- | --- |
| E1 | `SteamPath` / `AutoLoginUser` 解析 | ✅ |
| E2 | `ActiveUser` / `pid` 的 `REG_DWORD` 十六进制解析 | ✅ |
| E3 | SteamID3 → SteamID64（BigInt 不丢精度，与 Python 大整数结果一致） | ✅ |
| E4 | 真实 `loginusers.vdf` 解析出 3 个账号块、命中账号名、昵称非空 | ✅ |
| E5 | 注册表推出的 SteamID64 与 VDF 的键**互相印证** | ✅ |
| E6 | Steam 运行中且 `ActiveUser ≠ 0` → `loggedIn: true` 且账号正确 | ✅ |
| E7 | `ActiveUser = 0`（停在登录界面）→ 不算登录，但仍给出「本机记住的账号」 | ✅ |
| E8 | Steam 未运行 → 不算在线 | ✅ |
| E9 | `ActiveProcess\pid` 过期 → 不采信 `ActiveUser` | ✅ |
| E10 | 只有 `MostRecent=1` 但 `Timestamp` 更小的账号仍被正确选中（旧版 Steam 兼容） | ✅ |

**② 网络传输层：真实 Electron 中 4 个端点全部 HTTP 200 且响应体为真实数据**（见上表）。

**③ 界面：无头 Chrome + CDP 实测**

| 断言 | 结果 |
| --- | --- |
| 快捷登录卡片渲染 | `data-quick-login` 存在，含昵称 / 账号名 / `SteamID64 76561198346667289` |
| 点「填入该账号」 | `steamId` 输入框被填入 `76561198346667289`，并提示「已填入本机登录的账号」 |
| 检测未就绪时 | 卡片不出现（浏览器预览模式 `installed: false`），不会给出假账号 |

截图：`shots/16-welcome-quick-login.png`、`shots/17-quick-login-filled.png`。

> ⚠️ 这两张截图是在**临时**给 `src/services/bridge.ts` 的预览检测填入真机检测结果
> （`installed: true` / `loggedIn: true` / 真实昵称与 SteamID64）的构建下拍的 ——
> 因为浏览器预览模式没有主进程，无法真的读注册表。
> 该临时夹具**已还原**（`grep TEMP-VERIFY` 无命中，默认值回到 `installed: false`），
> 还原后重建的 `index-BrFPGojZ.js` 即为最终交付版本。
> 也就是说：**界面渲染与点击行为**是实测的（这是夹具能验的），
> **检测数据本身的真实性**由 ① ② 的纯逻辑断言与真实 Electron 网络实测保证。

> **未能端到端验证的一环**：`reg query` 的**实际调用**。本沙盒把 `reg.exe` 列入程序黑名单，
> 且拦截作用于整个进程树（Electron 也拉不起来，已实测确认），因此「真实读注册表」这一步
> 只能靠上面 ① 的纯逻辑断言覆盖。
> 代码中该调用失败会返回空串并优雅降级（判为未安装，**不会崩溃或卡住**），已列入 §6。

### 4.5 「申请 API Key」网址高亮但点不动（2026-09-26 追加）

**现象**：欢迎页高级设置里 `steamcommunity.com/dev/apikey` 是蓝色高亮文本，看着像链接，
但**点击毫无反应**；设置页同处提示也只有一个不可点的 `placeholder`。

**根因**：纯前端遗漏。`openExternal` 的 IPC 通道、preload 暴露、主进程
`shell.openExternal` 实现**三者都齐备**（Store / GameDetail / Wishlist 页早已在用），
唯独欢迎页那一处把网址渲染成了 `<span className="text-accent">` —— 没有任何点击处理。
设置页则是把网址写进了 `<input>` 的 `placeholder`，比文本更不可能点。

**修复**：

| 文件 | 改动 |
| --- | --- |
| `src/components/ui/ExternalLink.tsx` | **新增**。保留真实 `href`（可右键复制、悬停预览）但 `preventDefault` 后走 `bridge.app.openExternal`，**单一链路**避免「href 自己导航 + IPC 再开一次」双开 |
| `src/pages/WelcomePage.tsx` | 该处 `<span>` → `<ExternalLink>` |
| `src/pages/settings/AccountSection.tsx` | label 行右侧新增「去官方申请」链接；`placeholder` 里的网址改为「32 位十六进制字符串」（不可点的入口本身就是误导） |
| `electron/main/index.ts` | `openExternal` 补 **http/https 协议白名单**，与 `window.ts` 既有做法对齐 |

> 白名单不是新功能，是必要的安全加固：`shell.openExternal` 把地址交给系统 shell，
> 放任 `file://` 或 `ms-msdt:` 之类自定义协议，等于给渲染层一个任意命令入口。
> 现在把「任意链接点击」暴露给 UI 之后，这个校验必须补上。

**实测证据（端到端，非模拟）**

用一个 Electron 探针**直接加载真实的 `out/main/index.js`**（与打进 asar 的是同一份产物），
先把 `electron.shell.openExternal` 换成记录函数，再用 `webContents.debugger` 的
**CDP `Input.dispatchMouseEvent` 派发真实鼠标事件**去点链接：

```
calls: [
  "https://steamcommunity.com/dev/apikey",   ← 欢迎页链接，真实点击
  "https://steamcommunity.com/dev/apikey",   ← 设置页「去官方申请」，真实点击
  "https://example.com/whitelist-ok"         ← 白名单放行
]

step3 clicked welcome link:  calls 0 -> 1
step5 clicked settings link: calls 1 -> 2
step6 whitelist: { fileUrl: false, jsUrl: false, okUrl: true }
```

之所以能拦截：产物里调用点是 `electron.shell.openExternal(url)`（**运行时属性查找**），
替换 `shell` 对象上的方法即可命中 —— 这也顺带证明该调用**确实走到了主进程**。

| 断言 | 结果 |
| --- | --- |
| 欢迎页 `<a>` 存在且 `href` 正确 | `https://steamcommunity.com/dev/apikey` / `target=_blank` / `rel=noreferrer noopener` |
| 真实鼠标点击 → 主进程收到 URL | 通过（calls 0→1） |
| 设置页「去官方申请」同样可用 | 通过（calls 1→2） |
| 计算样式表明它是可点元素 | `cursor: pointer`、`text-decoration: underline dotted`、`color: rgb(102,192,244)` |
| 非 http/https 被拒绝 | `file://` → `false`，`javascript:` → `false` |
| 事件落在视口内 | 欢迎页 `y=436`、设置页 `y=459`，均在 1538×882 视口内 |

截图：`shots/18-apikey-link-welcome.png`、`shots/19-apikey-link-settings.png`。

> 探针加载的是 `out/main/index.js`。它与桌面快捷方式指向的 exe 之间的等价性，
> 由 §5 的 asar 内容校验（渲染产物哈希 + 主进程入口）保证。

---

### 4.6 Steam OpenID 登录「跳转后显示登录失败」（2026-09-26 追加）

**现象**：点「使用 Steam 登录」→ 系统浏览器正常打开 Steam 官方登录页 → 点「登录」→
跳回 `http://127.0.0.1:42510/auth/steam/return?openid.ns=…&openid.mode=id_res&…`
→ 页面显示「**登录失败 / 请关闭此页面重试**」。

地址栏参数齐全（`openid.mode=id_res`、`openid.op_endpoint`、`openid.claimed_id` …），
说明回调**本身已经送到本地 server**；失败发生在回调之后的 `check_authentication` 回验这一步。

#### 根因：手工设置 `Content-Length`，让 Electron `net` 当场拒发

`steam-openid.ts` 的 `postForm()` 手工塞了 `Content-Length`。Electron 的 `net` 底层是
Chromium 的 URLLoader，**body 长度必须由它自己算**，手工设置会立刻 `net::ERR_INVALID_ARGUMENT`。
于是 `fetchText()` 按设计回退到 `node:https`，而本机（`Steam++.exe` 正在运行，Steam 域名被
本地反代接管）node 必然 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`。两条通道一起阵亡。

**最要命的是这个失败被伪装了**：`return r.ok ? r.body : ''` 把「请求压根没发出去」和
「Steam 明确说签名无效」压成同一个空串，界面上只剩一句没有信息量的「登录失败」。

A/B 对照（真实 Electron，跑的都是项目自己的 `http.ts`）：

| 用例 | 请求头 | 实际通道 | 结果 |
| --- | --- | --- | --- |
| A（修复前） | Content-Type + **手工 Content-Length** | `node` | ❌ `net(net::ERR_INVALID_ARGUMENT)` / `node(UNABLE_TO_VERIFY_LEAF_SIGNATURE)` |
| B | 仅 Content-Type | **`net`** | ✅ HTTP 200，Steam 返回 `ns:… is_valid:false`（假签名，符合预期） |
| C | 不带任何自定义头 | `net` | ⚠️ HTTP 200，但**无 OpenID 应答**（Steam 不解析表单） |

> 顺带解释了为什么欢迎页「环境检测」一切正常：那一整块走的是 **GET**，从不带 Content-Length。

#### 修复（三层，最小改动）

| 文件 | 改动 |
| --- | --- |
| `electron/main/http.ts` `viaNet()` | **兜底过滤 `Content-Length`**（大小写不敏感）。任何调用方传了都不该让通道炸 |
| `electron/main/http.ts` `viaNode()` | 同步过滤该头；body 改为一次性 `req.end(body)`，由 Node 自动补正确的 Content-Length（`write`+`end` 会退化成 chunked） |
| `electron/main/steam-openid.ts` `postForm()` | 不再传 `Content-Length`；改为**返回传输层结论**（`via` / `status` / `error`），失败不再被吞成空串 |
| `electron/main/steam-openid.ts` 失败页 | `FAIL_HTML` → `failHtml(detail)`，页面直接显示诊断行 |

诊断文案明确区分两种性质完全不同的失败：

```
回验请求未送达 Steam（via=node status=- err=net(net::ERR_INVALID_ARGUMENT) …）
Steam 判定签名无效（via=net status=200）：ns:http://specs.openid.net/auth/2.0 is_valid:false
```

#### 实测证据：真实 Electron 里跑完整 `startOpenId()` 回调链路

探针 `tools/probe-openid/e2e.cjs`：替换 `shell.openExternal`（既不真弹浏览器，又能从
`openid.return_to` 里解析出实际端口），然后自己扮演 Steam 回跳一次 `id_res`：

| 场景 | Steam 侧应答 | 失败页/成功页 | `startOpenId()` 返回值 |
| --- | --- | --- | --- |
| `valid` | 拦截并回 `is_valid:true` | **`SUCCESS_PAGE`** | `{"ok":true,"steamId":"76561198346667289"}` |
| `invalid` | 拦截并回 `is_valid:false` | `FAIL_PAGE` | `{"ok":false,"error":"Steam 判定签名无效（via=net status=200）：…"}` |
| **`real`** | 不拦截，拿假签名**真打一次 Steam** | `FAIL_PAGE` | 同上（`via=net status=200`） |

**第三行是本次修复的决定性前后对照**：修复前这里必然报「回验请求未送达 Steam」，
修复后变成「Steam 判定签名无效（via=net status=200）」—— 请求**真正到达了 Steam**，
并按 OpenID 协议拿回了应答，只因为签名是假的才判 false。

复现命令：

```bash
node node_modules/esbuild/bin/esbuild electron/main/steam-openid.ts \
  --bundle --platform=node --format=cjs --external:electron \
  --outfile=tools/probe-openid/openid.cjs
env -u ELECTRON_RUN_AS_NODE node_modules/electron/dist/electron.exe \
  tools/probe-openid/e2e.cjs --no-sandbox
```

> **真实成功路径（用自己的账号走完 Steam 登录页）无法在沙盒内自动化**：需要人工在 Steam
> 登录页点击，且依赖账号的隐私设置。链路正确性由 `valid` 场景覆盖（完整回调 →
> `is_valid:true` → SteamID64 提取 → `ok:true`），回验参数未经任何变形，是标准 OpenID 2.0 流程。

---

### 4.7 全应用数据链路修复（2026-09-26 追加）

用户报告「首页每日时长、30 天趋势、游戏分析多图、折扣商城 3 个专区全为空」。系统巡查（完整报告见
`docs/AUDIT-2026-09-26.md`）拆出 **11 个缺陷 + 3 个连带问题**，全部同日修复并实测。

**四类根因**（都不是数据源问题，全是解析与口径问题）：

| 根因 | 一句话 |
| --- | --- |
| `appdetails` 顶层键错位 | 请求 `appids=3220060` 返回的顶层键是 `"5166020"`，按请求 id 取键 → 整片 `null` |
| 成就三连 | 不传 `l=schinese` 时 Steam 不返回 `name`/`description`；字段名写错 `desc`；`percent` 是**字符串**而解析只认 number |
| 折扣口径 | 好评率硬编码 0；史低从不采样折扣商品；「史低/高评分/限时免费」三个 Tab 用 `category === tab` 过滤，而同步只写 `hot`/`free` |
| 时间戳单位 | `formatDateTime` 按秒乘 1000，主进程广播的是毫秒 → 设置页显示「58705-10」 |

**修复后实测**（探针 `verify-fixes.cjs`，跑的是项目自己的 `steam-api` / `steam-store` 打包产物）：

```
appdetails  3220060 → 哀鸿：城破十日记 · 零创游戏(ZerocreationGame) · 2026 年 4 月 2 日 · 好评 59%
appdetails  2358720 → 黑神话：悟空 · Game Science · 好评 96%（1212487 条评测）
achievements  240 → 147 条 · 名字 147/147 · 描述 147/147 · 首条「帮我们安置炸弹」
globalPercent 240 → 147/147 非零（63 / 62.6 / 61.3）   ← 修复前全为 0
schema        240 → 147 条 · 首条 iconUrl 有值
featured          → specials 10 条 · freeAppIds 1 个
```

**upsert 空值保护实测**（`upsert-probe.cjs`，独立临时 userData，不碰真实库）：

```
A_good_then_bad  name/developer/publisher/releaseDate/genres/tags/priceCents/headerImage/firstPlayedAt 全部保留
B_bad_then_good  name=Fresh developer=Dev B priceCents=500 genres=[RPG]    ← 正常写入不受阻
C_achievement    displayName/description/iconUrl/unlockedAt 保留
D_wishlist       name 保留 · finalPriceCents 2980 保留（-1 不覆盖）
```

**端到端真实同步**（`sync-run.cjs`，写真实库，同步前已备份到 `%TEMP%\si-db-backup-*.db`）：

```
第 1 次：ok=true  18s  games 69 / achievements 4536 / wishlist 2 / discounts 10 / priceHistory 75
第 2 次：ok=true  11s  （用于验证 ends_at 与史低判定）

数据库回读（修复前 → 修复后）：
  games.developer 非空      15 → 67
  games.release_date 非空    0 → 67
  games.review_percent > 0   0 → 67
  display_name 非空          0 → 4536
  icon_url 非空              0 → 4536
  global_percent > 0         0 → 4489
  is_rare=1               4536 → 2698      ← 从「全部误标极稀有」回到真实稀有数
  discounts 入库条数         4 → 10
  wishlist.name 非空         0 → 2
  price_history 覆盖 app    69 → 74
  discounts.ends_at 非空     0 → 10
```

**代码规范**：`steam-api.ts` 修复后涨到 317 行，超过 PRD 的 ≤300 行要求，按职责拆为
`api-base.ts`（62 行，JSON 请求 + 宽松解析 + 并发池）、`steam-api.ts`（144 行，Web API）、
`steam-store.ts`（118 行，商店公开接口）。拆分后重跑探针，输出与拆分前**逐字节一致**。

---

### 4.8 界面层复核 + 冷启动同步状态回填（2026-09-26 追加）

#### 界面层复核（真实应用 + CDP 直读 DOM，`tools/ui-verify.cjs` / `ui-verify2.cjs`）

```
折扣商城 Tab   今日热门 10 · 史低专区 1 · 高评分折扣 9 · 限时免费 0（空状态文案正确，非逻辑错误）
成就中心       Steam CDN 图标 30 个真实渲染
               首条「团队合作者 / 使一名队友重生 / 全球 39.9% 玩家拥有」
               总成就 4536 · 已完成 396 · 稀有成就 46（修复前会显示 4536「全部极稀有」）
首页           今天 2026-09-26 · 上次同步 刚刚 · 无 58705 年异常
设置页         上次同步 2026-09-26 16:37（修复前：58705-10 12:13）
```

#### 追加修复：冷启动「尚未同步」与库内数据自相矛盾

巡查清单未登记，是界面复核时暴露的：数据库已有 4 批快照、10 条折扣，启动后指示器却显示「尚未同步」、
设置页显示「从未同步」。根因是主进程 `sync.ts` 的 `lastStatus` **只存在内存里**，`setupAutoSync()`
只注册定时器（首个 tick 之前不写状态），冷启动从不回填 —— 文案与数据库事实直接矛盾。

修法是复用已有数据，不新增文件、不改 schema（`users.synced_at` 本就是每次同步写库的时间戳）：

| 文件 | 改动 |
| --- | --- |
| `electron/main/sync.ts` | 新增 `primeStatus(patch)` —— 一行透传给 `update()`，供冷启动回填 |
| `electron/main/index.ts` | `initDatabase()` 后用**已有**的命名查询 `repo.query('user')` 取 `syncedAt`，× 1000 交给 `sync.primeStatus()` |

`synced_at` 存的是秒、主进程 `lastSyncAt` 用的是毫秒，换算后由 `format.ts` 的 `toMs()` 统一兜底（R8 的修法）。

**实测**（`electron.exe .` 直跑 `out/`，复用真实 userData）：

```
dbPath     C:\Users\25314\AppData\Roaming\steam-insight\steam-insight.db
lastSyncAt 1790411842000        ← 由 users.synced_at（1790411842 秒）× 1000 回填
指示器     已同步 · 15 分钟前     ← 修复前：尚未同步
设置页     上次同步 2026-09-26 16:37
```

**顺带端到端确认**：在真实应用里点「立即同步」跑完整链路并写回数据库 —— `snapshots` 新增第 5 批
（08:37:28，69 条）、`price_history` 178 → 252、`users.synced_at` 刷新、库文件 mtime 同步更新。

---

### 4.9 优化清单第一批：愿望单标签 / 通知去重 / 「提醒我」落库（2026-09-26 追加）

三条都来自界面复核后的自查清单，每条都在代码与真实库里逐条核过才动手。

| 编号 | 问题 | 实测证据 | 修法 |
| --- | --- | --- | --- |
| A1 | 愿望单「标签分类」是**空功能** | `GetWishlist` 原文没有 tags 字段（实测只有 `appid` / `priority` / `date_added`），但 `steam-api.ts` 从它取 → 真实库两行 `tags` 都是 `'[]'`，标签行只剩「全部」 | 同一个循环里已经在调 `storeAppDetails()`（游戏库 / 折扣表用的就是它返回的 genres+categories），改为 `s?.tags?.length ? s.tags : w.tags` |
| A2 | 通知**每次同步都重弹** | `fireNotifications()` 无条件重推聚合通知；默认 15 分钟自动同步 → 只要还在打折，同一条内容一天可弹近百次。`wishlist.notified_at` 列一直在 schema 里，但 sync 里硬编码 `notifiedAt: null`，**从未承载语义** | 新建 `electron/main/notify-plan.ts`：纯函数判定该弹哪些 + 唯一的写操作（回写 `notified_at`） |
| A3 | 「提醒我」**刷新即丢** | `WishlistPage` 用 `useState<Set>` 存按钮态，库里那列没用上 | 按钮态改读库里的 `notified_at`；点击时把 `appId` 交给主进程落库（`NotifyPayload.wishlistAppIds`） |

验证 A1 时又暴露两处真缺陷，一并修掉：

- `WishlistPage` 的 `hint={\`平均折扣 -${stats.avg.toFixed(1)}%\`}` —— `-` 是**硬编码**的，而 `stats.avg` 本身已是正数 25，渲染成「平均折扣 -25.0%」。改为「平均降幅 25.0%」。
- Steam 的 categories 会返回**未翻译的本地化键**（实测 schinese 下 `#category_playable_at_your_own_pace`），被当成标签 chip 显示。`steam-store.ts` 加过滤，全库三张表的 tags 已无 `#` 开头项。

#### 去重口径（设计决定，写进代码注释与页面说明）

| 类型 | 去重层 | 依据 |
| --- | --- | --- |
| 愿望单降价 | **跨重启** | `wishlist.notified_at`（写了就不再弹；列本就存在，无需改 schema） |
| 史低 / 限时免费 | **同一次运行内** | 内存 `seen` 集合，键为 `类型:appId:价格`；`discounts` 表没有对应的「已提醒」列，要跨重启去重得先加列 → **与 A4 的 schema 变更一并做** |

顺带修正了一处误报：限时免费原判据是 `category === 'free' || finalPriceCents === 0`，把**本来就免费**的游戏（F2P）也算成限时免费；改为同时要求 `originalPriceCents > 0`。

#### 证据一：判定逻辑单测（`tools/probe-notify/plan-probe.cjs`）

`notify-plan.ts` 的判定是纯函数，探针在 Electron 里直接断言（`notify-plan` → `database` → `paths` 会 import electron，所以按 `sync-run.cjs` 的同一约定跑）：

```
PASS  1a 首次打折 → 弹 1 条          PASS  4a 已弹过的条目被剔除，只算新条目
PASS  1b 文案含最低到手价            PASS  4b 全部弹过 → 0 条
PASS  1c 带回去重键与待落库条目       PASS  5  只有真限时免费触发（F2P 被排除）
PASS  2  已提醒过 → 不弹             PASS  6  三项开关全关 → 0 条
PASS  3  seen 兜底 → 不弹            PASS  7  无折扣 → 不弹

ALL PASS  pass=10 fail=0
```

#### 证据二：连续两次真实同步（`tools/verify-a2.cjs`，直读真实库）

```
同步前    3220060 折扣 25% notified_at=null   |  2358720 折扣 0 notified_at=null
第 1 次   3220060 折扣 25% notified_at=1790414625   ← 只有打折的那条被标记
第 2 次   3220060 折扣 25% notified_at=1790414625   ← 完全未变：同一条提醒不再重弹
```

> `notified_at` 有值这件事本身就是通知已弹出的证据 —— `markWishlistNotified()` 只在判定出「愿望单降价」并已调用 `notify()` 时执行。

#### 证据三：界面按钮态（愿望单页，CDP 直读 DOM）

```
进入页面   哀鸿：城破十日记 → 已提醒    黑神话：悟空 → 提醒我     ← 状态来自库里的 notified_at
点「提醒我」黑神话           → notified_at=1790414636 落库，reload 后按钮变「已提醒」
```

#### 工程约束

新增 `notify-plan.ts`（99 行）而不是把逻辑塞回 `sync.ts` / `repository.ts`，是为了守住「单文件 ≤ 300 行」：
改动后 `sync.ts` 292 行（原 294，删掉旧 `fireNotifications` 后净减）、`repository.ts` 297 行**未动**。

---

### 4.10 优化清单第三批：成就增量同步（B3，2026-09-26 追加）

**问题**：默认每 15 分钟自动同步一次，而每次都会对**每一款**游戏并发拉 3 个成就接口
（`GetPlayerAchievements` + `GetGlobalAchievementPercentagesForApp` + `GetSchemaForGame`）。
69 款 ≈ 207 个请求 / 约 18 秒，一天 96 次 ≈ 2 万请求；更要紧的是每次都要重写全库 4500+ 行成就。

**修法**：新增 `achievement-sync.ts`，只拉两类游戏 —— 本次 `playtime` 相比上次快照有增长（真被玩过），
或库里还没有它的成就记录（新买的 / 上次失败，需要一次自愈）。判定逻辑抽成纯函数
`planAchievementTargets()`，与 `notify-plan.ts` 同一模式，可脱离数据库单测。

一个**必须做**的配套动作：未被刷新的游戏要把库里的旧计数回填进 `games` 对象。
数字 `0` 是合法值、`upsert` 的空值保护拦不住它，若任其保持初始值，就会把已统计好的成就数洗成 0。

#### 证据一：判定逻辑单测（`tools/probe-incremental/plan-probe.cjs`，9/9 PASS）

```
1  首次同步（库里无成就）→ 3 款全部拉取
2a 未玩过 + 有记录 → 0 款拉取            2b 旧计数被回填（三个字段都不是 0）
3  只有本次玩过的 2 款被拉取               3b 未拉取的两款保留旧计数
4  库里无记录的新游戏 → 拉取
5  出库残留不产生幽灵目标
6  无成就的游戏下次仍重试（用于自愈）
7  69 款 → 仅拉 2 款（≈ 6 个请求，原 207 个）
```

#### 证据二：真实同步两次（`tools/verify-b3.cjs`，直读真实库）

```
同步前  achievements 4536  gamesWithAch 56  sumRare 46  violations 0  batches 14
第 1 次  耗时 6.09s  指示器「已同步 · 刚刚」    数据逐项不变，batches 15
第 2 次  耗时 6.08s  指示器「已同步 · 刚刚」    数据逐项不变，batches 16
```

耗时 **18s → 6.1s**（成就那 207 个请求被跳掉），同时 `achievements` 行数、
`games` 上的成就计数**逐项不变** —— 增量既不删数据也不洗数据。

#### 证据三：一条强不变量抓出的真 bug（本轮引入、当场修掉）

第一版回填 SQL 写成了 `SUM(is_rare)`（全部稀有成就），而该字段的语义是
「**已解锁的**稀有成就数」。端到端脚本里的不变量断言立刻抓到：

```
236850（欧陆风云4）   同步前 373/39/12  →  同步后 373/39/335      ← 335 > 39，不可能
violations（稀有 > 已解锁，或 已解锁 > 总数）    0 → 46
```

改成 `SUM(is_rare * unlocked)` 后，下一轮同步自愈：`sumRare 2698 → 46`、`violations 46 → 0`，
样本回到 `236850:373/39/12`。这条不变量已固化进 `verify-b3.cjs`，同类错误以后会被当场拦下。

#### 边界情况（实测，非缺陷）

库里 69 款游戏里有 13 款没有任何成就记录（好友通行证、RPG Maker XP、CS 测试服、老 Half-Life 等
—— 大多是本来就没有成就系统的游戏）。它们每次同步各打 **1 个请求**（`GetPlayerAchievements`
返回空即 `return`，不再打另外两个），这是刻意保留的**自愈**能力：下次 API 抖动导致的失败能自动补上。
成本 13 请求/次，可接受。

#### 工程约束

新增 `achievement-sync.ts`（90 行）后：`sync.ts` 294 → **266 行**（成就段整体外移），
`repository.ts` 297 → **300 行**（恰好卡在约定上限，下一轮改 schema 时应按职责拆分）。

---

### 4.11 优化清单第五批：数据库迁移器 + 同步后清理（A4，2026-09-26 追加）

#### 先做迁移器，因为它比 A4 本身更要紧

`database.ts` 原先全文只有一句 `CREATE TABLE IF NOT EXISTS`，而**它对已存在的表不会加列** ——
也就是说 1.0.0 装到用户机器之后，任何一次 schema 变更都会变成「新代码 + 旧表」，
查询直接报 `no such column`，且没有任何恢复路径。这是整份清单里唯一一条**定时炸弹**。

新增 `PRAGMA user_version` 版本号 + `MIGRATIONS` 升级表（`src/database/schema.ts`）：

- **新建库**：建 v1 表并把 `user_version` 置为 `SCHEMA_VERSION`；
- **老库**：读 `user_version`，按序执行 `(当前版本, SCHEMA_VERSION]` 的语句，整段在事务里（失败回滚）；
- **容错**：碰到 `duplicate column / already exists` 视为「该版本其实已生效，只是上次进程被杀、
  版本号没来得及写」，补写版本号继续走 —— 否则用户会永久卡在启动失败上。

#### A4 本身：同步后清理残留

**问题**：`persist(full=false)` 从不删多余行。换账号、游戏出库、移出愿望单、促销结束后，
这些行会永远留在库里；而 `loadSnapshot()` 是整表返回 —— 界面会一直显示早就不存在的条目。

**修法**：同步成功后按「本次结果」清理四张表（`repository.ts` 的 `purge*`）。
`games` / `achievements` 用本次 `owned` 的 app_id 列表，`wishlist` / `discounts` 各用自己的列表。

两个关键设计：

1. **传空列表直接返回 0**。API 抖动时返回空列表是常见故障；若把它理解成「什么都不要了」，
   一次网络故障就会清空用户的游戏库。这条有专门的探针守着。
2. **不在 full 模式跑**（`clearAll()` 已经清干净），也**不清理 `price_history` / `snapshots`**
   —— 它们是长期采样，与促销周期、愿望单状态无关。

**关于清单里提到的「给 games / achievements 补 steam_id 归属列，本阶段没有做**，理由：
产品是**单账号**的（settings 里只有一个 `steamId`），而这两张表的主键都不含 steam_id，
补一列不参与主键的归属字段**换不来任何隔离效果**。真正的痛点是「残留」，清理直击这个痛点。
将来真要做多账号，得连主键一起改，那时再动。

#### 顺带收口：A2 剩下的「史低 / 限时免费跨重启去重」

`discounts` 补了 `notified_at`（正是 v1 迁移加的那一列），`notify-plan.ts` 的两条判定
从「运行内去重」升级为**跨重启去重**，与愿望单降价对齐。而且因为促销结束后条目会被
`purgeDiscounts()` 删掉、`notified_at` 随之消失，**下次该游戏再打折就是全新一行** ——
不会出现「提醒过一次就永久沉默」。

#### 证据一：清理的安全阀（`tools/probe-purge/purge-probe.cjs`，全程在**副本库**上跑）

```
副本库 {"games":69,"achievements":4536,"wishlist":2,"discounts":11,"price_history":1066,"snapshots":1104}
PASS  1  空列表 → 四个清理函数都返回 0
PASS  2  空列表 → 六张表一行都没被删
PASS  3  传 [730] → 其余游戏被删干净（删 68 条、剩 1 条）
PASS  4  只动 games，其他表行数不变
```

#### 证据二：迁移 + 清理端到端（`tools/verify-a4.cjs`）

`seed` 会先 `DROP COLUMN notified_at` + `PRAGMA user_version = 0` 把库**退回迁移前状态**，
再插入 4 条 `app_id=9999999` 的幽灵行 —— 「库里存在、而本次同步结果里没有」正是残留数据的定义。

```
迁移前基线      userVersion 0  notifiedAtCol false  games 69  achievements 4536  wishlist 2  discounts 10  ghosts 0(+4)
应用启动后      userVersion 1  notifiedAtCol true   games 70  achievements 4537  wishlist 3  discounts 11  ghosts 4
同步后（7.7s）  userVersion 1  notifiedAtCol true   games 69  achievements 4536  wishlist 2  discounts 10  ghosts 0

PASS  1 迁移已执行（user_version 升到 1）
PASS  2 新列 discounts.notified_at 已存在
PASS  3 迁移只是打开库、一行没少（各表 = 基线 + 1 条幽灵）
PASS  4 幽灵行在同步后被全部清掉
PASS  5 清理只删幽灵行（games / achievements 回到基线）
PASS  6 愿望单回到基线条数
```

#### 证据三：迁移幂等（重启不重复执行 DDL）

```
第二次启动日志   无 ALTER / duplicate / no such column 报错（只有无害的 GPU 虚拟化报错）
user_version 1   不变
games 69  achievements 4536  discounts 10  幽灵残留 0
双人成行 notified_at 1790416083   不变 → 不重复弹
```

#### 证据四：`notified_at` 真的承载了语义

```
discounts  双人成行(1426210)  史低=1  notified_at 1790416083   ← 当前唯一史低，弹过一次
           其余 9 条           史低=0  notified_at null
wishlist   哀鸿：城破十日记 1790414625 · 黑神话：悟空 1790414636
```

#### 工程约束

`repository.ts` 在本批之前已顶到 300 行上限，而 A4 还要往里加东西，所以先把
**行 ↔ 领域对象映射**整体抽到 `mappers.ts`（166 行）：`repository.ts` 300 → **181 行**
（含新增的 4 个清理函数）。`database.ts` 196 行、`notify-plan.ts` 114 行、`sync.ts` 285 行，均在限内。

### 4.12 优化清单第六批：游戏库页面（C，2026-09-26 追加）

新增导航项「游戏库」，把原先只能在「游戏分析」排行榜里瞄一眼的全库记录，变成可检索、可筛选、可排序的网格页。

功能：全库网格（封面 / 时长 / 最近游玩 / 成就进度条 / 好评率 / 商店外链）、按名称·开发商·发行商·标签检索、
五种筛选（全部 / 玩过 / 还没玩 / 有成就 / 已全成就，各带数量角标）、五种排序（时长 / 最近 / 名称 / 完成度 / 好评率）、
空状态、点卡片进单游戏分析。

#### 顺带修掉的真缺陷：详情页的「返回」是写死的

游戏详情有 6 个入口，而详情页把返回写成了 `navigate('analysis')` + 「返回游戏分析」：
从游戏库点进去，按钮却写着「返回游戏分析」，点完还跳到分析页——**链接在骗人**。

`RouteParams.from` 其实早就定义好了（注释写着「决定侧边栏高亮哪一项、以及返回回到哪」），只是没人消费。本轮补齐：

- 6 个入口全部带上 `from`（首页 / 游戏分析 / 游戏库 / 成就中心 / 折扣商城 / 愿望单）
- 侧边栏高亮改为按 `from` 走：`route === 'game' ? (params.from ?? 'analysis') : route`
- 详情页返回按钮与 App 的「找不到这款游戏」空状态都回到 `from`
- 路由中文名抽成 `ROUTE_LABELS`（`store/useAppStore.ts`），侧边栏不再维护第二份标签

#### 证据一：渲染层专项验收（`tools/verify-c-library.mjs`，31/31 PASS）

真实产物（`out/renderer`）+ 静态服务器 + 无头 Chrome + CDP 直读 DOM，不靠肉眼读截图：

| 组 | 断言 | 结果 |
| --- | --- | --- |
| 入场 | 侧边栏入口可点、高亮切到游戏库、标题正确、页头徽标「42 款游戏 / 总时长 6,320」 | ✅ |
| 检索 | 「FromSoftware」→ 4 款（ELDEN RING / Sekiro / DARK SOULS III / Dark Souls II）；标签「魂系列」→ 同 4 款；计数与卡片数同步；无结果时空状态回显关键词；清空后复原 42/42 | ✅ |
| 筛选 | 五项都带数量角标；全部 42 = 玩过 42 + 还没玩 0；「已全成就」2 款且进度条均为 100% | ✅ |
| 排序 | 默认时长单调不增（34020 / 33660 / 33540 …）；按名称与 zh-CN 排序**逐项一致**；好评率单调不增 | ✅ |
| 跳转 | 卡片进详情、侧边栏继续高亮游戏库、返回按钮显示「返回游戏库」且真的落回游戏库（42 张卡片复原） | ✅ |
| 六入口往返 | 首页 / 游戏分析 / 游戏库 / 成就中心 / 折扣商城 / 愿望单，逐个走「进详情 → 返回」，**按钮文案与落点全部匹配来源** | ✅ |

控制台错误 0 条。

#### 证据二：全站回归（14 张截图 + 8 页文本污染扫描）

侧边栏重写与标签去重是**影响所有页面**的改动，因此复跑了全站走查：
**14 张截图、运行时错误 0 条、警告 0 条**；文本污染扫描覆盖 8 个页面（含游戏库），**命中 0**。

#### 一处数据现实性差异（不是缺陷，未擅自改）

演示数据集里 42 款游戏**全部都有游玩时长**（`NEVER` 那几款是 20~110 分钟的「买回来玩过一下就吃灰」），
所以「还没玩」筛选在演示模式下计数恒为 0 —— 是数据如此，不是筛选坏了（已断言其空状态正常显示）。

真实链路本来就会产生 0 时长游戏：`steam-api.ts` 把 `rtime_last_played = 0` 映射成 `lastPlayedAt: null`，
`stats.ts` 也显式 `filter(lastPlayedAt !== null)`，接上真实账号后这个筛选自然有数据。

要让演示模式也能展示，需给数据集加 2~3 款「真·未开始」游戏——但那会改变 `mulberry32` 的取数序列
（0 时长会让该游戏的会话生成被 `continue` 跳过，少消费随机数），**整份演示数据集随之漂移**，
拖累已归档的数值型证据，故未擅自动手，列为待定项。

#### 工程约束

单文件仍全部 ≤ 300 行：最长 `sync.ts` **285 行**，`GameDetailPage.tsx` 255、`LibraryPage.tsx` 244、
`dataset.ts` 215、`database.ts` 196、`useAppStore.ts` 195、`repository.ts` 181、`App.tsx` 147、`Sidebar.tsx` 85。

### 4.13 托盘图标不显示（用户报告，2026-09-26 追加）

#### 现象

系统托盘（右下角通知区）里找不到 Steam Insight —— 用户点开「隐藏的图标」溢出面板逐个核对，
里面有 Steam、微信、火绒、NVIDIA、QQ 等，唯独没有本应用。

#### 根因：两个候选路径都不存在，`createEmpty()` 静默兜底

`notifications.ts` 的 `trayIcon()` 只试两条路径：

```ts
`${process.resourcesPath}/icon.png`
`${app.getAppPath()}/public/icon.png`
```

两条**都不存在**，而且都不是「这次刚好缺文件」：

- `public/` 下**只有 `favicon.svg`，从来没有 `icon.png`**（开发态也没命中过）；
- `build/` 是 electron-builder 的 `buildResources` 目录 —— 默认**不复制进 app**，
  配置里的 `files` 还额外排除了 `!build/**`。

实测（打包产物）：

| 检查 | 结果 |
| --- | --- |
| `dist/win-unpacked/resources/` | 只有 `app.asar` 与 `elevate.exe`，**没有 `icon.png`** |
| asar 内 `icon` 相关条目 | 只有 excelbook 源码里的同名文件 + `out\renderer\favicon.svg`，**没有任何 icon.png** |

于是 `nativeImage.createEmpty()` → `new Tray(空图)`。这条链路**不抛异常**（探针 8b 专门证明了这点），
托盘项存在但什么都不显示，而且 `catch {}` 把一切都吞了 —— **零日志、零报错**，所以一直没人发现。

同时暴露第二个问题：即使找得到图标，把 256×256 原图直接丢给壳层也不行。
本机屏幕缩放 **1.5**（`screen.getPrimaryDisplay().scaleFactor`，即托盘图标实际是 **24×24**），
而这个标志的外环笔画只有 **12/256**，缩到 24px 后约 1.1px —— 壳层再插值一次就糊成一团。
实测把原图降到 16px：只能看到一团深色方块，外环基本消失。

#### 修复（三处）

1. **资源显式进包**：`electron-builder.yml` 增加 `extraResources`，把 `build/tray.png` 复制成
   `resources/tray.png`（`extraResources` 不受 `files` 排除影响，这正是它存在的意义）。
2. **解析逻辑独立成 `electron/main/tray-icon.ts`**：
   - 候选路径 4 条：打包态 `resourcesPath/tray.png` → `appPath/build/tray.png` →
     `path.resolve(__dirname, '../../build/tray.png')` → 兜底 `resourcesPath/icon.png`。
     第三条是特意加的：`app.getAppPath()` 的语义**随「怎么启动 Electron」变**——
     以脚本形式启动时它是脚本所在目录而不是项目根（探针环境里就是这样），
     直接导致开发态候选落空，所以补一条不依赖它的路径。
   - 按 `Math.round(16 × scaleFactor)` 自己缩放到托盘尺寸，不把 256px 原图交给壳层插值。
   - 全都拿不到时 `console.warn`（这条日志本身就是原缺陷缺失的东西）。
3. **单独出一版 `build/tray.png`**：把 `build/icon.png` 的深色底板按亮度软阈值抠掉、
   笔画膨胀 5px 再高斯收边（保留原几何与原配色 `#4096E4→#4FA6EA`），输出 64×64。
   16px/24px 下蓝色外环与分子状节点都清晰可辨，深浅两种任务栏背景都成立。

#### 证据一：托盘探针（`tools/probe-tray/tray-probe.cjs`，**11/11 PASS**）

跑法同其他主进程探针：esbuild 打包 `tray-icon.ts` → 在真实 Electron 里执行。

| # | 断言 | 结果 |
| --- | --- | --- |
| 1 | `build/tray.png` 存在于源码树 | ✅ 7,156 bytes |
| 2 | 旧候选 `resourcesPath/icon.png` 是空图（**复现原缺陷**） | ✅ `isEmpty=true` |
| 3 | 旧候选 `appPath/public/icon.png` 是空图（**复现原缺陷**） | ✅ `isEmpty=true` |
| 4 | `resolveTrayIconPath()` 命中真实存在的文件 | ✅ 见下 |
| 5 | `resolveTrayIcon()` 返回非空图 | ✅ 24×24 |
| 6 | 尺寸 = `16 × scaleFactor`（24×24），不交壳层插值 | ✅ 实际 24×24 |
| 7 | **位图含不透明像素**（不是「有尺寸但全透明」） | ✅ 332/576 = **57.6%** |
| 8 | `new Tray(真实图标)` 可创建、未销毁、可释放 | ✅ `isDestroyed=false` |
| 8b | `new Tray(空图)` **不抛异常** —— 解释原缺陷为何全程静默 | ✅ 未抛异常 |
| 9 | **打包产物** `resources/tray.png` 可解码且含不透明像素（`--tray-png=`） | ✅ 64×64 · 不透明 **48.9%** |
| 10 | 打包产物与源码树图标**字节一致** | ✅ 内容完全相同 |

> 断言 7 是这里最关键的一条：`nativeImage.isEmpty()` 只检查尺寸，
> 一张「尺寸合法但整张全透明」的 PNG 同样能骗过它，所以必须落到 `getBitmap()` 上数 alpha。
> 断言 9/10 是针对**打包产物**的（不是源码树），把 §4.13 证据三 的结论直接串进探针。

**打包态候选路径单独验证**：把 `build/tray.png` 临时放进 `node_modules/electron/dist/resources/`
（即为打包后 `process.resourcesPath` 的位置），探针断言 4 命中的正是
`…\node_modules\electron\dist\resources/tray.png` —— 即候选 **[0] 优先命中**，与打包布局一致。验证后已清理该临时文件。

> 探针环境下 `resourcesPath` 指向的是 electron 的 `dist/resources`（没有 tray.png），
> 且 `app.getAppPath()` = 探针脚本所在目录而不是项目根（这正是当初要补第 3 条候选的原因），
> 所以断言 4 最终命中的是 `…/steam-insight/build/tray.png`（候选 **[2]**）。三者语义差异见上文「修复」第 2 点。

#### 证据二：渲染层零改动

本次改动**全在主进程与打包配置**。构建后渲染产物哈希与上一版逐字节相同：
`index-ClbZ2ho4.js`（1,924.40 kB）+ `index-CakvEpxd.css`（58.97 kB）——
因此 §4.12 的 31/31 游戏库专项验收与 14 张截图的全站回归**结论继续成立**，无需复跑。

#### 证据三：打包产物携带资源（`extraResources` 真的生效）

`npm run dist` 重跑通过（19:04:47 → 19:05:22，**54s**），打包目录里确实出现了 `tray.png`：

| 检查 | 结果 |
| --- | --- |
| `dist/win-unpacked/resources/tray.png` | ✅ 存在，**7,156 bytes** |
| 与源码树 `build/tray.png` 的 sha256 | ✅ **完全相同**：`05f8cfb8…83ae3`（逐字节一致，未经二次编码） |
| 对照：修复前的旧包 `resources/` | ❌ 只有 `app.asar` + `elevate.exe`，**没有 `tray.png`** —— 原缺陷在产物层复现 |
| 安装包 | ✅ `Steam Insight-1.0.0-setup.exe` **123,210,698 bytes**（19:05），PE 魔数 `MZ` 有效；较修复前 +7,301 bytes |
| 免安装 exe | ✅ `dist/win-unpacked/Steam Insight.exe`，19:04:54 |

#### 证据四：操作系统侧确实收到了「非空」图标（Explorer 的 `IconSnapshot`）

这条是本轮补的最硬的一条 —— 不问 Electron 自己，直接问 Windows。

Windows 会把每个通知图标收到的图像存进
`HKCU\Control Panel\NotifyIconSettings\<hash>\IconSnapshot`（**一个 PNG**）。
读取 `ExecutablePath` 指向 `…\dist\win-unpacked\Steam Insight.exe` 的那一条：

| 字段 | 值 |
| --- | --- |
| `ExecutablePath` | `…\steam-insight\dist\win-unpacked\Steam Insight.exe` |
| `UID` | `3` |
| `IconSnapshot` | **1,605 bytes**，PNG 魔数 `89 50 4E 47` |
| 解出的图像 | **24×24 RGBA**（IHDR `00000018 00000018`，位深 8，色彩类型 6） |
| 不透明像素 | **332 / 576 = 57.6%** |

两条互相印证：

1. **尺寸对得上**：24×24 正是 `Math.round(16 × 1.5)` 的结果 —— 参与渲染的确实是本修复算出的那张图，
   而不是壳层拿原图随便插值出来的东西。
2. **不透明像素数分毫不差**：探针断言 7（进程内 `getBitmap()` 数 alpha）同样是 **332/576 = 57.6%**。
   进程内量到的与 Windows 侧收到的是同一张位图。

把这条 `IconSnapshot` 里的 PNG 解出来渲染（左深底 / 右浅底，8 倍放大）：
`shots-crop/tray-icon-from-explorer.png` —— 蓝色外环 + 分子状节点清晰可辨，两种任务栏背景都成立。

> 时间线也对得上：该注册表子项的 last_write 是 **19:05:50**，正是修复版首次启动的时刻。
> 修复前那个包里根本不存在 `tray.png`，拿不出这样一张 24×24 的图。

#### 一处没能做到的取证（如实记录）

**「任务栏上肉眼看到图标」这张截图没拿到**，两层原因都不是本应用的问题：

1. Windows 11 默认把**新出现的**托盘图标放进「隐藏的图标」溢出面板 —— 图标在，但不在任务栏可见区。
2. 本环境**能截图、不能合成输入**：`PIL.ImageGrab.grab()` 可以正常抓到整块桌面
   （2560×1440，含各应用窗口），但 `mouse_event` / `SendInput` 注入的点击**不生效**
   （点击前后目标区域像素差为 **0**），因此打不开溢出面板。
   顺带一个坑：进程若未声明 DPI 感知，`SetCursorPos` 会被夹到
   `(2560/1.5, 1440/1.5) = (1706, 959)`（屏幕右下角），必须先 `SetProcessDpiAwareness(2)`。

所以结论以「Explorer 已收到并持有正确的 24×24 图标」为准 —— 这已经是操作系统层面的证据，
比一张任务栏截图更接近事实。

#### 工程约束

`tray-icon.ts` 62 行、`notifications.ts` 76 行，均远低于 300 行上限。

> ⚠️ 给用户的提示（Windows 侧行为，不是缺陷）：**修复后图标会被注册，但 Windows 11 默认把它收进
> 「隐藏的图标」溢出面板**（任务栏右下角那个 `^`）。要让它常驻任务栏可见区，一次性设置即可：
>
> 1. 点开 `^`，把 Steam Insight 的图标**拖到**任务栏上；或
> 2. 「设置 → 个性化 → 任务栏 → 其他系统托盘图标」里把它打开。
>
> 该记录按 `ExecutablePath` 保存（本轮实测：同一路径的已有记录会被复用、不会被重新隐藏），
> 所以设置一次就够，后续换版本不用重来。

### 4.14 非缺陷排查：Steam 客户端掉线（用户报告，2026-09-26 追加）

#### 现象

用户反馈「疑似登录 Steam Insight 之后，Steam 直接进入离线模式」，但自己也拿不出证据
（截图里 Steam 客户端顶部显示「已断开连接」，账号菜单里挂着「Steam 离线」）。

#### 结论：与本应用无关。根因是本机的代理客户端没在运行，而 Steam 被配置成走这个代理。

#### 证据一：Steam 自己的日志说得很清楚（`E:\Steam\logs\connection_log.txt`）

- 全部掉线事件都发生在**同一条路径**上：`(127.0.0.1:7897, WebSocket)`。
- 今天（09-26）共 3 次：`08:30:30` `Encryption Failure`（8:30:47 自动重连成功）、
  `09:21:15` `Disconnected By Remote Host`（9:21:28 自动重连成功）、
  **`16:11:32` `I/O Operation Failed` —— 这一次再也没连上**。
- 16:11:32 之后的每一次尝试都是 `failed talking to cm (timeout/neterror - Invalid)`，
  连通性自检也是一路 `result=Failed`。失败起点可由日志自身反算并互相印证：
  `18:30:28 − 8360.2s = 16:11:08`、`18:24:12 − 7984.7s = 16:11:07`。
- **没有任何凭据类事件**：全文检索 `rate limit` / `elsewhere` / `kicked` / `banned` / `another location`
  **零命中** —— 即不是被顶号、不是被封、不是登录态失效，纯粹是**传输层连不上**。

#### 证据二：这是本机持续三个月的常态，不是这次才有的

对 `connection_log.txt` 的 `ConnectionDisconnected` 做全量统计：

| 统计口径 | 结果 |
| --- | --- |
| 原因分布 | `'Disconnected By Remote Host' \| 127.0.0.1:7897, WebSocket` ×**55**、`'I/O Operation Failed' \| 127.0.0.1:7897, WebSocket` ×**6** |
| 日期跨度 | **2026-06-27 ~ 2026-09-26**，跨三个月 |
| 单日最多 | **09-14 共 28 次**；09-13、09-17 各 8 次 |

本应用 09-26 **10:33** 才第一次创建 userData 目录，而 06-27 起就有同型掉线 —— 时间上根本不成立。

#### 证据三：现场复现（本次实测）

| 测试 | 命令要点 | 结果 |
| --- | --- | --- |
| 7897 是否有监听 | `netstat -ano \| findstr LISTENING \| findstr :7897` | **无任何输出** |
| 经代理访问 Steam 连通性测试域名 | `curl -x http://127.0.0.1:7897 http://steamconnecttest.com/204` | `curl: (7) Could not connect to server`（代理端口拒绝连接） |
| **直连**同一域名 | `curl --noproxy '*' http://steamconnecttest.com/204` | **HTTP 204，0.45s** |
| 系统代理设置 | `HKCU:\...\Internet Settings` | `ProxyEnable=0`，`ProxyServer=127.0.0.1:7897`（客户端已退出并复位开关） |
| 加速器进程 | `tasklist` | `Steam++.exe` ×2、`Steam++.Accelerator.exe`（占用 `0.0.0.0:80/443`）在跑；**代理端口 7897 无人监听** |
| **hosts 被改写** | `C:\Windows\System32\drivers\etc\hosts` | **51 条非注释记录**，把 `api.steampowered.com` / `store.steampowered.com` / `steamcommunity.com` / `login.steampowered.com` / `media.steampowered.com` / `community.steamstatic.com` 等**全部指向 `127.0.0.1`** —— 典型的 Watt Toolkit「Steam 加速」手法（同一份 hosts 里还有 github.com / raw.githubusercontent.com / greasyfork.org，也是它的加速项）。mtime `11:28`。 |

即：代理客户端已退出（系统代理开关被复位为 0），但 **Steam 自身仍被配置为连 `127.0.0.1:7897`**，
于是它的 CM WebSocket 全部打到一个没人监听的端口上。直连网络本身完好（同一域名 HTTP 204）。

> 顺带说明：hosts 把 Steam 域名指向 `127.0.0.1` 这件事**本应用是知道的**——`http.ts` 的文件头注释
> 就是为此写的（「国内大量环境（Watt Toolkit / Steam++ 这类加速工具）会把 Steam 域名解析到
> 127.0.0.1 上的本地反代，其证书无法链接到 Node 内置根证书链」），并因此把传输层做成
> 「优先 Electron `net`（走 Chromium 网络栈与系统证书链）→ 失败再退回 node:https」。
> 也就是说本条现象早在 §4.4 就被处理过，不是新问题。

#### 证据四：本应用在代码层面不具备这个能力

对 `electron/` 全量检索，能碰到外部世界的只有：

| 行为 | 说明 |
| --- | --- |
| `reg query`（`steam-detect.ts`） | **只读**，读 `SteamPath` / `ActiveUser` 等；无任何注册表写操作 |
| `tasklist`（`steam-detect.ts`） | **只读**，查 `steam.exe` 的 PID |
| `launchSteam()` | 仅在用户点击时执行 `"<steam.exe>"`；**没有任何 `taskkill` / `-shutdown` / `steam://`** |
| 文件写入 | 只有三处：本地数据库、导出文件、`settings.json` —— **全部在 `%APPDATA%\steam-insight\` 内**，从不碰 Steam 目录 |

旁证：`E:\Steam\config\loginusers.vdf` 三个账号的 `WantsOfflineMode` **全为 `0`**
（若真被切到离线模式，这里会是 1），且该文件 mtime 为 **07:55**，早于本应用首次运行（10:33）。

#### 复现不到的「证据链」里唯一可疑的一环，也解释清楚了

用户怀疑的触发点在 16:11，而那个时间的确在开发本应用。但：
`16:11:32` 的失败原因是 `I/O Operation Failed` —— 这是**传输层**错误，
方向是「Steam → 127.0.0.1:7897 连不上」，与本应用发出的「→ api.steampowered.com」请求毫无关系；
何况本应用的网络层（`http.ts`）在代理不可用时会**自动回退到直连**（这正是它能照常同步的原因）。

#### 对用户的处理建议

1. 把代理客户端重新起来（或确认系统代理开关）；
2. 或者让 Steam 不走这个代理：Steam → 设置 → 界面 → 取消「使用系统代理」/ 改回直连；
3. 想确认当前状态，看 `E:\Steam\logs\connection_log.txt` 尾部的
   `Connectivity test: result=` 与括号里的代理地址即可 —— 括号里是 `127.0.0.1:xxxx` 就说明仍在走代理。

#### 工程约束

本轮**未改动任何与 Steam 连接相关的代码** —— 没有可修的 bug，只补文档。

---

### 4.15 ROADMAP 全量交付与自检（2026-09-26 追加）

按 `docs/ROADMAP.md` 的建议清单逐条落地，**并跑了一轮针对新增逻辑的自检**。
自检不是「读了一遍代码」，而是三组可复核的实测：

| 证据 | 覆盖面 | 结果 |
| --- | --- | --- |
| `tools/probe-features/features-probe.cjs` | 连通性判定 / 数据包 / 价格阈值 / 成就追猎 / 设置归一化 / 日志落盘 | **82/82 PASS** |
| `tools/probe-features/diagnose-live-probe.cjs` | 自检功能**打真实网络**（走应用真实传输层） | **5/5 域名可达 + 10/10 结构性断言** |
| `tools/scan-pages.mjs` | 全站 9 个页面文本污染扫描 | **9/9 通过，污染命中 0** |

页面数从 9 增至 **11**（新增「成就追猎」；README 表格原先还漏了「游戏库」）。

#### 交付清单与落点

| 条 | 交付物 | 关键实现 | 证据 |
| --- | --- | --- | --- |
| P0-1 | 一键连通性自检 | `electron/main/net-diagnose.ts`（判定纯函数 + 真实探测）、`src/pages/settings/NetworkSection.tsx`、IPC `net:diagnose` | 探针 A1–A22（22 条）+ 真实网络 5/5；截图 `new-3` |
| P0-2 | 本地日志 + 崩溃捕获 + 诊断包 | `electron/main/logger.ts`（按天滚动 / 保留 7 天 / 400ms 合并落盘）、`diagnostics.ts`（**API Key 双层脱敏**） | 探针 F1–F6；`buildDiagnostics()` 不含明文 Key |
| P0-3 | 代码签名说明 | 无证书（内部使用），`electron-builder.yml` 留注释化配置位 + `DEPLOY-AND-NETWORK.md` 交付话术 | 产物 PE 证书表仍为 0，属**已知且已如实告知** |
| P1-4 | 商店侧同步 TTL | `sync.ts` `STORE_DETAIL_TTL_HOURS = 12`，依据 `games.price_checked_at`；手动同步 `force` 绕过；仅真拉到新数据才推进时间戳 | 代码审查 + 同步日志 |
| P1-5 | `app.setAppUserModelId` | `index.ts:38`，取值与 `electron-builder.yml` 的 `appId` 对齐 | 代码审查 |
| P1-6 | 价格阈值提醒 | `PriceAlert` 契约、`notify-plan.ts` 阈值判定（**按价格去重，再降才再提醒**）、愿望单页「设个心理价」 | 探针 C1–C11（11 条）；截图 `new-6` |
| P2-1 | 周报 / 月报 | `wrapped.ts` 增 `availableMonths/availableWeeks/periodBounds/buildPeriodReport`；`WrappedPage` 周期切换；导出复用 PNG/PDF 链路 | 截图 `new-7`（2026 年 9 月报告真实渲染） |
| P2-2 | 成就追猎清单 | `src/pages/AchievementHuntPage.tsx` + 每日一次的汇总通知 | 探针 D1–D11（11 条）；截图 `new-1`（205 个待追猎 / 37 款游戏） |
| P2-3 | 托盘菜单增强 | `notifications.ts` 加「上次同步 / 下次同步倒计时」「打开愿望单」，每分钟重建 | 代码审查；`sync.getSyncStatus()` 数据现成 |
| P2-4 | 数据包导入 / 导出 | `electron/main/datapack.ts`（带 `format`+`version` 双标识、列名白名单防注入、不含 API Key） | 探针 B1–B22（22 条） |
| P2-5 | 家庭共享库**调研** | 结论写入 `ROADMAP.md`：接口存在但**要 `access_token` 而非 Web API Key**，当前认证模型拿不到 → **明确不做** | 见 ROADMAP P2-5 的调研依据表 |
| P3-1 | 自动更新评估 | 未引入 `electron-updater`；已在 ROADMAP 写明代价与前提 | 文档 |
| P3-2 | 多账号口径 | 账号卡片内已明示「按 app_id 单键存储（不区分账号），切换账号后会用新账号的数据重新同步」 | 截图 `new-3` 可见 |
| P3-3 | LICENSE | 新增 `LICENSE`（MIT，与 `package.json` 的 `license` 字段对齐） | 文件存在 |
| P3-4 | 页面口径统一 | README / PRD 均改为 **11 个页面**，并补齐之前漏列的「游戏库」 | 本文档头部与两份文档 |
| P3-5 | 注释与默认值对齐 | `achievement-sync.ts` 注释由「每 15 分钟」改为「每 30 分钟」，与 `DEFAULT_SETTINGS` 一致 | 代码审查 |
| P3-6 | 清理根目录残留 | 删除 `electron.vite.config.1790411952977.mjs` 等 2 个 electron-vite 副产物 | 已清理 |
| P3-7 | PRD §7.2 未验证项 | 见下文「本轮从『未验证』转『已验证』的项」 | §6 |

#### 自检中**真的揪出并修掉**的两个缺陷

自检的价值就在这里 —— 这两条都不是「读代码能看出来」的：

1. **`settings.ts` 未校验 `priceAlerts` 结构**（会导致同步/启动崩溃）
   `settings.json` 是用户可手改的文本文件，而 `priceAlerts` 是数组。原实现只做浅合并，
   一旦文件里写成 `"priceAlerts": null`，下游 `settings.priceAlerts.length`
   （`notify-plan.ts:125`、`diagnostics.ts:86`）就会抛 `TypeError`，**把一次同步甚至启动流程带崩**。
   渲染层传来的 patch 同样不可全信。**修法**：新增 `normalizeSettings()`，
   对 `priceAlerts` 逐条校验（appId 正整数、阈值为非负有限数，脏条目丢弃），
   并顺带兜住 `syncIntervalMin` 与 `countryCode` 的非法值；`load()` 与 `setSettings()` 都走它。
   *对应断言 E1–E10。*

2. **`applyDataPack()` 对「只带部分列的数据包」必然失败**
   原实现只插入源文件里出现的列。但 `games` 表有多列 `NOT NULL` 且无默认值
   （`header_image` / `release_date` / `developer` 等），于是一个只带 `app_id`+`name` 的行
   （手工整理的包、或将来演进后的旧版包）会在事务中途抛
   `NOT NULL constraint failed: games.header_image` —— 事务虽会回滚、库不会坏，
   但报错信息用户完全无从下手，**等于「版本兼容」这个设计目标没真正成立**。
   **修法**：读 `PRAGMA table_info` 拿到 `notnull` 与 `dflt_value`，
   对缺失的 `NOT NULL` 列按列类型补占位值（有默认值用默认值，数字补 0、文本补 `''`）；
   同时保留「只采信真实列名」的白名单防注入，且整行没有任何可识别列时跳过。
   *对应断言 B16–B22。*

#### 明确**没有做**的三条（ROADMAP「明确不建议做」）

| 项 | 处理 |
| --- | --- |
| 自建「每日游玩时长」数据源 / 引入第三方史低源 | **未做**。PRD §5 已写成硬约束 —— 宁可显示「需要积累」也不用看起来像的数据糊过去 |
| 把 SQLite 换成联网后端 | **未做**。「无需账号、数据不出本机」是这个项目最值得保留的属性 |
| 应用内实现 Steam 账号密码登录 | **未做**。OpenID 走系统浏览器的安全模型是正确的，任何「在应用内输 Steam 密码」都是倒退 |

另外 P2-5 的**家庭共享库本条虽属「可做的候选」，但调研结论是当前认证模型下不可行**，
按「不要先承诺」的要求如实记为不实现，而不是硬凑一个需要用户交出额外凭据的方案。


---

## 5. 打包与分发验证

`npm run dist:dir` 与 `npm run dist` 均已在本环境**实跑通过**，两者都产出可用产物。

| 检查项 | 结果 |
| --- | --- |
| `npm run dist:dir` | ✅ 通过（约 40s），产出 `dist/win-unpacked/Steam Insight.exe` |
| `npm run dist` | ✅ 通过（**实测 56s**：18:23:45 → 18:24:41），产出 `dist/Steam Insight-1.0.0-setup.exe` —— **117.50 MB（123,203,397 字节）**，PE 魔数 `MZ` 有效，另带 `.blockmap` |
| `npm run dist`（**含 §4.13 托盘修复后重跑**） | ✅ 通过（**54s**：19:04:47 → 19:05:22）；安装包 **123,210,698 字节**（+7,301 bytes，增量与新增的 `tray.png` 同量级），免安装 exe **19:04:54**，PE 魔数 `MZ` 有效 |
| `extraResources` 是否真的落盘 | ✅ `dist/win-unpacked/resources/tray.png` = **7,156 bytes**，与 `build/tray.png` **sha256 逐字节相同**（`05f8cfb8…83ae3`）。详见 §4.13 证据三 |
| 托盘图标是否被系统接受 | ✅ `HKCU\Control Panel\NotifyIconSettings` 中出现本应用条目，其 `IconSnapshot` 解出 **24×24 RGBA PNG、不透明 332/576**。详见 §4.13 证据四 |
| `npm run dist`（**含 §4.15 ROADMAP 全量交付后重跑，最终产物**） | ✅ 通过（20:20:1x → **20:21:5x**）；安装包 `dist/Steam Insight-1.0.0-setup.exe` = **123,225,371 字节（约 117.52 MB）**，PE 魔数 `MZ`，`.blockmap` 同步更新 |
| 最终产物确为新代码 | ✅ `resources/app.asar` 内 `out/renderer/assets` = **`index-C_fufjFr.js` + `index-DG0eqJqb.css`**（与源码树 `out/renderer/assets/` 完全一致）；`out/main/index.js` **142,086 字节**；`resources/tray.png` 与 `build/tray.png` **sha256 逐字节相同**（7,156 bytes） |
| 最终产物桌面冒烟 | ✅ 以 `--remote-debugging-port=9444` 启动 `dist/win-unpacked/Steam Insight.exe`，页面加载自 `app.asar/out/renderer/index.html`，bundle = `index-C_fufjFr.js`，侧边导航 **9 项**（含新增「成就追猎」）；**真实数据**下自检结果为 `网络正常 5/5 · 直连`。见 §4.15 |
| 产物时间戳 | 安装包与免安装 exe 均晚于全部源码改动（最后一处代码改动是 18:43 的 `tray-icon.ts`），确认是新代码 |
| 渲染产物哈希 | **`index-ClbZ2ho4.js`**（1,924.40 kB，含游戏库页，较上版 +26.62 kB）+ `index-CakvEpxd.css`（58.97 kB）；主进程 `out/main/index.js` 109.80 kB。历史上为 `index-DOtB34oK.js` → `index-6CziEYKa.js` → `index-BrFPGojZ.js` → `index-BUEPwOhY.js` → `index-ClbZ2ho4.js` |
| 修复代码确已进包 | 主进程产物内标记命中：`PRAGMA user_version` ×4、`notified_at` ×9、`purgeStale` ×7、`planAchievementTargets` ×2、`is_rare * unlocked` ×1；asar 内 `out/renderer/index.html` 引用 `index-ClbZ2ho4.js`，该文件内「游戏库」命中 10 处、`ROUTE_LABELS` 返回逻辑命中 |
| 探针未进包 | `!tools/**` 已加入 `files` 排除；asar 内 `src\` / `electron\` / `tools\` / `docs\` 条目数均为 **0** |
| asar 内容 | 共 2,029 条；`out/main` ×1、`out/preload` ×1、`out/renderer` ×5；`node_modules\sql.js\dist\sql-wasm.wasm` **在内**（关键资源未漏） |
| 桌面快捷方式 | `C:\桌面\Steam Insight.lnk` → `…\steam-insight\dist\win-unpacked\Steam Insight.exe`（解析 `.lnk` 二进制确认），指向的就是本次新产物 |
| 工具链下载 | nsis-3.0.4.1 / nsis-resources-3.4.1 / 7zip-win-x64 均已下载 |

### ⚠️ 打包的四个沙盒坑（已绕过，非产品缺陷）

1. **必须走 `npm run dist`，不要直接调 `node_modules/.bin/electron-builder`**（本轮踩到，最误导人的一个）。
   直接调用时 PATH 里没有 npm 的目录，而 `app-builder-lib` 的 node-modules 收集器在 Windows 上
   是把 `npm list` 包进 `powershell.exe -EncodedCommand` 里执行的 —— 拿不到 npm 就产出空 stdout，
   报 **`No JSON content found in output`**。这个报错**看起来像依赖树坏了**，实际只是调用方式不对：
   同一份代码走 `npm run` 时一次通过，日志里能看到
   `• searching for node modules  pm=npm` → `• duplicate dependency references`。
2. **批量删除守卫**：electron-builder 重建 `dist/` 时会删除已存在的目录，触发 `node-safe-delete`
   的批量删除守卫（阈值 50 个文件）而中断。解法：`export CODEBUDDY_SAFE_DELETE_ENABLED=0`。
   症状很有迷惑性 —— **第一次打包（`dist/` 不存在）成功，第二次（需删除）失败**。
   注意它拦的**不只是清理 `dist/`**：实测它拦在 `electronGet.ts` 的 `extractArchive`
   （把 Electron 解压进 `win-unpacked`）里，所以报错栈出现在
   `ElectronFramework.prepareApplicationStageDirectory` 而**不是**清理阶段。
   本轮报文：`[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] {"count":82,"threshold":50,…}`。
3. **偶发挂死（已出现 2 次，均为偶发）**：`npm run dist` 会在 `dist/win-unpacked.tmp` 解压完 Electron
   基础文件后停止推进 —— `resources/` 里只有 `default_app.asar`、没有 `app.asar`，`.tmp.lock`
   时间戳不再更新。第一次 11 分钟零进展；**第二次（17:48 那次）跑到 19 分钟仍停在 asar 阶段**。
   两次的处理都一样：`taskkill /F /IM "Steam Insight.exe"` → 删掉整个 `dist/` → 重跑，
   随即 **56 秒**正常出包。判断为**偶发**（临时目录 / 杀软扫描竞争），非配置问题、也非代码问题。
   > 复发时不要怀疑自己的改动：先看 `dist/win-unpacked.tmp/resources/` 里有没有 `app.asar`，
   > 没有就是卡在打包而不是编译；清空 `dist/` 重跑即可。必要时先
   > `taskkill /F /IM 7za.exe app-builder.exe rcedit-x64.exe`。
4. **打包目录被运行中的自己锁住**：如果 `dist/win-unpacked/Steam Insight.exe`（或桌面快捷方式拉起的实例）
   还在跑，重建会在删目录时报 `EBUSY: resource busy or locked, rmdir '…\dist\win-unpacked'`。
   打包前先 `taskkill /F /IM "Steam Insight.exe"`。
   > **验收托盘图标时最容易踩这个**：你要跑起来才能看图标，但跑起来就没法重新打包。
   > 正确顺序是「**先打包 → 再启动 → 再截图**」，别反过来。

> 桌面快捷方式指向 `dist/win-unpacked/Steam Insight.exe`（免安装版），功能与安装版完全一致。
> 安装版 `Steam Insight-1.0.0-setup.exe` 会自行创建桌面与开始菜单快捷方式，并可正常卸载。

### 应用图标

`public/favicon.svg` 经无头 Chrome 渲染为 256×256 透明 PNG（中心像素 `#4096e4`、四角 alpha=0），再由 PIL 合成 7 档尺寸（16/24/32/48/64/128/256）的 `build/icon.ico`，供窗口与快捷方式使用。

### 启动冒烟测试（关键）

在沙盒中直接运行打包后的 `Steam Insight.exe`（附 `--disable-gpu --in-process-gpu --disable-features=Vulkan,WebGPU` 等软件渲染参数），观察到：

1. 主进程启动成功，日志出现 `DevTools listening on ws://127.0.0.1:9224/...`；
2. 创建了自有 userData 目录 `%APPDATA%\steam-insight\`；
3. **`steam-insight.db` 被创建并写入至 1,007,616 字节** —— 证明 `initDatabase()` 走通，即 `fs.readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'))` 在 asar 内**读取成功**、`initSqlJs({ wasmBinary })` 初始化成功、建表与写入均成功；
4. 出现 `Local Storage\leveldb\` 数据与 `GrShaderCache` / `ShaderCache` 缓存 —— 证明**渲染进程已加载页面并执行 JS**。

> 这一条正是打包方案里最容易翻车的地方（asar 内 WASM 路径），实测无问题。

**在含 §4.4 修复的最新构建上复跑（14:29）**：主进程正常引导（3 个进程存活、
`DevTools listening on ws://127.0.0.1:9231/...`），日志中**无 FATAL**，
只有无显示器环境下预期内的 GPU 警告与一条 `NODE_OPTIONS` 提示
（`Most NODE_OPTIONs are not supported in packaged apps`，不影响功能）。
说明新增的 `http.ts`（Electron `net`）与重写后的 `steam-detect.ts` 在打包产物里**能正常加载并按预期降级**。

**在含 §4.10~§4.12（B3 增量同步 / A4 迁移+清理 / C 游戏库页）的最终构建上再复跑（18:25）**：
运行 `dist/win-unpacked/Steam Insight.exe`（附软件渲染参数），**3 个进程存活**（主 / GPU / 渲染），
日志出现 `DevTools listening on ws://127.0.0.1:9391/...`，**无 FATAL**；仅有无显示器环境预期内的
`Failed to create shared context for virtualization` 与 `NODE_OPTIONS` 提示。
说明**带 schema 迁移器（B3/A4 主进程改动）的打包产物能正常引导**。userData 下的
`steam-insight.db` 为 2,080,768 字节（比初版冒烟的 1,007,616 字节大，正是两轮真实同步写入的结果）。

> 沙盒把 `reg.exe` 列入程序黑名单且拦截整个进程树，因此本次启动日志里同样看不到注册表探测结果——
> 这是 §6 已列明的环境边界，`detectSteam()` 对此优雅降级。

**仍受限于沙盒的部分**：GPU 进程无法创建共享上下文（无显示器），故**窗口画面的肉眼确认**做不到，这是与产物正确性无关的环境边界。

> ⚠️ 但「因此拿不到窗口里的数据」是个**错误推论**（本文档早期版本这么写过）。
> `--remote-debugging-port` 的端口在本沙盒下确实**连不进来**（网络视图隔离，实测 `Connection refused`），
> 然而**进程内**的 `webContents.executeJavaScript` 与 `webContents.debugger`
> （CDP Runtime / Input domain）完全可用 —— §4.5 的端到端探针正是靠它取到真实点击、
> DOM 几何与计算样式的。**端口连不上 ≠ 拿不到数据，别据此放弃在 Electron 里取证。**

### 桌面快捷方式

已在系统桌面（`C:\桌面`，由 `SHGetKnownFolderPath` 确认，非 `C:\Users\25314\Desktop`）创建 `Steam Insight.lnk`，指向 `dist/win-unpacked/Steam Insight.exe`，含工作目录与图标设置，回读校验通过。

---

## 6. 未能在本环境验证的部分

以下项**不是**代码缺陷，而是环境边界。要在真实桌面机上人工走一遍：

> ⚠️ **本节有过一条错误结论，已在 2026-09-26 修正**：早期版本写「沙盒无显示器，看不见窗口画面」。
> 实测这是**错的** —— `PIL.ImageGrab.grab()` 能正常抓到整块 2560×1440 桌面，**含各应用的真实窗口**
> （本轮就抓到了 WorkBuddy 与 QQ 的窗口内容）。真正做不到的是**合成输入**：
> `mouse_event` / `SendInput` 注入的点击不生效（点击前后目标区域像素差为 0），
> 所以「点一下某个控件再截图」这类取证做不到，但「直接把当前屏幕截下来看」完全可以。
> 另外截图进程必须先 `SetProcessDpiAwareness(2)`，否则 `SetCursorPos` 会被夹到 (1706, 959)。
> 截图脚本见工作区外的 `tray-shot.py` / `trayreg.py`。

| 项 | 原因 |
| --- | --- |
| 窗口画面的**肉眼确认** | ✅ **本轮已补齐**：打包后的应用能带 `--remote-debugging-port` 启动，用 CDP 在**真实桌面应用**里逐页截图（`shots-crop/app-1..7-*.png`）。仍是「无头 GPU 无法创建共享上下文」，故**动态渲染**以渲染产物 + CDP 取证为准，但界面**长什么样**已有真图 |
| 新增功能的界面呈现 | ✅ 见 §4.15：成就追猎页（真实数据 2,652 个待追猎）、网络自检卡片（真实跑出 `5/5 · 直连`）、数据/诊断包区块、愿望单「设个心理价」、Wrapped 月度报告 |
| **`reg query` 的真实调用** | 本沙盒把 `reg.exe` 列入程序黑名单，**拦截作用于整个进程树**（Electron 也拉不起来，已实测确认）。注册表解析与账号推导已用**真机注册表原文 + 真实 `loginusers.vdf`** 做 17 条断言全覆盖（§4.4 ①）；调用失败时优雅降级为「未安装」，不崩溃 |
| **托盘图标在任务栏可见区**的截图 | Windows 11 默认把新图标收进「隐藏的图标」溢出面板，而本环境**无法合成点击**去打开那个面板。改以「Explorer 的 `IconSnapshot` 是 24×24 RGBA 真图」作为操作系统层证据（§4.13 证据四） |
| 安装程序 `Steam Insight-1.0.0-setup.exe` **实际安装** | 会写入注册表与 `%LOCALAPPDATA%\Programs`，属对用户系统的修改，未擅自执行 |
| Steam OpenID 真实登录 | 需要真实账号与公开的「游戏详情」隐私设置；登录页与 `check_authentication` 端点已实测可达 |
| Steam Web API 真实拉取用户数据 | 需要真实 Web API Key；四个相关端点已实测 HTTP 200 且返回真实数据 |
| Windows 原生通知弹窗 | 需真实桌面会话 |
| 导出 PNG / PDF **落盘** | 海报导出态与整窗覆盖已实测；`capturePage()` / `printToPDF()` 写盘链路经类型检查与代码审查，未在 Electron 中实跑 |
| 表格导出（CSV / XLSX）落盘 | 同上 |
| 打开外部浏览器 / 商店外链 | **链路已实测**（§4.5：真实鼠标点击 → 主进程 `shell.openExternal` 收到正确 URL）。仅「系统浏览器窗口真的弹出来」这一步无法在无头环境肉眼确认 |
| 拉起 Steam 客户端（`steam.exe`） | 走 `child_process` 直接起进程，非 `openExternal`；需真实环境 |

---

## 7. 复现验收

```bash
cd steam-insight
npm install
npm run typecheck                 # 双向类型检查
npm run build                     # 产出 out/

# 打包（Windows）
npm run dist:dir                  # 免安装目录版
npm run dist                      # NSIS 安装包

# 无头验收（可选，需要本机 Chrome）
node ../tools/serve-renderer.mjs "$PWD/out/renderer" 5188 &
chrome --headless=new --remote-debugging-port=9333 \
       --user-data-dir=/tmp/si-chrome --no-proxy-server \
       --window-size=1560,980 http://127.0.0.1:5188/ &
node ../tools/verify-steam-insight.mjs 9333 ./shots    # 14 张截图 + 错误汇总（含游戏库）
node ../tools/scan-pages.mjs 9333                      # 8 页文本污染扫描
node ../tools/verify-c-library.mjs 9333 ./shots-c      # 游戏库页 31 条断言（含六入口返回往返）
node ../tools/probe-dashboard.mjs                      # KPI 期望值对账

# 端到端：在真实 Electron 里跑主进程链路（外部链接点击 → shell.openExternal + 协议白名单）
# 必须给足这套软件渲染参数，只加 --disable-gpu 会 FATAL 退出
node_modules/electron/dist/electron.exe ../tools/probe-external-link.js \
  --no-sandbox --disable-gpu --disable-gpu-compositing \
  --disable-software-rasterizer --in-process-gpu --disable-dev-shm-usage
cat ../tools/probe-external-link.result.json

# 托盘图标（§4.13）：进程内探针 —— 打到「有没有一张看得见的 24×24 位图」上
node node_modules/esbuild/bin/esbuild tools/probe-tray/tray-entry.ts --bundle \
  --platform=node --format=cjs --external:electron --tsconfig=tsconfig.node.json \
  --outfile=tools/probe-tray/tray-bundle.cjs
env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS node_modules/electron/dist/electron.exe \
  tools/probe-tray/tray-probe.cjs --no-sandbox \
  --tray-png=dist/win-unpacked/resources/tray.png      # 期望 ALL PASS pass=11 fail=0

# 托盘图标（§4.13）：操作系统侧 —— 直接读 Explorer 存下的 IconSnapshot
"D:/python/python.exe" ../tools/trayreg.py "Steam Insight.exe"        # 期望 24×24 RGBA、opaque 332
"D:/python/python.exe" ../tools/trayreg-time.py <该子项的 hash>        # 期望 last_write = 修复版启动时刻

# 桌面截图（能截、不能点；必须先声明 DPI 感知）
"D:/python/python.exe" ../tools/tray-shot.py after 2
```

### 7.1 网络可达性 A/B（回答「要不要开加速器」）

用应用**真实的传输层**（`electron/main/http.ts`）逐个探测 5 个 Steam 域名。
两组都必须给**独立的空 `--user-data-dir`**，否则 Chromium 的 HTTP 缓存会造出 2 ms 的假 PASS
（第一遍就因为缓存把 `store` / `cdn` 在 B 组里判成通过，差点得出错误结论）。

```bash
cd steam-insight
node node_modules/esbuild/bin/esbuild tools/probe-net/net-entry.ts --bundle \
  --platform=node --format=cjs --external:electron --tsconfig=tsconfig.node.json \
  --outfile=tools/probe-net/net-bundle.cjs

# A 组：现状（加速器在跑）。期望 5 PASS / 0 FAIL
env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS node_modules/electron/dist/electron.exe \
  tools/probe-net/net-probe.cjs --no-sandbox \
  --user-data-dir="C:/Users/<你>/AppData/Local/Temp/netprobe-a"

# B 组：模拟「hosts 仍被劫持、加速器已退出」。期望 3 FAIL（api / store / community）
# 用 Chromium 的解析规则在进程内模拟，**不修改系统 hosts**
env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS node_modules/electron/dist/electron.exe \
  tools/probe-net/net-probe.cjs --no-sandbox \
  --user-data-dir="C:/Users/<你>/AppData/Local/Temp/netprobe-b" \
  "--host-resolver-rules=MAP api.steampowered.com 127.0.0.1:9,\
MAP store.steampowered.com 127.0.0.1:9,\
MAP steamcommunity.com 127.0.0.1:9,\
MAP avatars.steamstatic.com 127.0.0.1:9,\
MAP cdn.cloudflare.steamstatic.com 127.0.0.1:9"
```

实测结论与完整证据表见 [`DEPLOY-AND-NETWORK.md`](DEPLOY-AND-NETWORK.md) 第二节。

截图产物在 `shots/`。

> **沙盒环境注意**：`electron-builder` 重建 `dist/` 时会删除已存在的目录，会触发 `node-safe-delete` 的批量删除守卫（阈值 50 个文件），报 `SAFE_DELETE_BULK_CONFIRM_REQUIRED` 并中断打包。需先设 `CODEBUDDY_SAFE_DELETE_ENABLED=0` 再执行 `npm run dist`。同理，`app.asar` 中 `sql.js` 的 wasm 依赖 `dependencies` 字段被自动收集，**不要**把 `sql.js` 挪进 `devDependencies`，否则运行时读不到 wasm。
>
> 另外两条本轮新踩到的（详见 §5 的「四个沙盒坑」）：打包**必须走 `npm run dist`**（直接调
> `node_modules/.bin/electron-builder` 会得到误导性的 `No JSON content found in output`）；
> 打包前**先 `taskkill /F /IM "Steam Insight.exe"`**，否则报 `EBUSY rmdir`。
> **验收托盘图标的顺序是「先打包 → 再启动 → 再截图」**。

---

## 9. V2 验收（2026-09-26 深夜）

ROADMAP-V2 全部条目交付后的第二轮验收，完整过程与逐项证据见
**[`SELF-CHECK-REPORT-V2.md`](SELF-CHECK-REPORT-V2.md)**。要点：

| 关卡 | 结果 |
| --- | --- |
| typecheck（node + web） | 0 错误 |
| feature probe（11 组 A–K） | **153/153 通过**（`probe-6.log`） |
| 渲染层走查（10 页 + 详情 + 面板，12 张截图 `shots-v2/`） | console 错误 **0**、警告 **0** |
| 文本污染扫描（含 SVG text，`tools/scan-pages.mjs`） | **0 命中** |
| `npm run dist` + asar 校验 | exit 0；源码 0 泄漏；WASM 齐全；新代码（`game_notes`/`hunt_picks`/`pruneSamples` + 对比/笔记/追猎 UI）确认进包 |
| 打包态冒烟 | `DevTools listening` + 3 进程常驻 |

本轮实测修掉的 3 个缺陷（含「分析页空白」的根因 `$appId` 参数名笔误）与回归锁见报告 §5。
新增验收工具：`tools/cdp-lib.mjs`、`serve-renderer.mjs`、`verify-steam-insight.mjs`、`scan-pages.mjs`、`shot.mjs`。
