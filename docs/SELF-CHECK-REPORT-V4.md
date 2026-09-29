# Steam Insight V4 自检报告

> 迭代范围:`docs/ROADMAP-V4.md` 优先级总览的 **全部 16 项**(O1、F1、F2、F3、O2、O3、F4、F5、F6、F7、F8、O4、O5、O6、O7、UI1–3)。
> 自检流程与 V3 一致:全量 typecheck → 主进程探针 → 渲染层走查 + 文本污染扫描 → CDP 定向验证 → `npm run dist` 打包核对。
> 自检日期:2026-09-27

---

## 1. 交付清单(16/16)

| # | 项 | 优先级 | 状态 | 实现落点 |
|---|-----|--------|------|----------|
| 1 | O1 库列表虚拟化 | P1 | ✅ | `LibraryPage` 虚拟化滚动(V4 第一批) |
| 2 | F1 最佳入手时机洞察 | P1 | ✅ | 复用 `priceTrend()` + 历史百分位,`AnalysisPage` |
| 3 | F2 多账号主动切换 UI(轻量版) | P2 | ✅ | `useRecentAccounts`(localStorage 记最近 5 个)+ `AccountSection` 下拉切换 |
| 4 | F3 吃灰 / 弃坑智能分组 | P2 | ✅ | `LibraryPage` FILTERS 基于 `lastPlayedAt` 分组 |
| 5 | O2 设置页分区导航 | P2 | ✅ | `SettingsPage` 改 7 段 Segmented 标签页,命令面板 `tab` 参数直接切节 |
| 6 | O3 窄窗口侧边栏折叠 | P2 | ✅ | `Sidebar` `matchMedia(≤900px)` 自动收起 + 手动覆盖,收起态 68px 图标栏 |
| 7 | F4 备注增强(状态 / 标签 / 评分) | P3 | ✅ | `game_notes` 加 `status`/`tags`(v6 迁移),`NotesCard` 表单扩展 |
| 8 | F5 成就完成度趋势图 | P3 | ✅ | `AchievementTrendChart` 按月累计 `unlockedAt`,`AnalysisPage` 收尾新卡 |
| 9 | F6 封面本地缓存 | P3 | ✅ | `si-cover://` 自定义协议 + `userData/covers` 磁盘缓存 + CDN 回退链 |
| 10 | F7 快捷键清单 | P3 | ✅ | `ShortcutsHelp`(`?` 唤起)+ 命令面板入口;不做自定义绑定(取舍见 §3) |
| 11 | F8 对比页史低达成率 | P3 | ✅ | `ComparePage` metrics 追加「当前价 ÷ 本机史低」 |
| 12 | O4 图表导出 PNG | P3 | ✅ | `ChartCard` 复活 + `html-to-image` 导出(CSS 变量内联,主题色随行) |
| 13 | O5 空状态引导增强 | P3 | ✅ | 分析页时长区 / 库空态补真实口径说明 |
| 14 | O6 仪表盘卡片可定制 | P3 | ✅ | `useDashboardLayout`(显隐 + 排序)+ 设置 → 外观 → 布局编辑器 |
| 15 | O7 密度切换 | P3 | ✅ | `useDensity` + `<html data-density>` + CSS 属性选择器覆盖(main 作用域) |
| 16 | UI1–3 视觉打磨 | P3 | ✅ | UI3 主题预览;UI1 令牌核查通过;UI2 浅色对比度修正(见 §3) |

---

## 2. 自检结果总览

