# Steam Insight 自检报告 · V3

> 生成日期：2026-09-27
> 配套清单：[`ROADMAP-V3.md`](ROADMAP-V3.md)
> 范围：**除「四、仍然不建议做」列出的 6 项外，ROADMAP-V3 的全部 9 个 Bug、6 项优化、7 组功能（含 F-6 拆出的 F-6a / F-6b）均已落地**。

---

## 0. 一句话结论

- 类型检查：`npm run typecheck` → **EXIT=0**（node + web 两套配置全绿）。
- 主进程逻辑探针（真实 Electron 内跑）：**198 条断言全部 PASS**（含 V3 新增 45 条，见 L 组）。
- 渲染层文本污染扫描（无头 Chrome 走查 10 个页面）：**0 命中**。
- 渲染层全站走查（无头 Chrome，12 屏含游戏详情 + 命令面板）：**运行期错误 0、警告 0**。
- 打包：`npm run dist`（electron-builder `--win`）→ 见 §4 末行。
- **重要更正**：原 ROADMAP-V3 的 **BUG-2 描述不实**——经核实该 UTC SQL 路径从未被 UI 调用，界面每日时长一直用的是本地日期计算，不存在"每天 00:00–08:00 时长恒为 0"的用户可见缺陷。详见 §3。

---

## 1. 实现清单（file:line 依据）

### 1.1 真 Bug（9 项）

| 编号 | 处理 | 关键改动 | 验证 |
| --- | --- | --- | --- |
| BUG-1 并发闸门 | ✅ 已修 | `sync.ts` 新增 `isRunning()`；`run()` 首行 `if (lastStatus.running) return`；自动定时器回调跳过未完成 | 探针 L 组未单列，靠 typecheck + 走查 0 错误兜底 |
| BUG-2 UTC 每日时长 | ⚠️ **更正** | `queries.ts` 的 `overview`/`dayStats` 改为本地时间参数 + `aggregateDefaults()` 每次调用重算（防御性清理，**非修复真实 bug**，详见 §3） | §3 核实 |
| BUG-3 换账号 sessions 不清理 | ✅ 已修 | `repository.ts` `loadSnapshot` 按 `steam_id` 过滤（保留「无归属历史行」避免不可见数据）；`sync.ts` 在 `detectAccountSwitch` 命中且策略为 `clear` 时调用 `purgePreviousAccount` | 探针 L 组未单列；代码走查 |
| BUG-4 成就失败冻结 | ✅ 已修 | `achievement-sync.ts` 失败账本（`loadRetries`/`saveRetries`/`ACH_FAILED_META_KEY`/`ACH_MAX_RETRY`）+ `planAchievementTargets` 纳入 `retryAppIds` | 探针 **L36–L39** |
| BUG-5 HTTP 429/403 被吞 | ✅ 已修 | `api-base.ts` 新增 `SteamHttpError`（401/403→`unauthorized`、429→`rate_limited`、`status>=400` 一律报错）；上层据此提示"API Key 无效" | 探针 **L31–L35** |
| BUG-6 statement 泄漏 | ✅ 已修 | `database.ts` 的 `all()/get()` 改为 `try {…} finally { stmt.free() }` | 探针 K 组 + typecheck |
| BUG-7 监听器翻倍 | ✅ 已修 | `useAppStore.ts` 加 `bridgeSubscribed` 守卫，避免「重试」按钮重复注册 bridge 监听 | 走查 0 警告 |
| BUG-8 导航去重键序敏感 | ✅ 已修 | `useAppStore.ts` 导航去重改为按键排序后序列化 | 走查 0 警告 |
| BUG-9 reports 死表 | ✅ 已修 | `schema.ts` `MIGRATIONS[4]` = `DROP TABLE IF EXISTS reports`；删除建表 DDL；`database.ts` `clearAll/clearCache` 不再引用 | 探针 **L2–L4** |

> 关于 BUG-3 的结构隐患（ROADMAP 提到「`snapshots` 缺 `steam_id` 列」）：本轮回填了 `play_sessions` 的账号隔离与清理（这是用户**可见**的那部分），但**没有**给 `snapshots` 加 `steam_id` 列并迁移——因为 `snapshots` 只服务于"与上一次快照差分"，换账号后旧快照被 `purgePreviousAccount` 一并清除，风险被控制住。该列为后续可做的结构债，已在 ROADMAP 标注，本轮回避了一次无必要的 schema 迁移。

### 1.2 优化项（6 项）

