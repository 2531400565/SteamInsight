# ROADMAP 全量交付 · 自检报告

> 生成时间：2026-09-26 20:2x
> 范围：`docs/ROADMAP.md` 中「建议做」的全部条目（P0-1 ~ P3-7）
> 约束：**「明确不建议做」的条目一律未做**（见第 4 节）

---

## 0. 一句话结论

ROADMAP 的 **P0 / P1 / P2 / P3 全部条目已落地**（P2-5 调研后判定不可行，如实不做）；
新增功能的自检为 **92 条断言全通过 + 9 个页面零渲染污染**；
自检过程中**真的揪出并修掉两个会导致崩溃或导入失败的缺陷**；
打包产物已重建并验证，桌面应用实跑通过。

---

## 1. 自检证据（三组，均可复跑）

| # | 手段 | 覆盖 | 结果 |
| --- | --- | --- | --- |
| 1 | `tools/probe-features/features-probe.cjs` | 连通性判定 / 数据包 / 价格阈值 / 成就追猎 / 设置归一化 / 日志落盘 | **82 / 82 PASS** |
| 2 | `tools/probe-features/diagnose-live-probe.cjs` | 连通性自检**打真实网络**（走应用真实传输层 `http.ts`） | **5/5 域名可达 + 10/10 结构性断言** |
| 3 | `tools/scan-pages.mjs` | 全站 9 个页面（含新增页）文本污染扫描 | **9/9 通过，污染命中 0** |
| 4 | 桌面冒烟 | 打包后的 `Steam Insight.exe` 带 CDP 启动并逐页截图 | **通过**（见 `shots-crop/app-1..7-*.png`） |

### 1.1 第 1 组的断言分布

| 分组 | 条数 | 验的是什么 |
| --- | --- | --- |
| A 连通性判定 | 22 | 5 种网络形态 → 结论与处置建议是否正确；代理串解析；配置提示 |
| B 数据包 | 22 | 6 类非法输入必须抛错；真实库往返一致；未知列 / 缺列 / 陌生表都不崩 |
| C 价格阈值提醒 | 11 | 低于阈值才弹；同价不重弹；**再降价要再弹**；来源优先级；seen 兜底 |
| D 成就追猎 | 11 | 每日一次；开关；「稀有」与「未解锁」两个条件都成立才算 |
| E 设置归一化 | 10 | 脏 `priceAlerts` / 非法间隔 / 非法国家码全部兜住 |
| F 日志落盘 | 6 | 写 → 合并落盘 → 读回；按天切分；写在隔离目录 |

### 1.2 第 2 组的真实输出（节选）

```
代理(实际生效) = 直连
api.steampowered.com            api        PASS   net   205ms   HTTP 200
steamcommunity.com              community  PASS   net   969ms   HTTP 200
store.steampowered.com          store      PASS   net   400ms   HTTP 200
avatars.steamstatic.com         cdn        PASS   net   301ms   HTTP 404
cdn.cloudflare.steamstatic.com  cdn        PASS   net   114ms   HTTP 200
结论等级 = OK   通过 5/5
标题     = 网络正常
```

> `avatars` 的 **404 被判为「链路通」是刻意的** —— 它证明域名解析、TLS、代理全都正常，
> 只是根路径没有内容。若把 404 当失败，用户会被误导去排查网络。

### 1.3 桌面应用里的真实自检（打包产物，非预览）

在 `dist/win-unpacked/Steam Insight.exe` 里点「开始自检」，界面返回：

```
✅ 网络正常                                  5/5
api.steampowered.com           业务接口   205ms   net · 200
steamcommunity.com             业务接口   969ms   net · 200
store.steampowered.com         业务接口   400ms   net · 200
avatars.steamstatic.com        图片 CDN   301ms   net · 404
cdn.cloudflare.steamstatic.com 图片 CDN   114ms   net · 200
当前代理 直连 | API Key 已配置 | 当前数据源 Steam API 真实数据 | 自动同步 已开启 每 30 分钟
```

---

## 2. 交付清单（逐条 → 落点 → 证据）