| 检查项 | 工具 / 方式 | 结果 |
|--------|-------------|------|
| 渲染层类型检查 | `npm run typecheck:web` | ✅ 0 错误 |
| 主进程类型检查 | `npm run typecheck:node` | ✅ 0 错误 |
| 主进程探针 | `tools/probe-features`(真实 Electron + 临时库) | ✅ **ALL PASS 212 项 / 0 失败**(新增 V4 组 M1–M14) |
| 渲染层全站走查 | `verify-steam-insight.mjs`(10 页 + 详情页 + 命令面板) | ✅ console error 0 / warning 0 |
| 文本污染扫描 | `scan-pages.mjs`(NaN / undefined / var(--si- 泄漏等) | ✅ 10 页 0 命中 |
| V4 定向验证 | CDP 直读 DOM(见 §4) | ✅ 8 组断言全过 |
| 打包 | `npm run dist`(清 shim env + taskkill) | 见 §5 |

### V4 新增探针断言(M 组,`features-probe.cjs`)

- **F4**:`SCHEMA_VERSION === 6`、v6 迁移含 status/tags、status+tags 写入读回、部分更新保留其余字段、清空 tags 不删行、四字段全空删行。
- **O6**:默认顺序全可见、隐藏过滤、调序生效、未知 key 丢弃 + 新增卡片补末尾、全隐藏返回空。
- **F6**:CDN URL → `si-cover://cover/<appid>.jpg?u=` 换算、原始 URL 编码无损、**成就图标 URL 原样放行**(M14,见 §3)。
- 顺带把 V3 的 L1 断言从「升到 5」更新为「升到 6」。

---

## 3. 自检发现并修复的缺陷(本轮最有价值的部分)

### BUG-V4-1(P0):F4 只加了迁移,新库 DDL 漏加列 —— 探针炸出

主进程探针 J 组首次运行即炸:`table game_notes has no column named status`。

**根因**:`schema.ts` 的 `MIGRATIONS[6]` 加了 `ALTER TABLE ... ADD COLUMN status/tags`,但**新库的 `CREATE TABLE game_notes` 没有同步加这两列**。新库启动时直接置 `SCHEMA_VERSION = 6`、跳过全部迁移 → 建出来的表缺列 → `saveNote` 的 upsert 必然失败。老库用户(走迁移)反而正常,这让它成为「只在全新安装 / 探针临时库上炸」的隐蔽缺陷,typecheck 与 UI 走查都不可能发现。

**修复**:CREATE TABLE DDL 同步补 `status TEXT NOT NULL DEFAULT ''` 与 `tags TEXT NOT NULL DEFAULT '[]'`。

**教训**(与项目记忆中「改库结构必须走迁移器」互为补充):**迁移器防的是「老库缺新列」,DDL 防的是「新库缺新列」,两者必须同一 PR 内成对修改;只跑 typecheck:web 永远碰不到它,主进程探针 + 临时库是唯一能抓住这条路径的自动化手段。**

### BUG-V4-2(P2):封面 URL 正则误吞成就图标 —— 探针 M14 抓出

`toCoverCacheUrl` 原用 `/\/apps\/(\d+)\//` 匹配,而成就图标的 `steamcommunity/public/images/apps/<id>/...` 里也有裸的 `/apps/<id>/`,会被错误地换算进封面缓存协议。当前 GameCover 只接封面 URL 所以没有用户可见故障,但它是下次复用时的暗雷。

**修复**:正则收窄为 `/\/steam\/apps\/(\d{2,10})\//`,并用探针 M14 固化(成就图标 URL 必须原样放行)。

### BUG-V4-3(P1):`usePersistedState` 多实例不同步 → O7 密度切换失效 —— CDP 验证抓出

设置页点「紧凑」后 localStorage 正确写入 `compact`,但 `<html data-density>` 纹丝不动。根因:`useDensity()` 同时挂在**常驻的 AppLayout** 和设置页上,各自是独立的 `useState` —— 设置页实例写回 localStorage,AppLayout 实例完全不知道(O6 之前"看似正常"只是因为页面切换会重挂载、恰好重读;AppLayout 不重挂载,暴露了这一点)。

**修复**:`usePersistedState` 写入后广播 `si-persist-changed` CustomEvent,同 key 的其它实例重读(自己收到自己的广播时读到相同值,React bail out,零多余渲染)。这是对全部 `usePersistedState` 使用方的通用加固。

### BUG-V4-4(P3):V3 探针断言过时

`L1 SCHEMA_VERSION 已升到 5` 在 v6 迁移后必失败,更新为 6。非产品缺陷,属于探针自身要跟着版本走。

---

## 4. CDP 定向验证明细(渲染层真实 DOM)

| 项 | 断言 | 结果 |
|----|------|------|
| O4 | 首页两张图卡各带 `aria-label*="导出"` 按钮(共 2) | ✅ |
| F7 | `?` 唤起清单(含 Ctrl+K 行、? 行、固定绑定说明),Esc 关闭,`data-esc-layer="shortcuts"` | ✅ |
| O6 | 外观 tab 布局编辑器 5 行 + Switch;隐藏「今日摘要」→ 首页该区块消失、其余仍在;「恢复默认」出现并可用;恢复后按钮消失 | ✅ |
| O7 | 点「紧凑」→ `data-density="compact"`,点「舒适」→ 回 `comfortable`(BUG-V4-3 修复后) | ✅ |
| F2 | 注入两条最近账号 → 账号 tab 出现「最近账号」块;下拉含昵称项与「…尾号」项;未选候选时「切换并同步」禁用 | ✅ |
| F4 | 详情页备注卡:状态 Select 含 未设置/想玩/在玩/弃坑,标签输入与标签说明在位 | ✅ |
| F5 | 分析页出现「成就完成度趋势」卡片 | ✅ |
| F8 | 对比页选 2 款游戏后出现「史低达成率」指标 | ✅ |

**验证手法备注**:palette 的 Esc 挂在输入框的 React 合成事件上,合成测试必须把 `KeyboardEvent` 派发到 React 树内元素(body/document 不经过 React root,会误判为"关不掉");ShortcutsHelp 用原生 `document` 监听,body 派发即可。两套监听路径都要按真实事件流测,否则会得到假阴性。

---

## 5. 打包与产物

- 打包前按既定流程 `taskkill /F /IM "Steam Insight.exe"`(4 个运行实例)+ 清空 shim env(`CODEBUDDY_SAFE_DELETE_ENABLED/SANDBOX/BROKERED_FS_HOOK=0`,`NODE_OPTIONS=`)。
- `npm run dist` 成功,**1 分 9 秒**完成;产物时间戳核对新鲜:`dist/Steam Insight-1.0.0-setup.exe`(12:41:29)与 `dist/win-unpacked/Steam Insight.exe`(12:41:02)。
- 打包版冒烟(本沙盒需 `--no-sandbox --disable-gpu ...` 禁 GPU flags,属环境限制非产物缺陷):进程存活,应用日志确认 **`[cover] 封面缓存协议已注册`** 与「主进程就绪」(source=api,复用真实库)—— F6 协议注册在真实打包环境下工作正常。

---

## 6. 已知限制(如实告知,非缺陷)

1. **F2 是轻量版**:只记「最近 5 个 steam_id + 昵称」(localStorage),数据仍按单账号存储;切换 = 改 settings + 重新同步,数据面的换账号策略(清理 / 保留旧会话)由既有 F-4 逻辑全权处理。多账号并存仍需表结构改造,不在本轮范围。
2. **F7 快捷键固定 5 条**:做自定义绑定需要冲突检测 / 持久化 / 误触恢复,维护成本大于收益;界面已注明「固定绑定,全部功能可纯鼠标完成」。
3. **F6 缓存只增不清**:单张封面 30–100KB,几百款约几十 MB;「自动清理」省的空间不值得引入「封面突然全没」的困惑。用户手动删 `userData/covers` 目录即可,下载会自动重建。
4. **F6 降级链**:协议失败(未注册 / 离线未命中)自动退回直连 CDN,再失败才字母占位 —— 缓存层损坏最多退化为旧体验,不会更差。
5. **每日时长口径不变**:仍来自快照差分采样 + 演示数据集;「史低」仍是本机采样口径,首次采样无基线不算史低。
6. **F5 老账号需再同步**:成就趋势依赖 `unlocked_at`,首次同步没有历史解锁时间,界面空态已指向「再同步一次」。

---

## 7. 结论

V4 的 16 项全部交付;自检链(typecheck → 探针 → 走查 → 扫描 → CDP → 打包)全绿。本轮自检共抓出 **3 个真缺陷**(其中 BUG-V4-1 属于「新库必炸」级)并全部修复回归 —— 与 V3 的结论一致:**探针与走查不是仪式,是最后防线**。