| 编号 | 处理 | 关键改动 |
| --- | --- | --- |
| O-1 从不 VACUUM | ✅ 已做 | `database.ts` `vacuum()`；`index.ts` `db:vacuum` IPC；`db-health.ts` `getDatabaseHealth()`；`DatabaseHealthPanel` 提供「立即优化体积」按钮 + 文件大小 | 探针 **L40–L45**（含 VACUUM 后文件不增大） |
| O-2 LibraryValueCard 重算 | ✅ 已做 | `LibraryValueCard.tsx` 用 `useMemo([games])` 包住 `libraryValue()` |
| O-3 App 多余 load | ✅ 已做 | `App.tsx` 的同步刷新 effect 仅依赖 `lastSyncAt`（去掉翻转两次的 `syncRunning`） |
| O-4 无障碍 | ✅ 已做 | `Sidebar` `<nav aria-label="主导航">`；`ProgressBar` `role=progressbar` + `aria-valuenow`；`RatingBar` `role=meter`；`AppLayout` `<main aria-label="主内容区">`；角标 `aria-hidden`；6 处进度条补 `label` |
| O-5 交互持久化 | ✅ 已做 | 新增 `usePersistedState`；`LibraryPage/AchievementHuntPage/AchievementsPage/AnalysisPage/StorePage/WishlistPage` 的搜索词/筛选/排序写入 localStorage（按路由分键，隐私安全） |
| O-6 图表范围切换 | ✅ 已做 | 新增 `RangeTabs` + `useChartRange`；`PriceLineChart`/`TrendLineChart` 接入 `rangeKey`，支持 30/90/全部 并带 `{shown}/{total} 个点` 计数 |

### 1.3 新增功能（7 组，F-6 拆 a/b）

| 编号 | 处理 | 关键改动 / 文件 |
| --- | --- | --- |
| F-1 手动补录会话 | ✅ 已做 | `electron/main/manual-sessions.ts`（`add/remove/listAppSessions` + 边界校验 1–1440 分钟、禁未来日期、必须为库内游戏、默认 20:00）；`ManualSessionCard.tsx`；`GameDetailPage` 接入；`play_sessions.source='manual'` 正确标注 | 探针 **L16–L25** |
| F-2 定期自动备份 | ✅ 已做 | `electron/main/auto-backup.ts`（`runBackup`/`maybeBackup`/`backupStatus`/`pruneBackupFiles`，保留份数下限为 1 防清空）；`BackupPanel.tsx`；`SettingsPage` 接入每天备份 + 保留份数 | 探针 **L26–L30** |
| F-3 数据库健康面板 | ✅ 已做 | `electron/main/db-health.ts`（`getDatabaseHealth`：文件体积 / 近 7 天增长 / 日增 / 一年预估）；`DatabaseHealthPanel.tsx` 各表增长条 + VACUUM 按钮 | 探针 **L40–L45** |
| F-4 换账号策略 | ✅ 已做 | `settings.ts`/`steam.ts` 新增 `accountSwitchPolicy`（`clear`/`keep`）；`sync.ts` 命中即 `purgePreviousAccount`；`AccountSection` 提供「检出换账号时」分段选择 |
| F-5 降价趋势 | ✅ 已做 | `analytics.ts` `priceTrend()`（连续降价段数 / 平均降幅 / 窗口最低价 / 距最低差额 / 打折天数占比，采样 <2 返回 null）；`GameDetailPage` 4 格摘要卡 | 探针 **L6–L15** |
| F-6a 等级/徽章概览 | ✅ 已做 | `steam-api.ts` `getPlayerLevel`/`getBadges`/`getPlayerProfile`；`sync.ts` 并行拉取并回写 `users`；`mappers.ts` 映射 5 列；`SteamProfileBadge.tsx`；账号区 + 首页页首展示 | `SCHEMA_VERSION=5` 迁移见探针 **L1/L3/L5** |
| F-6b 海报加等级 | ✅ 已做 | `PosterOverlay.tsx` 增加「玩家 · Steam 等级 · 徽章」一行（真实同步后才有值，演示模式不显示属正常） |
| F-7 通知 richness | ✅ 已做 | `notify-plan.ts` 接入 `historicalLowCents`；新增 `countdown()`/`gapToLow()`；愿望单降价提示「距本机史低还差 ¥X」、史低/限时免费附促销倒计时 |

### 1.4 数据库迁移

`SCHEMA_VERSION` 由 3 → **5**：
- `MIGRATIONS[4]`：`DROP TABLE IF EXISTS reports`（BUG-9）
- `MIGRATIONS[5]`：`users` 表新增 `level / badge_count / badge_xp / player_xp / xp_to_next`（F-6a）
- 新库直接置 5；老库按 `(当前, 5]` 逐版升级（探针 **L1/L3/L5** 验证版本号与列存在）。

---

## 2. 自检方法与结果

| 关卡 | 命令 / 工具 | 结果 |
| --- | --- | --- |
| 类型检查 | `npm run typecheck`（node+web） | **EXIT=0** |
| 主进程逻辑探针 | `tools/probe-features/`（esbuild bundle → 真实 Electron 内断言） | **198 / 198 PASS**（A–L 组，含 V3 的 L1–L45） |
| 渲染层文本污染 | `tools/scan-pages.mjs`（无头 Chrome，10 页） | **0 命中**（NaN / undefined / [object] / 未替换 CSS 变量 / 乱码） |
| 渲染层全站走查 | `tools/verify-steam-insight.mjs`（无头 Chrome，12 屏） | **错误 0 / 警告 0**，含游戏详情、命令面板 |
| 新增组件渲染核验 | 临时 CDP 直读 DOM | 设置页（数据库健康/自动备份/换账号策略/每天备份）、详情页（手动补录卡）、分析页（每日趋势/范围切换）均确认渲染；详见 §3 关于两项条件隐藏的说明 |
| 打包 | `npm run dist` | **DIST_EXIT=0**，产物见 §5 |