| 条 | 交付物 | 落点 | 证据 |
| --- | --- | --- | --- |
| P0-1 | 一键连通性自检 | `electron/main/net-diagnose.ts`、`src/pages/settings/NetworkSection.tsx`、IPC `net:diagnose` | A1–A22 + 真实网络 5/5 + `app-3` 截图 |
| P0-2 | 本地日志 + 崩溃捕获 + 诊断包 | `electron/main/logger.ts`（按天滚动 / 保留 7 天 / 400ms 合并落盘 / 崩溃强制 flush）、`diagnostics.ts`（**API Key 双层脱敏**） | F1–F6；`buildDiagnostics()` 不含明文 Key |
| P0-3 | 代码签名说明 | 无证书；`electron-builder.yml` 留注释化配置位 + `DEPLOY-AND-NETWORK.md` 交付话术 | 产物 PE 证书表为 0，**已如实告知** |
| P1-4 | 商店侧同步 TTL | `sync.ts` `STORE_DETAIL_TTL_HOURS = 12`，依 `games.price_checked_at`；手动同步 `force` 绕过 | 代码审查 + 同步日志一行 |
| P1-5 | `app.setAppUserModelId` | `index.ts:38`，与 `electron-builder.yml` 的 `appId` 对齐 | 代码审查 |
| P1-6 | 价格阈值提醒 | `PriceAlert` 契约、`notify-plan.ts` 判定、愿望单「设个心理价」 | C1–C11 + `app-6` 截图 |
| P2-1 | 周报 / 月报 | `wrapped.ts` 增 `availableMonths/availableWeeks/periodBounds/buildPeriodReport`；`WrappedPage` 周期切换；导出复用 PNG/PDF 链路 | `app-7` 截图（2026 年 9 月真实报告） |
| P2-2 | 成就追猎清单 | `src/pages/AchievementHuntPage.tsx` + 每日一次汇总通知（`meta` 表存日期） | D1–D11 + `app-1` 截图（真实 2,652 个待追猎） |
| P2-3 | 托盘菜单增强 | `notifications.ts`：「上次同步 / 下次同步倒计时」+「打开愿望单」，每分钟重建 | 代码审查 |
| P2-4 | 数据包导入 / 导出 | `electron/main/datapack.ts`（`format`+`version` 双标识、列名白名单防注入、不含 API Key） | B1–B22 + `app-4` 截图 |
| P2-5 | 家庭共享库**调研** | 结论写入 `ROADMAP.md`：**不可行，不实现** | 见第 4 节 |
| P3-1 | 自动更新评估 | 未引入 `electron-updater`；代价与前提已写明 | 文档 |
| P3-2 | 多账号口径 | 账号卡片明示「按 app_id 单键存储（不区分账号）」 | `app-2` 截图可见 |
| P3-3 | LICENSE | 新增 `LICENSE`（MIT，与 `package.json` 对齐） | 文件存在 |
| P3-4 | 页面口径统一 | README / PRD 统一为 **11 个页面**，并补齐原先漏列的「游戏库」 | 两份文档 |
| P3-5 | 注释与默认值对齐 | `achievement-sync.ts` 注释 15 → **30 分钟** | 代码审查 |
| P3-6 | 清理根目录残留 | 删除 2 个 `electron.vite.config.*.mjs` 副产物 | 已清理 |
| P3-7 | PRD §7.2 未验证项 | 「窗口画面的肉眼确认」已转**已验证** | `PRD.md` / `VERIFICATION.md §6` |

---

## 3. 自检揪出的两个真缺陷（都已修）

这两个都不是「读代码能看出来」的 —— 正是把逻辑真跑一遍才暴露出来的。

### 3.1 `settings.ts` 不校验 `priceAlerts` 结构 → 可导致同步/启动崩溃

**问题**：`settings.json` 是用户可手改的文本文件，而 `priceAlerts` 是数组。原实现只做**浅合并**。
一旦文件里被写成 `"priceAlerts": null`（或渲染层传了非数组），下游
`settings.priceAlerts.length`（`notify-plan.ts:125`、`diagnostics.ts:86`）直接抛 `TypeError`，
**把一次同步甚至启动流程带崩**，而且报错点离现场很远。

