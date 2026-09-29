# Steam Insight 自检报告 V2

> 自检日期：2026-09-26 晚
> 范围：[`ROADMAP-V2.md`](ROADMAP-V2.md) 中除「仍然不建议做」以外的**全部条目**（Tier 0 / Tier 1 / Tier 2 / 新表新采集 / Tier 3 可落地项）。
> 结论先行：**全部交付，153/153 功能断言通过，渲染层 0 报错 0 警告，文本污染 0 命中，安装包已重新出包且新代码确认进包。**

---

## 0. 一句话结论

V2 清单里的 9 个功能项 + 3 个新表项 + 2 个工程项全部落地；自检过程中额外抓出并修掉 **3 个真实缺陷**（其中 1 个是「分析页空白」这个陈年问题的根因）。

---

## 1. 静态关（全部通过）

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| `npm run typecheck`（node + web 双向） | **0 错误**（exit 0） | 全部 V2 改动后跑的 |
| `npm run dist` | **exit 0** | 出包 `dist/Steam Insight-1.0.0-setup.exe`（123,242,498 B）与 `dist/win-unpacked/Steam Insight.exe`，时间戳 22:22/22:23（本轮新出，非旧包） |
| asar 源码泄漏检查 | **0** | `asar list` 中 `^\src\` / `^\electron\` 命中 0，源码没有打进包 |
| asar 关键资源 | **齐全** | `out/` 10 个条目在包内；`sql.js` 的 `sql-wasm.wasm` 等 WASM 资源在包内 |
| **新代码确认进包** | **确认** | 见下 |

**「新代码进包」的证据**（不是只看打包日志成功）：

| 位置 | 标记 | 命中次数 |
| --- | --- | --- |
| 主进程 bundle（`out/main/index.js`，已入 asar） | `game_notes` / `hunt_picks` / `pruneSamples` / `SCHEMA_VERSION` | 11 / 14 / 3 / 5 |
| 渲染层 bundle（`out/renderer/assets/index-*.js`，已入 asar） | `游戏对比` / `笔记` / `追猎清单` / `历史最低` | 3 / 3 / 9 / 6 |

---

## 2. 功能自检：feature probe 153/153

扩展探针（`tools/probe-features/`，esbuild 单包后在真实 Electron 运行时里跑）**153 条断言全部通过，0 失败**（日志：`probe-6.log`）：

| 组 | 覆盖 | 对应 ROADMAP 项 |
| --- | --- | --- |
| A | 连通性自检判定逻辑 | （V1 回归） |
| B | 数据包导入导出 | （V1 回归） |
| C | 价格阈值提醒 | （V1 回归） |
| D | 成就追猎通知 | （V1 回归） |
| E | 设置归一化 | （V1 回归） |
| F | 日志落盘 | （V1 回归） |
| G | **库价值口径**（加权折扣 ≠ 两 SUM 相除） | N1-1 |
| H | **最稀有成就榜 + IPC 瘦身**（成就紧凑传输形态） | N1-3 / Tier3 |
| I | **采样保留策略**（90 天窗口 + 每游戏最多 2 条快照 + 幂等 + 史低不失真） | N0-1 |
| J | **笔记 / 评分 / 追猎清单 / 换账号检测**（22 条：写入、部分更新、夹取、截断、幂等、清理已解锁、换账号判定） | 新表项 + Tier3 |
| K | **回归：命名参数绑定**（曾因参数名笔误静默失败的一类） | 本轮修缺陷的回归锁 |

保留策略关键断言（I 组）：采样确实被瘦身、窗口内采样未删、窗口外旧采样已降采样、**历史最低价被保留**（史低判定不失真）、每游戏最多 2 条快照、**重复执行幂等**。

---

## 3. 渲染层走查（无头 Chrome + CDP，12 张截图）

对构建产物 `out/renderer`（静态服务器 + 无头 Chrome，`tools/verify-steam-insight.mjs`）走查 **10 个页面 + 游戏详情 + 命令面板**，截图在 `shots-v2/`：

| 截图 | 内容 | 肉眼复核结果 |
| --- | --- | --- |
| 01–10 | 首页 / 分析 / 库 / **对比** / 成就中心 / **成就追猎** / 商城 / 愿望单 / Wrapped / 设置 | 全部正常渲染 |
| 04-compare | **游戏对比页**（N1-4）：选 0/4、游戏胶囊、口径说明 | ✅ |
| 06-hunt | **成就追猎**：星标（☆）、剩余最少优先、「只看我的追猎清单」开关 | ✅ |
| 03-library | **库价值与性价比卡**（N1-1）：库当值周价 ¥3,978、加权折扣率、性价比 1.49 时/元、最划算 TOP5 + **类型/标签筛选**（N1-2）+「游戏对比」入口 | ✅ |
| 11-game-detail | **游戏详情**：GTA V 详情 + 月度/年度图 + **「价格走势」卡**（N0-2，当前 ¥119.00） | ✅ |
| 12-command-palette | **命令面板**（N2-2）：搜索框、页面直达 + 设置子跳转、「共 42 项都可直达」 | ✅ |

| 运行期检查 | 结果 |
| --- | --- |
| console.error / 未捕获异常 | **0** |
| console.warning | **0** |
| **文本污染扫描**（`tools/scan-pages.mjs`，10 页，可见文本 + **SVG `<text>` 节点**，查 `NaN / undefined / Infinity / [object / var(--si- / Invalid / null`） | **0 命中** |

> 走查脚本这次是**自足**的：不依赖上一次残留状态，自己等首屏、自己点侧边栏。侧边栏匹配修正过一次——标签带数字角标（`成就追猎205`）、`Steam Wrapped` 无空格，精确匹配会漏，改为「去空白 + 前缀/包含（限长度）」后 10/10 全部命中。

---

## 4. 打包产物冒烟

新出的 `dist/win-unpacked/Steam Insight.exe` 直接启动（软件渲染参数组）：

- 日志出现 `DevTools listening on ws://127.0.0.1:9445/...` → Chromium 初始化完成；
- **3 个 `Steam Insight.exe` 进程常驻**（主 + GPU + 渲染辅助）→ 消息循环在正经跑；
- 日志里的 `ContextResult::kFatalFailure: Failed to create shared context` 是本沙盒无 GPU 的预期输出（与 V1 冒烟一致），不影响主进程与渲染层 JS 执行。

---

## 5. 本轮实测修掉的缺陷（3 个）

| # | 缺陷 | 根因 | 修法 | 回归锁 |
| --- | --- | --- | --- | --- |
| 1 | **「沉没成本」总数与列表对不上** | 卡片把**全部**有投入的游戏求和，但列表只显示 TOP 8，两个数不是一个口径 | `library.ts` 改为**只对切片后的 TOP N 求和**，文案如实 | 探针 G 组 |
| 2 | **成就图标全裂** | 常量写的是 `cdn.cloudflare.steamstatic.com`，但库里 4536 条图标全是 `steamcdn-a.akamaihd.net`（本环境 akamai 不通、cloudflare 通） | `ACHIEVEMENT_ICON_BASE` 改为 cloudflare，并保持「非匹配 host 的 URL 原样透传」 | 探针 H 组 |
| 3 | **分析页空白的根因（陈年问题）** | SQL 占位符写 `$appId`，参数却传 `{ app_id: appId }`；`normalizeParams()` 只把 `app_id` 规范成 `$app_id`，于是 `$appId` **永远绑不上 → `lastSnapshot` / `priceLowest` 恒为 null**，`saveNote` / `clearNote` / `togglePick` 也全部**静默失败**（不报错、就是不生效） | 5 处调用点统一改为 `{ appId }`（`repository.ts` 2 处 + `user-data.ts` 3 处） | **探针 K 组**（5 条：取到最近快照 / 不存在返回 null 而非 0 / 取到史低 / 无价格返回 null / 差分基线可用） |

> 第 3 个是这轮最有价值的发现：它同时解释了「分析页为什么一直是空的」「笔记为什么存不上」「追猎清单为什么点不动」三个现象，而且全程无报错，只能靠主动断言抓。

---

## 6. 交付清单（ROADMAP-V2 逐项）

| ROADMAP 项 | 状态 | 证据 |
| --- | --- | --- |
| N0-1 采样保留策略 | ✅ | `user-data.ts pruneSamples`；探针 I 组 6 条 |
| N0-2 价格走势图接上 | ✅ | `GameDetailPage` 挂载 `PriceLineChart`；截图 11 |
| N1-1 库价值与性价比 | ✅ | `LibraryValueCard`；截图 03；探针 G 组 |
| N1-2 类型/标签筛选 | ✅ | 库页筛选条（全类型/开放世界/剧情/射击…）；截图 03 |
| N1-3 最稀有成就榜 | ✅ | `rarestUnlocked()`（已知占比升序、未知排最后）；探针 H 组 |
| N1-4 游戏对比（2–4 款） | ✅ | `ComparePage` + 路由 + 库页入口；截图 04 |
| N2-1 等待期引导 | ✅ | 分析页空状态给「还要等多久」+ 会话为空时的累计排行兜底 |
| N2-2 命令面板 Ctrl+K | ✅ | `CommandPalette`（42 项直达、↑↓/Enter、Esc 关闭）；截图 12 |
| N2-3 键盘快捷键 | ✅ | Esc 返回上一页（30 条历史栈；输入框聚焦与浮层打开时让路） |
| 新表：游戏笔记/评分 | ✅ | `game_notes` + `NotesCard` + 星级；探针 J1–J9 |
| 新表：追猎清单自定义 | ✅ | `hunt_picks` + 星标开关 + 「只看追猎清单」；探针 J10–J16 |
| 附带：换账号检测 | ✅ | `detectAccountSwitch` + `AccountSwitchBanner`；探针 J17–J20 |
| Tier3：`games.steam_id` 列 | ✅ | schema v3 迁移；多账号不再互相覆盖 |
| Tier3：成就 IPC 瘦身 | ✅ | 紧凑传输形态（图标只传文件名，渲染层 expand）；探针 H 组 |
| 禁区（自建时长源 / 第三方史低 / 应用内账密登录 / 联网后端） | ✅ 未做 | 与「仍然不建议做」清单一致，一条没碰 |
| Tier3：代码签名 / 自动更新 | ⏸ 未做 | 签名需购证书（当前 0 签名，对方双击会撞 SmartScreen）；updater 引新依赖，留待单独决策 |

---

## 7. 未验证项（如实列出）

| 项 | 为什么 | 已有的替代证据 |
| --- | --- | --- |
| 换账号横幅的**真实截图** | 预览模式 `accountSwitch` 恒为 null，无真实换账号场景可触发 | 探针 J17–J20（同账号不报、换账号报出上一账号及其游戏数、未标记库不误报） |
| 打包态 CDP 交互驱动 | 沙盒网络隔离，外部连不上打包 exe 的调试端口（**沙盒限制，不是应用问题**） | 打包态启动冒烟（§4）+ 渲染层走查用的是同一份构建产物 |
| 真实 Steam 网络同步 | 本轮未接真实 Steam 环境 | 传输层与解析逻辑由 V1 验收 + 本轮探针 A/B 组覆盖 |
| 代码签名 | 无证书 | 已在交付说明中明确「0 签名」状态与 SmartScreen 影响 |

---

## 8. 本轮沉淀的验收工具（`tools/`，均不进 asar）

| 工具 | 用途 |
| --- | --- |
| `cdp-lib.mjs` | 零依赖 CDP 客户端（Node 22 内置 WebSocket/fetch） |
| `serve-renderer.mjs` | 静态服务器（按请求读磁盘，不清缓存也能拿到新产物） |
| `verify-steam-insight.mjs` | 全站走查 + 12 张截图 + 控制台错误收集（自足，可重复跑） |
| `scan-pages.mjs` | 逐页文本污染扫描（含 SVG `<text>`） |
| `shot.mjs` | 定点截图（可先执行一段 JS 再截，如展开浮层） |

复跑方式：

```bash
node tools/serve-renderer.mjs out/renderer 5188          # 后台
# 无头 Chrome 指向 http://127.0.0.1:5188/，调试端口 9333
node tools/verify-steam-insight.mjs 9333 shots-v2        # 走查 + 截图
node tools/scan-pages.mjs 9333                           # 文本污染扫描
```