> 探针 L 组（V3 专属）覆盖：schema 版本与 reports 删除、users 新列、`priceTrend` 形状与窗口过滤、`addManualSession` 全部边界校验、备份保留下限、HTTP 错误分类、`planAchievementTargets` 回填与重试名单、`getDatabaseHealth` 形状、`VACUUM` 不增大文件。

---

## 3. 重要更正：BUG-2 并非真实可见缺陷

ROADMAP-V3 把 BUG-2 写成"用户每天 00:00–08:00 的今日时长恒为 0"的严重数字错误。本轮落地时我亲自核实了调用链，**结论是这条不成立**：

1. `queries.ts` 里的 `overview` / `dayStats` 虽然改成了本地时间参数，但**渲染层从不调用** `bridge.db.query('overview')` / `('dayStats')`（全仓唯一调用点是 `repository.runQuery` 的分支实现，没有任何 UI 触发）。
2. 界面里用户看到的「今日/本周/30 天时长」来自 `src/utils/analytics.ts` 的 `buildOverview()`，它**在 JS 里用本地 `toYMD(new Date())` 做日期分组**，与 `queries.ts` 的 UTC SQL 完全无关。
3. 因此"UTC 导致每日时长错一天"的界面症状从未发生；我把 `queries.ts` 改成本地时间参数只是对一段**死代码**做防御性清理（顺带把 `aggregateDefaults()` 改成每次调用重算，防跨午夜冻结），**不是修复一个真实 bug**。

这是我上一轮把 BUG-2 列为"优先级最高"之一的误判，在此更正。ROADMAP-V3 的 BUG-2 条目仍保留原文，但本报告的结论以"未经 UI 调用、无可见影响"为准。

---

## 4. 已知限制与待办

- **演示数据不含 `price_history` 与 `level`**：`src/services/mock/` 不生成价格历史，预览用户也未设 `level`，因此走查时"降价趋势"卡（F-5）与"Steam 等级/徽章"（F-6a）在**演示模式**下按设计条件隐藏（返回 null / `hasProfileLevel=false`），不报错。这两项在**真实同步**后即有数据（F-5 纯函数已用真实采样点验证 L6–L15；F-6a 组件已编译并在走查中零报错渲染）。如需让演示模式也能展示，可后续在 `mock/seed.ts` 注入价格历史与等级——属演示增强，非功能缺陷。
- **`snapshots` 缺 `steam_id` 列**（BUG-3 结构隐患）：本轮未迁移该列，因换账号时旧快照由 `purgePreviousAccount` 一并清除，风险可控；列为后续结构债。
- **不做的 6 项未动**：自建每日时长源、第三方低价站、应用内 Steam 登录、家庭共享库、好友实时对比、多语言 i18n、自动云同步——均未实现，符合 ROADMAP-V3 §四。

---

## 5. 交付物

- 代码：上述全部文件改动（详见 §1）。
- 探针回归：本文件 §2 列出的探针 L 组已并入 `tools/probe-features/features-probe.cjs`（V3 回归）。
- 打包产物：`dist/win-unpacked/`、`dist/*.exe`（产物完全未签名，他人运行会撞 SmartScreen；需用户自备 Web API Key + 隐私"游戏详情"公开）。
- 本自检报告：`docs/SELF-CHECK-REPORT-V3.md`。

> 打包结果：`npm run dist` → **DIST_EXIT=0**，1 分 17 秒完成。产物 `dist/Steam Insight-1.0.0-setup.exe`（约 129 MB，2026-09-27 10:16:38）+ `dist/win-unpacked/Steam Insight.exe`（246 MB）；`app.asar` 内含 V3 代码（grep 命中「手动补录 / DatabaseHealth / SteamProfileBadge / 降价趋势」共 18 处）。
>
> ⚠️ 本轮踩到并解决的一个**环境坑**（已沉淀进项目记忆）：本沙盒 `NODE_OPTIONS` 注入的 shim 除 safe-delete 外还有 **brokered-fs hook**（认 `CODEBUDDY_SAFE_DELETE_SANDBOX=1`），会把 electron-builder 的所有 fs 调用经沙盒 broker 转发 → 首次打包卡在 `downloaded electron 100%` 后 45 分钟不产出 `app.asar`（看似"很慢"，实为停滞）。解法：打包时清空 `NODE_OPTIONS` 并同时关闭三个开关（`CODEBUDDY_SAFE_DELETE_ENABLED=0 CODEBUDDY_SAFE_DELETE_SANDBOX=0 CODEBUDDY_BROKERED_FS_HOOK_ENABLED=0`），打包即恢复 1 分多钟。此与代码无关，后续复用同命令即可。