**修法**：新增 `normalizeSettings()`，对 `priceAlerts` **逐条**校验
（`appId` 必须正整数、阈值必须非负有限数，脏条目丢弃），并顺带兜住 `syncIntervalMin`
（只允许 15/30/60）与 `countryCode`（必须两位字母）；`load()` 与 `setSettings()` 都走它。
*对应断言 E1–E10。*

### 3.2 `applyDataPack()` 对「只带部分列的数据包」必然失败

**问题**：原实现只插入**源文件里出现的列**。但 `games` 表有多列 `NOT NULL` 且无默认值
（`header_image` / `release_date` / `developer` / `publisher` / `capsule_image` …），
于是一个只带 `app_id` + `name` 的行（手工整理的包，或将来演进后的旧版包）会在事务中途抛
`NOT NULL constraint failed: games.header_image`。

事务虽会回滚、**库不会坏**，但报错信息用户完全无从下手 ——
等于 P2-4 自己写的「版本兼容」这个设计目标**实际并没有成立**。

**修法**：读 `PRAGMA table_info` 拿到 `notnull` 与 `dflt_value`，
对缺失的 `NOT NULL` 列按列类型补占位值（有默认值用默认值；数字补 `0`、文本补 `''`）；
同时**保留**「只采信真实列名」的白名单（防注入），并保证整行没有任何可识别列时跳过而非写入空行。
*对应断言 B16–B22。*

---

## 4. 明确没有做的部分

### 4.1 按你的要求，严守 ROADMAP 的三条禁区

| 项 | 处理 |
| --- | --- |
| 自建「每日游玩时长」数据源 / 引入第三方史低源 | **未做**。PRD §5 已写成硬约束 —— 宁可显示「需要积累」，也不用看起来像的数据糊过去 |
| 把 SQLite 换成联网后端 | **未做**。「无需账号、数据不出本机」是这个项目最值得保留的属性 |
| 应用内实现 Steam 账号密码登录 | **未做**。OpenID 走系统浏览器的安全模型是正确的，任何「在应用内输 Steam 密码」都是倒退 |

### 4.2 P2-5 家庭共享库：调研结论是「不可行」，因此不实现

ROADMAP 原文要求「**不要先承诺**」，所以只做调研。结论如下（2026-09-26 核实）：

| 事实 | 详情 |
| --- | --- |
| 接口确实存在 | `IFamilyGroupsService/GetSharedLibraryApps/v1/`，返回 `response.apps[]`（含 `appid` / `owner_steamids` / `exclude_reason`） |
| **但它要 `access_token`，不是 API Key** | 调用形如 `…?access_token=<token>&family_groupid=<id>` —— 两者是 Steam 上**完全不同的两套凭据**，Web API Key 无效 |
| 还要先拿 `family_groupid` | 需先调 `GetFamilyGroupForUser/v1/?access_token=`，等于两步鉴权 |
| 属**未公开**接口 | 不在 Steamworks 公开 Web API 文档里，靠社区逆向维护，随时可能变 |

**为什么本应用做不到**：当前认证只有两条路 —— **Web API Key** 与 **OpenID**（只用来确认 SteamID64），
**两条都产不出 `access_token`**。要么教用户去抓 Steam 客户端凭据（危险操作），
要么自建 OAuth 流程（违反 PRD §5）。所以维持现状：只显示 `GetOwnedGames` 的自有游戏库。

---

## 5. 产物与变更

### 5.1 最终打包产物

| 项 | 值 |
| --- | --- |
| 安装包 | `dist/Steam Insight-1.0.0-setup.exe` — **123,225,371 字节**（约 117.52 MB），PE 魔数 `MZ` |
| 免安装版 | `dist/win-unpacked/Steam Insight.exe` |
| 渲染产物 | `index-C_fufjFr.js`（1,969.00 kB）+ `index-DG0eqJqb.css`（61.39 kB） |
| 主进程产物 | `out/main/index.js`（142,086 字节） |
| 托盘图标 | `resources/tray.png` 与 `build/tray.png` **sha256 逐字节相同**（7,156 bytes） |
| asar 内引用 | `out/renderer/index.html` → `index-C_fufjFr.js`（与源码树一致） |

### 5.2 新增文件

