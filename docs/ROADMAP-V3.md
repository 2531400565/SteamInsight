# Steam Insight 候选清单 V3

> 归档日期：2026-09-27（V2 全部交付之后）
> 与 [`ROADMAP-V2.md`](ROADMAP-V2.md) **不重复** —— V2 的条目已全部落地，验收见 [`SELF-CHECK-REPORT-V2.md`](SELF-CHECK-REPORT-V2.md)。
> 本文每一条都带 `file:line` 依据。数据库部分的数字来自**当日本机真实库**
> （`C:\Users\<用户名>\AppData\Roaming\steam-insight\steam-insight.db`，2.1 MB，账号 `76561198********`）。
> 复现脚本：`node tools/db-audit.mjs`、`node tools/db-size.mjs`（只读，不改数据）。

## 0. 本次体检的真实底数

| 表 | 行数 | 备注 |
| --- | --- | --- |
| `games` | 69 | 总时长 **4392.4 小时**；58 款非零时长；12 款免费；6 款无价格；11 款从未玩过 |
| `achievements` | 4536 | 已解锁 396（8.7%）；稀有 2698；**稀有且未解锁 2652**；47 条缺全局百分比；515 条隐藏成就 |
| `play_sessions` | **0** | ⚠️ 见 §0.1 |
| `snapshots` | 138 | **只有 2 个采样时刻**，每款游戏恰好 2 行，**69 款游戏的两次快照时长全部相同** |
| `price_history` | 1510 | 每次同步 +75 行；30 分钟间隔 ≈ 131 万行/年（已被 V2 的 `pruneSamples` 兜住） |
| `wishlist` / `discounts` | 2 / 10 | 折扣条目 100% 有到期时间，类别全部为 `hot` |

### 0.1 最值得注意的一件事：取样窗口至今没有产生过任何样本

138 条快照全部落在 **2 个时刻**，且**没有任何一款游戏的 `playtime_minutes` 在两次之间发生变化** ——
所以 `play_sessions` 恒为 0，分析页的四张图、日历热力图、常玩时段在真实账号下永远是空的。

这不是崩溃，是设计使然（Playtime 差分采样只能看到"安装之后、且 App 在运行期间"的增量），
但它意味着：**用户玩了 4392 小时，App 一眼都看不见**，而且要等到"某次同步之间刚好玩过"才开始有数据。

由此得出 V3 最实用的一条：**F-1 手动补录**（让用户不依赖 App 常驻也能积累数据）。

---

## 一、真 Bug（有实锤，按严重度排序）

### BUG-1 · `sync.run()` 无并发闸门 → 会话重复写入 + 互相残杀
`electron/main/sync.ts:341-385` —— `run()` 开头直接 `update({running:true})`，**没有** `if (lastStatus.running) return`。

三个入口可并发触发：`index.ts:90`（手动同步 IPC）、`index.ts:53`（自动同步 `setInterval`）、`notifications.ts:86`（托盘"立即同步"）。
两次 `run()` 重叠时：

- `sync.ts:136-137` 的"读上一次快照 → 写本次快照"两次读到**同一个基准**，`saveSessions` 是裸 `INSERT`（`repository.ts:69`，自增主键、无去重约束）→ **同一段游玩时长被记成两条** `play_sessions`；
- `persist` 里 `purgeStale`（`sync.ts:256-260`）按各自不完整的 keep 列表互删对方的行；
- 模块级 `notifiedThisRun`（`sync.ts:302`）被两条 run 共享 → 通知去重串味。

**修法**：`run()` 首行加 `if (lastStatus.running) return { ok:false, error:'同步进行中' }`；自动定时器回调里同样跳过未完成。

### BUG-2 · 「今日/本周/30 天时长」用 UTC 算，而会话日期是本地 → 每日有 8 小时数字恒为 0
`src/database/queries.ts:37-43` 用 SQLite 的 `date('now')` / `date('now','-7 days')`（**UTC**），
而 `play_date` 由 `sync.ts:53-56` 的 `todayYMD()` 用 `getFullYear/getMonth/getDate` 生成 —— **本地日期**。

