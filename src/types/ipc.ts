/**
 * 渲染进程看到的 IPC 接口契约 + 全局 window 类型增强。
 * preload 暴露的 `window.steamInsight` 必须严格实现 SteamInsightApi。
 */
import type { ApiHealthEntry, AppSessionRow, AccountSwitchInfo, AppInfo, AuthStartResult, BackupRunResult, BackupStatus, CoverCacheStats, DatabaseHealth, DataPackResult, DbQueryName, DiagnoseCheck, DiagnoseConfig, DiagnoseLevel, ExportResult, GameNote, AchievementBackfillProgress, AchievementBackfillResult, AchievementQueryRequest, AchievementQueryResult, GameNotePatch, HostsApplyResult, HostsBackupInfo, HostsPlanView, HostsStatus, HuntPick, HuntPickPatch, ManualSessionPatch, ManualSessionResult, NavigateRequest, NetworkDiagnosis, NotifyPayload, PriceAlert, PriceHistoryRequest, ProxyTestResult, ReportPeriod,
  SecretStatus, SteamDetection, StoreSearchHit, SyncStatusPayload, TableExportRequest, WrappedExportRequest } from '../../electron/shared/contract'
import type { AppSettings, DataSource, DiscountItem, OwnedGame, PlaySession, PricePoint, SnapshotAchievement, SteamUser, WishlistItem } from './steam'

export type {
  AchievementBackfillProgress,
  ApiHealthEntry,
  AchievementBackfillResult,
  AchievementQueryRequest,
  AchievementQueryResult,
  AppSessionRow,
  AccountSwitchInfo,
  AppInfo,
  AuthStartResult,
  BackupRunResult,
  BackupStatus,
  CoverCacheStats,
  DataPackResult,
  DatabaseHealth,
  DbQueryName,
  DiagnoseCheck,
  DiagnoseConfig,
  DiagnoseLevel,
  ExportResult,
  GameNote,
  GameNotePatch,
  HuntPick,
  HuntPickPatch,
  HostsApplyResult,
  HostsBackupInfo,
  HostsPlanView,
  HostsStatus,
  ManualSessionPatch,
  ManualSessionResult,
  NavigateRequest,
  NetworkDiagnosis,
  NotifyPayload,
  PriceAlert,
  ProxyTestResult,
  ReportPeriod,
  SecretStatus,
  PriceHistoryRequest,
  StoreSearchHit,
  SnapshotAchievement,
  SteamDetection,
  SyncStatusPayload,
  TableExportRequest,
  WrappedExportRequest
}

/** 一次性下发给渲染进程的完整数据快照（全部来自 SQLite 读取） */
export interface Snapshot {
  user: SteamUser | null
  games: OwnedGame[]
  sessions: PlaySession[]
  /**
   * 成就。**图标只带文件名**（见 types/steam.ts 的 SnapshotAchievement）：
   * 4536 条 × 2 个图标 × ~90 字符的公共前缀 ≈ 0.8 MB，没必要每次 reload 都走一遍 IPC。
   * 渲染层在 useDataStore 里一次性 expand 成完整 Achievement，页面代码不用感知。
   */
  achievements: SnapshotAchievement[]
  wishlist: WishlistItem[]
  discounts: DiscountItem[]
  priceHistory: PricePoint[]
  /** 用户自己的评分 / 笔记（game_notes 表） */
  notes: GameNote[]
  /** 用户手动加入的追猎清单（hunt_picks 表） */
  picks: HuntPick[]
  /** 库里这批数据属于另一个账号时的告警信息 */
  accountSwitch: AccountSwitchInfo | null
  settings: AppSettings
  detection: SteamDetection | null
  /** 各表行数，用于「设置 → 数据」页展示 */
  counts: Record<string, number>
  loadedAt: number
}

export interface SyncRunOptions {
  /** 全量重算（清空派生表后重新写入） */
  full?: boolean
  /** 指定数据源；缺省按当前登录态自动判定 */
  source?: DataSource
  /**
   * 绕过商店详情的 TTL 缓存，强制重拉全部游戏。
   * 自动同步不加这个标记 —— 那样会在库里每款游戏上重复消耗请求（见 sync.ts 的说明）。
   */
  force?: boolean
}

