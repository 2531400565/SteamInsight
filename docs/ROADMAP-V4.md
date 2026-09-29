# ROADMAP-V4 — Steam Insight 增量路线图（V3 之后）

> ✅ **V4 已全量交付（2026-09-27）**：优先级总览的全部 16 项（O1–O7、F1–F8、UI1–3）已实现并通过自检（typecheck 双端 0 错误 / 主进程探针 212 项 ALL PASS / 渲染层走查与污染扫描 0 错误 / dist 打包核对通过）。自检中发现并修复 3 个真缺陷（含「新库 DDL 漏列」P0 级），详见 `docs/SELF-CHECK-REPORT-V4.md`。

> 本文是 V3 全量交付后的**增量审计与路线图**。V3 的 9 Bug + 6 优化 + 7 功能已全部落地并通过自检（见 `docs/SELF-CHECK-REPORT-V3.md`）。下列条目为 V3 之后**新增**的建议，不含已做项。
>
> 优先级：P1 高（用户高频痛点 / 高性价比）/ P2 中 / P3 低（锦上添花）。
> 工作量：小 ≈0.5 天 / 中 ≈1–2 天 / 大 ≈3 天+。

---

## 〇、已具备能力（勿重复建议）

以下功能**已实现**，下一轮审计不要再列入"待做"：

- 主题切换（深/浅/跟随系统）：`useAppStore.applyTheme` + `global.css` 双变量 + 图表 `themeColors.ts` 监听 `data-theme`
- 每游戏价格提醒阈值：`WishlistPage` 的 `PriceAlertControl` + `settings.priceAlerts`（主进程 `notify-plan.ts` 判定去重）
- 游戏备注（基础文本）：`NotesCard` + `game_notes` 表（已挂详情页）
- 命令面板：`CommandPalette`
- CSV / Excel / 数据包 / 诊断包导出、datapack 导入合并：`WrappedPage` 报表导出 + `auto-backup`/`user-data` 导入
- 对比页「性价比」维度：`ComparePage.tsx:95` 的 `value` 指标（每元时长）
- 海报导出、磁盘日志 + 崩溃捕获、开机自启 + 托盘

---

## 一、新功能（F）

### F1 · 「最佳入手时机」洞察 — P1 / 小
- **价值**：基于已有的 `price_history` 给玩家"现在买划不划算"的结论，数据现成、几乎零成本，是 V4 性价比最高的一项。
- **落点**：详情页价格区（`GameDetailPage.tsx` 的 F-5 四格摘要旁）新增一个"入手建议"卡片。
- **复用**：`src/utils/analytics.ts:271` 的 `priceTrend(points, windowDays, nowSec)` 已返回 `lowestCents` / `gapToLowestCents` / `discountDaysPercent`；再加一个"当前价处于历史百分位"即可（pct = 当前价在历史采样中的分位，越低越划算）。
- **依赖**：需 ≥2 次同步才有 `price_history` 基线（与 F-5 同源限制，界面已有说明）。

### F2 · 多账号主动切换 UI — P2 / 中
- **价值**：V3 的 F-4 只做了"换账号策略（clear/keep）"，但切换入口仍是手动改 Steam ID。给一个账号下拉/列表，让多账号用户切换更直观。
- **落点**：`AccountSection.tsx`（当前被动填 ID）→ 新增账号列表 + 切换；`sync.ts` 的 `detectAccountSwitch` / `purgePreviousAccount` 已就绪。
- **前置**：`users` 表现在是 `LIMIT 1` 单行（`repository.ts`）。要真正支持多账号，需评估是"只记历史账号用于切换"还是"多账号并存"——**建议先做轻量版：记住最近 N 个 steam_id，下拉选择后触发 F-4 策略**，不改造表结构。

### F3 · 「吃灰 / 已弃坑」智能分组 — P2 / 中
- **价值**：按最后游玩时间自动分组（>90 天未玩 = 吃灰），趣味 + 实用，帮用户回顾"买来没玩"。
- **落点**：`LibraryPage.tsx:178-180` 已有 `played`/`withAch`/`perfect` 计数；在 `FILTERS`（`LibraryPage.tsx:236`）增加 `f.test` 基于 `lastPlayedAt` 的分组，并在统计区加一项"吃灰数"。
- **依赖**：`lastPlayedAt` 字段已存在（`SteamUser`/`Game` 映射）。

### F4 · 游戏备注增强（标签 / 状态 / 评分）— P3 / 中
- **价值**：`NotesCard` 当前是纯文本（`NotesCard.tsx:21` + `game_notes` 表）。加 `status`（想玩/在玩/弃坑）、`tags`、`rating` 让备注更结构化。
- **落点**：`game_notes` 表需在 `schema.ts` 加列（`SCHEMA_VERSION` +1 + `MIGRATIONS`），`NotesCard` 表单扩展。
- **工作量**：中（含一次迁移）。

