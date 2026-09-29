/**
 * IPC 负载契约（纯类型，无运行时依赖）。
 * 主进程与渲染进程共用，保证参数/返回值形状一致。
 */

export type SyncPhase = 'idle' | 'detecting' | 'profile' | 'games' | 'achievements' | 'wishlist' | 'prices' | 'done' | 'failed'

export interface SteamDetection {
  installed: boolean
  installPath: string | null
  libraryPaths: string[]
  running: boolean
  steamPid: number | null
  loggedIn: boolean
  /** 本机账号的登录名（AccountName） */
  lastLoginAccount: string | null
  /** 本机账号的昵称（PersonaName），用于界面直接展示 */
  lastLoginPersona: string | null
  /** 本机账号的 SteamID64，可由注册表 ActiveUser（SteamID3）推算得到 */
  lastLoginSteamId: string | null
  recentAccounts: string[]
  apiReachable: boolean
  storeReachable: boolean
  apiLatencyMs: number | null
  /** 网络探测的可读结论：成功时说明走了哪个代理，失败时给出真实原因 */
  networkDetail: string | null
  checkedAt: number
  notes: string[]
}

export interface SyncStatusPayload {
  phase: SyncPhase
  running: boolean
  message: string
  progress: number
  lastSyncAt: number | null
  lastSyncOk: boolean | null
  lastError: string | null
  source: 'api' | 'local' | 'demo'
}

export interface AuthStartResult {
  ok: boolean
  steamId?: string
  error?: string
  cancelled?: boolean
}

export interface AppInfo {
  version: string
  electron: string
  chrome: string
  node: string
  platform: string
  userDataPath: string
  dbPath: string
  /** 本地日志目录（按天切分，保留 7 天） */
  logsPath: string
  demoMode: boolean
}

export interface SettingsPatch {
  autoLaunch?: boolean
  minimizeToTray?: boolean
  autoSync?: boolean
  syncIntervalMin?: 15 | 30 | 60
  notifyWishlistDrop?: boolean
  notifyHistoricalLow?: boolean
  notifyFreeGame?: boolean
  notifyAchievementHunt?: boolean
  priceAlerts?: PriceAlert[]
  theme?: 'dark' | 'light' | 'system'
  steamApiKey?: string
  steamId?: string
  personaName?: string
  avatarUrl?: string
  countryCode?: string
  enableDemoData?: boolean
}

/**
 * 「降到 ¥X 以下通知我」。
 * `notifiedPriceCents` 是跨重启去重的依据：同一价格只提醒一次，价格再降才算新消息。
 */
export interface PriceAlert {
  appId: number
  thresholdCents: number
  notifiedAt: number | null
  notifiedPriceCents: number | null
}

export interface NotifyPayload {
  title: string
  body: string
  route?: string
  tag?: string
  /** 愿望单条目 appId：渲染层点「提醒我」时带上，主进程会写入 notified_at，刷新后仍显示「已提醒」。 */
  wishlistAppIds?: number[]
}

export interface ExportResult {
  ok: boolean
  filePath?: string
  error?: string
  cancelled?: boolean
}

export interface WrappedExportRequest {
  format: 'png' | 'pdf'
  /** 年度报告用 year；周/月报告用 period + key。 */
  year: number
  period?: ReportPeriod
  /** 周 = `YYYY-Www`（周一起算），月 = `YYYY-MM`；period 为 year 时忽略。 */
  key?: string
}

/** 报告周期：年度 / 月度 / 周度。 */
export type ReportPeriod = 'year' | 'month' | 'week'

/**
 * 主进程要求渲染层跳转。
 * 渲染层的路由完全在内存里（没有 hash 路由），所以只能靠这个通道驱动；
 * params 用于携带 wrapped 页的导出态标记等附加信息。
 */
export interface NavigateRequest {
  route: string
  params?: Record<string, unknown>
}

export interface TableExportRequest {
  kind: 'games' | 'sessions' | 'achievements' | 'wishlist' | 'discounts'
  format: 'csv' | 'xlsx'
}