UTC+8 下的具体后果：本地 07:00 玩了一小时 → `play_date='2026-09-27'`，但 `date('now')` 还是 `'2026-09-26'` → **`today_minutes` 显示 0**。
每天 00:00–08:00 这个窗口内"今天玩了多久"恒为 0，周/30 天窗口整体错位一天。同一行的 `today_achievements` 也是一个毛病（两边都是 UTC，但用户的"今天"是本地）。

**修法**：在 JS 里用本地日期算出 `YYYY-MM-DD` 作为参数传进 SQL，不要写 `date('now')`。

### BUG-3 · 换账号后旧账号的 `play_sessions` 从不清理，而读数时不按账号过滤
`play_sessions` 有 `steam_id` 列（`schema.ts:59`），但：

- 全仓库**没有任何** `DELETE FROM play_sessions`（已 grep 确认），`purgeStale`（`sync.ts:256-260`）只清 games/achievements/wishlist/discounts；
- `loadSnapshot`（`repository.ts:213`）是 `SELECT * FROM play_sessions`，**没有 `WHERE steam_id = ?`** —— 而 `src/database/queries.ts:12-15` 明明支持 `$steamId` 参数却没被这条主查询用上；
- `detectAccountSwitch`（`user-data.ts:143-149`）**只写了一行日志**（`sync.ts:281-285`），不触发任何清理。

后果：换账号后新账号的分析页混着旧账号的会话。目前因为 sessions=0 还看不见，**一旦开始采样就会踩**。

顺带一个结构隐患：**`snapshots` 表没有 `steam_id` 列**（`schema.ts:156-161`，主键 `(app_id, captured_at)`），
换账号后差分基准其实是上一个账号的 `playtime_forever`，第一次经典的"凭空多出几百小时"就来自这里。

**修法**：`detectAccountSwitch` 命中时对旧 `steam_id` 删 `play_sessions` + `snapshots`；`loadSnapshot` 补 `WHERE steam_id = $steamId`（或由 `user` 决定）。

### BUG-4 · 成就抓取失败一次，该游戏就被永久冻结
`achievement-sync.ts:87` 的 catch 注释写着"它仍不在库里 → 下次同步会自动重试"，但这个承诺不成立：
`planAchievementTargets`（`:39`）只挑 `playedAppIds.has(appId) || !counts.has(appId)`，
而 `counts` 来自数据库聚合 —— **只要以前成功过一次，`counts.has(appId)` 就是 true**。
于是"以前抓过、这次网络抖动失败"的游戏，永远不再重抓，成就数停在旧值，直到用户再去玩它。

**修法**：把失败的 appId 记进 `meta`（或一个失败表），下一轮强制重抓（并给重试次数上限避免永久卡住）。

### BUG-5 · HTTP 429 / 403 被当成成功路径
`electron/main/api-base.ts:70`：`if (res.status !== null && res.status < 500)` → 429（Steam 限流）、403/401（**API Key 无效**）都走"成功"分支去 `JSON.parse`。

- 429 不重试（`retries` 的退避只覆盖 status≥500 分支，白写）；
- Key 填错时 Steam 返回空 JSON/HTML → 上层当作"正常的空结果" → `getOwnedGames` 解析出**空游戏库**，用户看到的是"同步成功，但库是空的"，完全不知道是 Key 的问题。

这是新人最容易撞、最难自查的一个坑。

**修法**：`status >= 400` 一律视为错误；429 单独走更长退避；401/403 抛出可识别的错误类型并由 `NetworkSection` 直接提示"API Key 无效"。

### BUG-6 · `all()` / `get()` 抛异常时泄漏 prepared statement
`electron/main/database.ts:121-143`：只有成功路径调用 `stmt.free()`。`stmt.bind()` / `stmt.step()` 抛错时句柄泄漏，连续出错会累积。

**修法**：`try { ... } finally { stmt.free() }`。

### BUG-7 · `bootstrap` 重复注册 bridge 监听器
`src/store/useAppStore.ts:170-179`：`bridge.sync.onStatus(...)` 与 `bridge.onNavigate(...)` 在每次 `bootstrap()` 里都注册一次，
但**返回值（取消订阅函数）被丢弃**（`src/services/bridge.ts:221-226` 明确返回了 unsubscribe，真 bridge 的注释也说返回了）。