export interface SteamInsightApi {
  app: {
    secretStatus: () => Promise<SecretStatus>
    info: () => Promise<AppInfo>
    openExternal: (url: string) => Promise<boolean>
  }
  steam: {
    detect: () => Promise<SteamDetection>
    launch: () => Promise<{ ok: boolean; error?: string }>
  }
  auth: {
    startOpenId: () => Promise<AuthStartResult>
    status: () => Promise<{ authenticated: boolean; steamId: string | null }>
    logout: () => Promise<{ ok: boolean }>
  }
  db: {
    loadSnapshot: () => Promise<Snapshot>
    query: <T = Record<string, unknown>>(name: DbQueryName, params?: Record<string, unknown>) => Promise<T[]>
    clearCache: () => Promise<{ ok: boolean; cleared: number }>
    /** F-3：数据库体积与增长健康度（只读） */
    health: () => Promise<DatabaseHealth>
    /** O-1：回收空闲页，真正缩小文件；返回压缩前后字节数 */
    vacuum: () => Promise<{ ok: boolean; before: number; after: number; error?: string }>
  }
  /**
   * 用户自己的内容。**刻意不放在 settings 里**：设置是「配置」，这些是「内容」，
   * 且它们必须跟着数据包一起走（settings.json 不进数据包）。
   */
  notes: {
    set: (patch: GameNotePatch) => Promise<GameNote | null>
    clear: (appId: number) => Promise<{ ok: boolean }>
  }
  hunt: {
    toggle: (patch: HuntPickPatch) => Promise<{ picked: boolean }>
  }
  /** 手动补录游玩会话（F-1）：Steam 不提供每日时长，这条链路让用户自己录。 */
  sessions: {
    add: (patch: ManualSessionPatch) => Promise<ManualSessionResult>
    remove: (sessionId: number) => Promise<{ ok: boolean; removed: number }>
    listApp: (appId: number) => Promise<AppSessionRow[]>
  }
  sync: {
    run: (options?: SyncRunOptions) => Promise<{ ok: boolean; error?: string; counts?: Record<string, number> }>
    status: () => Promise<SyncStatusPayload>
    onStatus: (cb: (payload: SyncStatusPayload) => void) => () => void
  }
  settings: {
    get: () => Promise<AppSettings>
    set: (patch: Partial<AppSettings>) => Promise<AppSettings>
  }
  notify: (payload: NotifyPayload) => Promise<{ ok: boolean }>
  exporter: {
    wrapped: (request: WrappedExportRequest) => Promise<ExportResult>
    table: (request: TableExportRequest) => Promise<ExportResult>
  }
  /** 价格历史按需查询 */
  price: {
    history: (req: PriceHistoryRequest) => Promise<PricePoint[]>
  }
  /** 商店关键词搜索（折扣页搜索框） */
  store: {
    search: (keyword: string) => Promise<StoreSearchHit[]>
  }
  /** 成就明细按需查询 + 全量补全（明细不再随快照全量下发） */
  ach: {
    query: (req: AchievementQueryRequest) => Promise<AchievementQueryResult>
    backfill: () => Promise<AchievementBackfillResult>
    onBackfillProgress: (cb: (p: AchievementBackfillProgress) => void) => () => void
  }
  /** 连通性自检 + 接口健康记录 */
  net: {
    diagnose: () => Promise<NetworkDiagnosis>
    apiHealth: () => Promise<ApiHealthEntry[]>
    /** hosts 劫持状态（只读，不改系统） */
    hostsStatus: () => Promise<HostsStatus>
    /** 还原计划预览：只算不写 */
    hostsPlan: () => Promise<HostsPlanView>
    /** 执行还原（内部先备份，再弹 UAC 提权写入） */
    hostsApply: () => Promise<HostsApplyResult>
    hostsBackups: () => Promise<HostsBackupInfo[]>
    /** 从指定备份整文件恢复 */
    hostsRestore: (backupFile: string) => Promise<HostsApplyResult>
    /** 应用自定义代理（只影响本应用会话） */
    proxyApply: (proxyText: string) => Promise<{ applied: boolean; label: string; error: string | null }>
    proxyTest: () => Promise<ProxyTestResult>
  }
  /** 诊断与数据包 */
  diag: {
    exportPack: () => Promise<ExportResult>
  }
  datapack: {
    exportPack: () => Promise<DataPackResult>
    importPack: (mode: 'replace' | 'merge') => Promise<DataPackResult>
  }
  /** F-2：每天最多一份的本地滚动备份，保住那些 Steam 再也拿不回来的数据。 */
  backup: {
    status: () => Promise<BackupStatus>
    run: () => Promise<BackupRunResult>
    /** 在系统文件管理器里打开备份目录，让用户能真的看见文件在哪 */
    openDir: () => Promise<{ ok: boolean; error?: string }>
  }
  /** V5 优化 2：封面磁盘缓存的占用统计与手动清理（清理后协议层自动重新下载，无需其它失效动作） */
  covers: {
    stats: () => Promise<CoverCacheStats>
    clear: () => Promise<{ ok: boolean; cleared: number }>
  }
  window: {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
    onMaximizedChange: (cb: (maximized: boolean) => void) => () => void
  }
  /** 主进程要求前端跳转（例如点击桌面通知、导出海报时切到 Wrapped 页） */
  onNavigate: (cb: (req: NavigateRequest) => void) => () => void
}

declare global {
  interface Window {
    steamInsight?: SteamInsightApi
  }
}