/* ------------------------- 连通性自检（网络诊断） ------------------------- */

/** 探测目标分组。cdn 类域名不在加速器的 hosts 劫持名单里，是区分「加速器没开」与「整网断了」的关键。 */
export type DiagnoseKind = 'api' | 'community' | 'store' | 'cdn'
export type DiagnoseLevel = 'ok' | 'warn' | 'error'

export interface DiagnoseCheck {
  label: string
  kind: DiagnoseKind
  ok: boolean
  status: number | null
  via: 'net' | 'node' | null
  ms: number
  error: string | null
}

/** 与网络无关、但同属「为什么看不到数据」的配置项。 */
export interface DiagnoseConfig {
  apiKeySet: boolean
  steamIdSet: boolean
  demoDataEnabled: boolean
  autoSync: boolean
  syncIntervalMin: number
  activeSource: 'api' | 'local' | 'demo'
}

export interface NetworkDiagnosis {
  checkedAt: number
  /** 实际生效的代理：`127.0.0.1:7897` / `直连` / `未知` */
  proxy: string
  /** 代理端口是否有人在监听；`直连` 时为 null（不适用） */
  proxyReachable: boolean | null
  checks: DiagnoseCheck[]
  okCount: number
  total: number
  level: DiagnoseLevel
  title: string
  detail: string
  actions: string[]
  config: DiagnoseConfig
  configWarning: string | null
}

/* ------------------------- 数据包导入 / 导出 ------------------------- */

export interface DataPackSummary {
  mode: 'replace' | 'merge'
  totalRows: number
  written: Record<string, number>
  before: Record<string, number>
  after: Record<string, number>
}

export interface DataPackResult {
  ok: boolean
  filePath?: string
  error?: string
  cancelled?: boolean
  counts?: Record<string, number>
  summary?: DataPackSummary
}

export type DbQueryName =
  | 'user'
  | 'games'
  | 'game'
  | 'sessions'
  | 'achievements'
  | 'wishlist'
  | 'discounts'
  | 'priceHistory'
  | 'dayStats'
  | 'overview'
  /** 用户自己的评分 / 笔记（game_notes 表） */
  | 'gameNotes'
  /** 用户手动加入的追猎清单（hunt_picks 表） */
  | 'huntPicks'

export interface DbQueryRequest {
  name: DbQueryName
  params?: Record<string, unknown>
}

/* ------------------------- 用户自己产生的内容 ------------------------- */

/**
 * 「我的评分与笔记」。
 *
 * 与 Steam 同步下来的字段严格分开存（`game_notes` 表），因为它们的生命周期不同：
 * 游戏出库、换账号、清缓存重新同步都会删改 `games` 行，但用户写下的东西
 * 既不由任何接口重建，也不该被那些操作洗掉。
 *
 * `rating` 0 = 未评分（1–5 星）。`note` 空串 = 没有备注。
 */
export interface GameNote {
  appId: number
  rating: number
  note: string
  /** 游玩状态：'' = 未设置，'wish' = 想玩，'playing' = 在玩，'abandoned' = 弃坑（V4 / F-4） */
  status: string
  /** 用户自定义标签（V4 / F-4） */
  tags: string[]
  updatedAt: number
}

/** 手动加入追猎清单的成就。清单默认是全自动算的，这张表只记「用户额外挑的」。 */
export interface HuntPick {
  appId: number
  apiName: string
  addedAt: number
}

export interface GameNotePatch {
  appId: number
  rating?: number
  note?: string
  status?: string
  tags?: string[]
}

export interface HuntPickPatch {
  appId: number
  apiName: string
  picked: boolean
}

/**
 * 手动补录一条游玩会话的请求（V3 / F-1）。
 *
 * Steam 不提供每日时长，自动只能靠快照差分采样（见 manual-sessions.ts 的说明），
 * 所以这里必须允许用户自己录入。全部字段由主进程按「用户手输」的标准校验。
 */
