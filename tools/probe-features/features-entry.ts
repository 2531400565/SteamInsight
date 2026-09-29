/**
 * 探针入口：把本次新增的「可判定逻辑」打成一份 bundle，供 features-probe.cjs 在真实 Electron 里逐条断言。
 *
 * 只导出纯函数 + 需要真实数据库的函数：
 *   - net-diagnose：buildVerdict / parseProxyEndpoint / configWarning / DIAGNOSE_TARGETS（纯）
 *   - datapack：buildDataPack / parseDataPack / applyDataPack / DATA_PACK_VERSION（需库）
 *   - notify-plan：planNotifications（纯）
 *   - settings：normalizeSettings（纯）
 *   - logger：log / flushLogs / readLogTail / listLogFiles（需 userData）
 *   - library：libraryValue（纯，库价值口径）
 *   - analytics：rarestUnlocked（纯，最稀有成就榜）
 *   - steam：toSnapshotAchievement / expandAchievement / achievementSavings（纯，IPC 瘦身）
 *   - user-data：采样保留策略 / 笔记 / 追猎清单 / 换账号检测（需库）
 *   - schema：SCHEMA_VERSION / MIGRATIONS（纯）
 */
export { buildVerdict, parseProxyEndpoint, configWarning, diagnoseNetwork, DIAGNOSE_TARGETS } from '../../electron/main/net-diagnose'
export { buildDataPack, parseDataPack, applyDataPack, DATA_PACK_FORMAT, DATA_PACK_VERSION } from '../../electron/main/datapack'
export { planNotifications, markWishlistNotified } from '../../electron/main/notify-plan'
export { normalizeSettings } from '../../electron/main/settings'
export { initLogger, logInfo, logError, flushLogs, readLogTail, listLogFiles, logsDir, currentLogFile } from '../../electron/main/logger'
export { initDatabase, all, get, run, transaction, exec } from '../../electron/main/database'

// ---- ROADMAP-V2 新增 ----
export { libraryValue } from '../../src/utils/library'
export { rarestUnlocked } from '../../src/utils/analytics'
export { toSnapshotAchievement, expandAchievement, achievementSavings, ACHIEVEMENT_ICON_BASE } from '../../src/types/steam'
export {
  SAMPLE_KEEP_DAYS, SNAPSHOT_KEEP_ROWS, NOTE_MAX_LEN,
  pruneSamples, prunePickedUnlocked,
  saveNote, clearNote, listNotes, togglePick, listPicks,
  detectAccountSwitch, stampGameOwners
} from '../../electron/main/user-data'
export { saveSnapshot, lastSnapshot, priceLowest } from '../../electron/main/repository'
export { SCHEMA_VERSION, MIGRATIONS } from '../../src/database/schema'
export { pickKey } from '../../src/utils/picks'

// ---- ROADMAP-V3 新增 ----
// BUG-5：可识别的 HTTP 错误类型（401/403 立刻失败、429 长退避）
export { SteamHttpError } from '../../electron/main/api-base'
// BUG-4：成就抓取失败账本 + 目标筛选纯函数
export { loadRetries, saveRetries, planAchievementTargets, ACH_FAILED_META_KEY, ACH_MAX_RETRY } from '../../electron/main/achievement-sync'
// BUG-3 + F-4：换账号清理
export { purgePreviousAccount } from '../../electron/main/user-data'
// F-1：手动补录
export {
  addManualSession, removeManualSession, listAppSessions,
  MANUAL_MIN_MINUTES, MANUAL_MAX_MINUTES, DEFAULT_START_MINUTE_OF_DAY
} from '../../electron/main/manual-sessions'
// F-2：自动备份
export { runBackup, maybeBackup, backupStatus, pruneBackupFiles, backupsDir, BACKUP_PREFIX } from '../../electron/main/auto-backup'
// F-3 / O-1：数据库健康与碎片整理
export { getDatabaseHealth } from '../../electron/main/db-health'
export { vacuum, databaseFileSize, clearCache } from '../../electron/main/database'
// F-5：降价趋势
export { priceTrend } from '../../src/utils/analytics'
// 仓库读写（组合验证用）
export { loadSnapshot, saveUser, getMeta, setMeta } from '../../electron/main/repository'

// ---- ROADMAP-V4 新增 ----
// O6：仪表盘布局纯逻辑（normalize/visibleCards；hook 本体不参与探针）
export { DASHBOARD_CARDS, visibleCards } from '../../src/hooks/useDashboardLayout'
// F6：封面 CDN URL → si-cover:// 缓存协议 URL 的换算（纯函数）
export { toCoverCacheUrl } from '../../src/components/ui/GameCover'

// ---- V5 新增 ----
// 优化 2：封面缓存的占用统计与清理（真实 fs，探针的 userData 指向临时目录）
export { coverCacheStats, clearCoverCache } from '../../electron/main/cover-cache'