触发路径：`App.tsx:137` 的"重试"按钮会再调一次 `bootstrap()` → 监听器翻倍 → 每次导航入栈两条历史（要按两次 Esc 才退得回去）、同步状态被 `set` 两次。

`main.tsx:5` 已经刻意关掉了 StrictMode，所以只有"重试"这一条路径会命中，但它是用户触得到的。

**修法**：模块级 `let wired = false` 守卫，或用 ref 保存 unsubscribe。

### BUG-8 · 导航去重对参数键顺序敏感
`src/store/useAppStore.ts:150` 用 `JSON.stringify(currentParams) === JSON.stringify(params)`。
`{appId, from}` 与 `{from, appId}` 序列化结果不同 → 去重失效 → 重复历史条目。

**修法**：按键排序后序列化，或改为浅比较。

### BUG-9 · `reports` 表是死的
`repository.ts:75` 的 `saveReport()` 与 `repository.ts:106` 的 `lastSnapshotTime()` **全仓库无人调用**（已 grep 确认），
而 `loadSnapshot`（`repository.ts:220`）仍在每次冷启动 `SELECT * FROM reports` 并全量传输。`reports` 表恒为 0 行。

**修法**：要么接上 Wrapped 报告的归档逻辑（`DataSection` 里"派生报告会重新生成"的文案暗示它应该被用），要么删表删函数避免误导。

---

## 二、优化项

| # | 位置 | 问题 | 建议 |
| --- | --- | --- | --- |
| O-1 | 全局 | **从未执行过 `VACUUM`**（grep 零命中）。`pruneSamples` 每天删行、`DataSection` 支持覆盖导入/清缓存，删出来的空闲页只会被复用，文件**永远不会缩小** | 在"清缓存 / 覆盖导入 / 降采样超过阈值"后跑一次 `VACUUM`；`DataSection` 加一个"优化数据库体积"按钮并显示当前文件大小 |
| O-2 | `src/components/shared/LibraryValueCard.tsx:23` | `libraryValue(games, …)` 没有 `useMemo`，而 `LibraryPage` 每敲一个搜索字符就重渲一次 → **每个按键都全库重算**价格/沉没成本聚合 | `useMemo(..., [games])` |
| O-3 | `src/App.tsx:119-121` | effect 依赖里含 `syncRunning`，而它在一次同步里翻转两次 → `load()`（重建整个 `derived`：展开 4536 条成就、重排 ranking）在**同步开始的瞬间**多跑一次，读到的还是旧数据 | 只依赖 `lastSyncAt` |
| O-4 | 无障碍 | 全项目搜不到 ARIA role，只有 4 个文件里有零散的 `aria-label`（`WishlistPage` 2 个、`ComparePage` 2 个…）。侧边栏、卡片、图表对读屏软件基本不可达 | 至少给导航、按钮、进度条补 `role`/`aria-label` |
| O-5 | 交互持久化 | 搜索词、筛选条件（类型/标签/价格区间）、排序方式关闭再打开就丢 | 存 `settings` 或 localStorage，按路由分键 |
| O-6 | `PriceLineChart` / `TrendLineChart` | 采样点超过一定数量后折线密集（当前每款 23 次 × 降采样后只在 90 天窗口内） | 提供 30/90/全部 三档切换（数据已在 `price_history`，纯前端活） |

---

## 三、新增实用功能

### F-1 ⭐ 手动补录游玩会话（优先级最高）
针对 §0.1 的痛点。给游戏详情页加"我刚玩了一局"，用户填日期 + 时长（可选起止时间），写入 `play_sessions`（`source='manual'`）。

为什么值：现在整条"时间维度"产品线（趋势/热力图/常玩时段/年报）在真实账号下**完全空转**，而它是 App 一半的价值。
有了手动补录，用户当天就能看到图表动起来，而不是等一个不确定的取样窗口。
配套：区分 `source` 并在图表上标注"手动补录 / 自动采样"，保持口径诚实。