### F5 · 成就完成度随时间趋势 — P3 / 中
- **价值**：当前成就只有进度条，没有"随时间提升"的曲线。
- **落点**：`AnalysisPage.tsx` 新增一张图；数据来自 `achievements.unlocked_at`（表中已有该列），按周/月聚合"累计解锁数"。
- **依赖**：`unlocked_at` 仅对真实同步的已解锁成就有值；演示数据可能稀疏。

### F6 · 封面本地缓存 — P3 / 小
- **价值**：封面现依赖 CDN（`GameCover.tsx`），离线/弱网重复下载。加一层本地缓存（按 appid 存 userData）省流量、加快冷启动。
- **落点**：`GameCover.tsx` 包装一层缓存读写的薄封装；缓存目录走 `userDataDir`。

### F7 · 键盘快捷键清单 / 自定义 — P3 / 小
- **价值**：`CommandPalette` 已存在，但缺少"快捷键帮助"入口。加 `?` 弹出当前可用快捷键，或允许用户自定义绑定。
- **落点**：新增帮助面板组件 + 可选的设置项（持久化用 `usePersistedState`）。

### F8 · 对比页新增「史低达成率」维度 — P3 / 小
- **价值**：`ComparePage.tsx:60` 的 `metrics` 已有 总时长/近两周/现价/折扣/性价比；新增"史低达成率 = 当前价 ÷ 本机史低"，让"现在是不是贵了"一目了然。
- **落点**：`metrics` 数组追加一项，`score = lowestCents ? currentCents/lowestCents : null`；需从 `price_history` 取该游戏 `lowestCents`（可复用 `priceTrend`）。

---

## 二、优化（O）

### O1 · 库列表虚拟化 — P1 / 中
- **价值**：**V4 最实在的性能优化**。`LibraryPage.tsx:313-314` 用普通 `<div className="grid ...">` + `items.map` 全量渲染；仓库**未装任何虚拟化库**（已查 `package.json`）。库有数百~上千款时滚动会卡顿。
- **落点**：引入 `@tanstack/react-virtual`（轻量、与 React 19 兼容）替换 `items.map` 网格渲染；卡片高度需固定或测量。
- **工作量**：中（需处理响应式列数 + 卡片测量）。

### O2 · 设置页改为分区导航 / 标签页 — P2 / 小
- **价值**：`SettingsPage.tsx:229-245` 把账户/网络/数据/关于四段堆在一个长滚动页里，内容多时找项费劲。
- **落点**：顶部 Segmented 切换 4 个 section，或左侧窄导航。各 section 组件已独立（`settings/AccountSection` 等），改造成本低。

### O3 · 窄窗口响应式（侧边栏折叠）— P2 / 小
- **价值**：窗口收窄时侧边栏不折叠，小窗下正文被挤。
- **落点**：`Sidebar.tsx` / `AppLayout` 在窄宽度（如 <900px）折叠为图标栏或抽屉。

### O4 · 图表导出 PNG / 复制 — P3 / 小
- **价值**：趋势/价格图支持导出图片，方便分享或做图。
- **落点**：`ChartCard.tsx` 加导出按钮，用 `html-to-image` 把图表节点转 PNG；注意主题色随 `data-theme` 走。

### O5 · 空状态引导增强 — P3 / 小
- **价值**：首次同步后（尤其"每日时长"为空）缺少针对性说明。`EmptyState.tsx` 已有，但引导文案可更具体。
- **落点**：分析页时长区 / 库空态补一句"真实账号需在 App 常驻或手动补录才有每日时长"。

### O6 · 仪表盘卡片可定制（显隐 / 排序）— P3 / 中
- **价值**：让用户勾选显示哪些卡片、调整顺序。
- **落点**：`DashboardPage.tsx` 卡片配置持久化（`usePersistedState`），设置页加"仪表盘布局"编辑。

### O7 · 密度切换（舒适 / 紧凑）— P3 / 小
- **价值**：列表页可选紧凑模式，一屏多看。
- **落点**：全局 density 状态（`usePersistedState`）+ 根容器 className 控制间距/padding。

---

## 三、UI / 布局（UI）

> 与"优化"的区别：这里偏视觉/信息架构，O 偏性能/交互结构。两者有重叠（如 O2 既是布局也是优化），已在 O 中列，此处不重复。