export interface ManualSessionPatch {
  appId: number
  /** 本地日期 YYYY-MM-DD */
  playDate: string
  /** 时长（分钟），1–1440 */
  minutes: number
  /** 「这局几点开始」= 当日 00:00 起的分钟数，0–1439；缺省为 20:00 */
  startMinuteOfDay?: number
}

/** 补录结果。校验失败时给出**可以直接展示给用户**的原因，而不是抛异常。 */
export type ManualSessionResult =
  | { ok: true; id: number; startedAt: number; endedAt: number }
  | { ok: false; error: string }

/** F-2：一份备份文件。 */
export interface BackupFile {
  name: string
  bytes: number
  at: number
}

/** F-2：自动备份开关、目录、已存文件与上次执行情况。 */
export interface BackupStatus {
  enabled: boolean
  /** 滚动保留份数（至少 1） */
  keep: number
  dir: string
  /** 已存的备份文件，新的在前 */
  files: BackupFile[]
  totalBytes: number
  lastAt: number | null
  lastPath: string | null
  lastRows: number
  lastError: string | null
}

export type BackupRunResult = { ok: true; filePath: string; rows: number; removed: number } | { ok: false; error: string }

/** 封面磁盘缓存占用（V5 优化 2：设置页「封面缓存」面板展示用）。 */
export interface CoverCacheStats {
  /** 已缓存的封面张数 */
  count: number
  /** 总字节数 */
  totalBytes: number
}

/**
 * 数据库健康度（F-3 / O-1）。
 *
 * 存在的理由：降采样（`pruneSamples`）与「清缓存 / 覆盖导入」每天都在删行，
 * 但 SQLite 的空闲页只会被后续 INSERT 复用、**文件永远不会自己变小**。
 * 用户看不到任何反馈，甚至会以为「清了缓存但数据还在」。
 * 这里把体积、增速与「VACUUM 能省多少」一次算清。
 */
export interface DatabaseHealth {
  /** 磁盘上的真实字节数 */
  fileBytes: number
  /** 全部业务表行数之和 */
  totalRows: number
  tables: Array<{ table: string; label: string; rows: number; last7: number }>
  growth: {
    /** 近 7 天新增行数 */
    last7Rows: number
    /** 实际观测到的采样跨度（天），最少 1 天 */
    observedDays: number
    /** 平均每天新增行数 */
    perDay: number
    /** 按当前速度线性外推的一年新增行数 */
    projectedYearRows: number
    /** 折算成字节的一年体积增量 */
    projectedYearBytes: number
    /** 当前每行平均字节数（含索引与空闲页，摊平后的平均值） */
    bytesPerRow: number
  }
  /** 库里最早的一行距今是否超过 2 天 —— 不足则年度外推的置信度很低，界面要如实说明 */
  hasEnoughHistory: boolean
}

/** 单个游戏的会话摘要（详情页区分「手动补录 / 自动采样」用）。 */
export interface AppSessionRow {
  id: number
  playDate: string
  minutes: number
  source: string
}

/**
 * 「库里这批数据属于另一个账号」的告警。
 *
 * 为什么需要：`games` 的主键是 `app_id`，本程序是**单人单账号**模型 ——
 * 换账号同步会用新账号的库整体替换旧账号的库。这个决定本身是对的
 * （否则界面会混着两个账号的游戏），但要**明确告知**，不能让用户
 * 第二天发现 69 款游戏无声消失、却不知道发生了什么。
 *
 * 真要做到「两套库并存、可切换」需要把 games / achievements / price_history /
 * snapshots / reports 的主键全改成带 steam_id 的联合主键（等于重建这些表），
 * 取舍与迁移方案见 docs/ROADMAP-V2.md。
 */
export interface AccountSwitchInfo {
  /** 库里现有数据所属的账号（上一个同步的账号） */
  previousSteamId: string
  /** 该账号留在库里的游戏数 */
  previousGames: number
  /** 当前设置里的账号 */
  currentSteamId: string
}