### F-2 ⭐ 定期自动备份
`datapack.ts` 的导出/导入已经完备（9 张业务表 + 合并/覆盖两种模式），但**只能手点**。
用户攒了几个月的 `price_history`（史低判定的唯一依据）和 `play_sessions`，一个误删或一次重装就全没了 —— 而这批数据无法从 Steam 重新拉取。

建议：每天/每周自动导出一份数据包到 `%APPDATA%\steam-insight\backups\`，保留最近 N 份（滚动），设置页显示"上次备份时间"。成本很低，收益很高。

### F-3 数据库健康面板
`DataSection` 现在只显示 9 张表的行数。补上：db 文件大小、**近 7 天各表增长曲线**、预计一年后的体量（`db-size.mjs` 已经会算）、以及"立即 VACUUM"按钮。
把 O-1 的收益可视化,V2 加的 `pruneSamples` 效果也能被用户看见而不是黑箱。

### F-4 换账号策略落地
V2 加了 `AccountSwitchBanner`（提示"检测到换账号"），但 `detectAccountSwitch` 目前**只打日志**（BUG-3）。
补一个明确的选择给用户：**保留旧账号数据**（按 `steam_id` 分账号查看 / 导出）还是 **清理**（删旧 sessions + snapshots + games）。
现在的行为是「什么都不做，但两边数据混着显示」，最糟的一种。

### F-5 愿望单增长率 / 降价趋势
1510 条价格采样里藏着一件事：**某款游戏多久降一次、降幅多大**。
可以给出「过去 90 天出现过 N 次降价，平均降幅 X%，最低到过 ¥Y」，比现在的二值「是否史低」有用得多，也能顺便回答「再等等会不会更便宜」。
纯本地计算，不需要任何新接口。

### F-6 Steam 侧轻量资料（等级 / 徽章）
- **F-6a 会员概览**：`GetPlayerLevel` / `GetBadges`（已有 Key 就能调），在首页或账号区块显示 Steam 等级、徽章数、游戏库游戏数。数据便宜、展示简单、情感价值高。
- **F-6b 库存/徽章卡片至一件在导出的海报里**：`PosterOverlay` 已经有框架，加一个"Steam 等级"字段即可。

### F-7 通知 richness 提升
现在 5 类通知（降价 / 史低 / 限时免费 / 心理价 / 稀有成就）都是"有或无"。可以加：
- **"距离史低只差 ¥X"**（比二值判断更容易促成决策）；
- **促销到期倒计时**（`discounts.ends_at` 100% 有值，现在好像没被通知用上 —— 需确认）。

---

## 四、仍然不建议做（理由）

| 条目 | 为什么不做 |
| --- | --- |
| 自建每日游玩时长数据源 / 第三方低价站 | 已在界面明示为能力边界。没有可靠、合规、免费的公开源，做出来就是编数据 |
| 应用内 Steam 登录 | Steam 不提供面向第三方桌面 App 的登录授权；现在的 OpenID + 只读 Key 已经是唯一正确路径 |
| 家庭共享库 / 别人的游戏库 | Steam Web API 不返回这部分，`GetOwnedGames` 只给本人 |
| 好友实时对比 | 需要逐个好友拉游戏库 + 成就，请求量随好友数线性增长（而 Steam 的 429 限流本来就容易触发，见 BUG-5），收益与复杂度不成正比。 |
| 多语言 i18n | 只面向中文 Steam 用户，全量抽文案的 ROI 为负；真要做也只建议中/英两套且放到最后 |
| 自动云同步到用户自己的网盘 | 涉及用户凭据保管 + 网络环境不可控，与本项目的"零后端"定位冲突。本地定期备份（F-2）已经解决 90% 的诉求 |

---

## 五、建议的动手顺序

1. **先修 BUG-2**（每日必有的一件 numbers 不准）和 **BUG-1**（并发会脏数据）—— 都是小改动、直接影响用户每日所见。
2. **BUG-3 + F-4** 一起做（换账号的正确语义），顺手修 `snapshots` 缺 `steam_id` 的结构隐患。
3. **BUG-5**（Key 无效被吞成空库）—— 新人第一道坎。
4. **F-1 + F-2** —— 两个"提高 App 有没有用"的功能，性价比最高。
5. 剩下的 bug（4/6/7/8/9）和优化（O-1~O-6）按批次清理。