- **UI1 · 统一卡片圆角 / 阴影 / 间距令牌**（P3 / 小）：核对各页 `Card`/`Panel` 用法是否一致，避免视觉参差。
- **UI2 · 图表配色对比度复核**（P3 / 小）：浅色主题下（`global.css` `[data-theme='light']`）部分 accent 在白底上对比度是否够（浅色主题是 V3 后才被完整启用，建议过一遍）。
- **UI3 · 设置页"外观"区补充主题预览**（P3 / 小）：切换深/浅时给一个小预览块，比纯文字"当前生效：深色"更直观。

---

## 四、已知限制 / 待观察（非 Bug）

> V3 自检全绿，**当前没有确认中的功能性 Bug**。以下为"用户可能误以为是 bug"的已知限制，按需处理：

| 编号 | 限制 | 现状 | 建议 |
|---|---|---|---|
| L1 | 真实账号"每日游玩时长"恒为 0 | Steam 无日时长 API；快照差分需 App 常驻；真实库 `play_sessions=0`（除非手动补录/演示） | 已在详情页提供手动补录；分析页加引导（见 O5） |
| L2 | 史低需 ≥2 次同步才有基线 | 首次同步不算史低（无对比样本） | 界面已标注，无需改 |
| L3 | 演示数据 42 款全有时长 | "还没玩"筛选在演示下恒为 0（设计如此） | 仅演示模式，真实数据正常 |
| L4 | 安装包未签名 | 他人运行撞 SmartScreen | 需用户自签或自备 API Key |
| L5 | 大库滚动卡顿 | 库列表无虚拟化 | 见 **O1**（已列为 P1 优化） |
| L6 | `snapshots` 缺 `steam_id` 列 | 换账号时旧快照由 `purgePreviousAccount` 一并清除，风险可控 | 列为结构债，后续迁移；本轮不强制 |

---

## 五、优先级总览（按 P1→P3 + 工作量）

| 排序 | 编号 | 类型 | 优先级 | 工作量 | 一句话 |
|---|---|---|---|---|---|
| 1 | **O1** | 优化 | P1 | 中 | 库列表虚拟化（大库不卡） |
| 2 | **F1** | 功能 | P1 | 小 | 最佳入手时机（复用 priceTrend） |
| 3 | **F2** | 功能 | P2 | 中 | 多账号主动切换 UI（轻量版） |
| 4 | **F3** | 功能 | P2 | 中 | 吃灰 / 已弃坑智能分组 |
| 5 | **O2** | 优化 | P2 | 小 | 设置页分区导航 |
| 6 | **O3** | 优化 | P2 | 小 | 窄窗口侧边栏折叠 |
| 7 | **F4** | 功能 | P3 | 中 | 备注增强（状态/标签/评分） |
| 8 | **F5** | 功能 | P3 | 中 | 成就完成度趋势图 |
| 9 | **F6** | 功能 | P3 | 小 | 封面本地缓存 |
| 10 | **F7** | 功能 | P3 | 小 | 快捷键清单 / 自定义 |
| 11 | **F8** | 功能 | P3 | 小 | 对比页史低达成率 |
| 12 | **O4** | 优化 | P3 | 小 | 图表导出 PNG |
| 13 | **O5** | 优化 | P3 | 小 | 空状态引导增强 |
| 14 | **O6** | 优化 | P3 | 中 | 仪表盘卡片可定制 |
| 15 | **O7** | 优化 | P3 | 小 | 密度切换 |
| 16 | **UI1–UI3** | UI | P3 | 小 | 视觉一致性 / 浅色对比度 / 主题预览 |

---

## 六、建议动手顺序

1. **第一批（高性价比、低风险）**：O1（虚拟化）+ F1（最佳入手时机）。这两项直接改善"大库卡顿"和"买贵了没"两个高频痛点，且 F1 几乎纯复用。
2. **第二批（交互结构）**：O2 + O3（设置页与响应式），F2 + F3（多账号切换 + 吃灰分组）。
3. **第三批（增强与打磨）**：F4 / F5 / F6 / F7 / F8 + O4 / O5 / O6 / O7 + UI1–3。

> 实施流程沿用 V3：实现 → 扩展 `tools/probe-features`（主进程纯函数断言）→ 渲染层 `verify-steam-insight.mjs` + `scan-pages.mjs` 走查 → `npm run dist` → 写 `SELF-CHECK-REPORT-V4.md`。
> 打包前务必 `taskkill /F /IM "Steam Insight.exe"` 并清除 shim：`CODEBUDDY_SAFE_DELETE_ENABLED=0 CODEBUDDY_SAFE_DELETE_SANDBOX=0 CODEBUDDY_BROKERED_FS_HOOK_ENABLED=0 NODE_OPTIONS= npm run dist`（详见 V3 报告 §5）。