**主进程**：`logger.ts`、`net-diagnose.ts`、`diagnostics.ts`、`datapack.ts`
**渲染层**：`src/pages/AchievementHuntPage.tsx`、`src/pages/settings/NetworkSection.tsx`
**工程**：`LICENSE`、`tools/probe-features/`（3 个文件）
**工作区工具**：`tools/scan-pages.mjs`、`tools/shot-features.mjs`、`tools/navcheck.mjs`

### 5.3 主要修改

`electron/shared/channels.ts`、`electron/shared/contract.ts`、`electron/preload/index.ts`、
`electron/main/{index,settings,sync,notify-plan,notifications,exporter,api-base,achievement-sync,repository}.ts`、
`src/types/{steam,ipc}.ts`、`src/store/{useAppStore,useDataStore}.ts`、`src/utils/wrapped.ts`、
`src/database/schema.ts`（**SCHEMA_VERSION 1 → 2**，新增 `meta` 表）、`src/services/bridge.ts`、
`src/pages/{SettingsPage,WishlistPage,WrappedPage}.tsx`、`src/pages/settings/{AccountSection,DataSection,AboutSection}.tsx`、
`src/App.tsx`、`src/components/layout/Sidebar.tsx`、`src/pages/wrapped/PosterOverlay.tsx`、
`electron-builder.yml`、`README.md`、`docs/{ROADMAP,PRD,VERIFICATION}.md`

---

## 6. 怎么复跑这份自检

```bash
cd steam-insight

# 1) 静态检查 + 构建
npm run typecheck          # 两个 project 都必须 0 error
export CODEBUDDY_SAFE_DELETE_ENABLED=0   # 见 VERIFICATION §5 沙盒坑
npm run build

# 2) 功能自检（82 条）
node node_modules/esbuild/bin/esbuild tools/probe-features/features-entry.ts --bundle \
  --platform=node --format=cjs --external:electron --tsconfig=tsconfig.node.json \
  --outfile=tools/probe-features/features-bundle.cjs
env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS node_modules/electron/dist/electron.exe \
  tools/probe-features/features-probe.cjs --no-sandbox

# 3) 真实网络自检（5 域名 + 10 条）
env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS node_modules/electron/dist/electron.exe \
  tools/probe-features/diagnose-live-probe.cjs --no-sandbox

# 4) 全站页面扫描（需要一个已启动的无头 Chrome + 静态服务）
node ../tools/serve-renderer.mjs "$PWD/out/renderer" 5188 &
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --remote-debugging-port=9333 --user-data-dir="$TEMP/si-cdp" \
  --no-proxy-server --proxy-bypass-list='*' http://127.0.0.1:5188/ &
node ../tools/scan-pages.mjs 9333     # 9/9 通过、污染 0
```

> ⚠️ **第 4 步的两个坑（都踩过，都不报错）**：
> 1. 无头 Chrome 那个标签页会停在**上一次导航加载的旧 bundle** 上 ——
>    所以 `scan-pages.mjs` 开头强制 `Page.navigate` 重载并打印实际加载的 bundle 名，**看它和 `out/renderer/assets/` 是否一致**。
> 2. 残留的无头 Chrome 会**占住 CDP 端口**；新实例 bind 失败后只是不启用 devtools，
>    于是应答的其实是旧实例。症状同样是「查到的页面是旧的」。

---

## 7. 遗留与建议

| 项 | 说明 |
| --- | --- |
| **代码签名** | 仍是 0 签名。分享前务必把 `DEPLOY-AND-NETWORK.md` 里那段话一并发给朋友，否则会撞 SmartScreen 蓝框 |
| **自动更新（P3-1）** | 未引入。每改一次都要重发 117 MB；若打算长期分享值得上，需要一个静态托管 |
| **导出 PNG / PDF / CSV 的落盘** | 链路与代码审查已过，但**未在 Electron 中实跑**（会弹系统保存对话框）。建议你用桌面版手动导一次确认 |
| **Windows 通知弹窗** | 同上，需真实桌面会话手动触发一次 |
| **`games` 表缺 `steam_id`（P3-2）** | 已用 UI 文案讲明「单账号」，未改表结构（改动会连带 repository 与 queries，收益不匹配） |
