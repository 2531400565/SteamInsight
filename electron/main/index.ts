/**
 * 主进程入口。负责：初始化日志与数据库、创建窗口、注册全部 IPC、单实例锁、托盘、开机自启、自动同步定时器。
 * 所有 IPC 通道都来自 electron/shared/channels.ts，不写裸字符串。
 */
import { app, ipcMain, shell, BrowserWindow } from 'electron'
import { CH } from '@shared/channels'
import type { AppSettings, SteamUser } from '@/types/steam'
import type { AuthStartResult, DataPackResult, DbQueryRequest, GameNotePatch, HuntPickPatch, ManualSessionPatch, NotifyPayload, TableExportRequest, WrappedExportRequest } from '@shared/contract'
import type { SyncRunOptions } from '@/types/ipc'
import { appVersion, userDataDir } from './paths'
import { getSettings, setSettings, applySettingsOnReady } from './settings'
import { initDatabase, flushNow, clearCache, databaseFilePath, vacuum } from './database'
import { getDatabaseHealth } from './db-health'
import * as repo from './repository'
import { clearNote, pruneSamples, saveNote, togglePick } from './user-data'
import { addManualSession, listAppSessions, removeManualSession } from './manual-sessions'
import { detectSteam, launchSteam } from './steam-detect'
import { startOpenId, getAuthStatus, setAuthStatus } from './steam-openid'
import * as sync from './sync'
import { markWishlistNotified } from './notify-plan'
import { notify, initNotifications, createTray, refreshTray } from './notifications'
import { exportTable, exportWrapped, setExporterWindow } from './exporter'
import { appInfo, exportDiagnostics } from './diagnostics'
import { diagnoseNetwork } from './net-diagnose'
import { exportDataPack, importDataPack } from './datapack'
import { backupStatus, maybeBackup, runBackup, backupsDir } from './auto-backup'
import { flushLogs, initLogger, logError, logInfo } from './logger'
import { createWindow, getMainWindow, toggleMaximize, isMaximized, setForceQuit } from './window'
import { clearCoverCache, coverCacheStats, registerCoverProtocol, registerCoverSchemePrivileges } from './cover-cache'

// V4/F6：自定义封面协议必须在 app ready 之前登记（全进程仅允许一次），所以放模块顶层。
registerCoverSchemePrivileges()

/**
 * 日志必须最先就绪：后面的初始化任何一步出问题，都要能在文件里留下线索。
 * 它同时安装 uncaughtException / unhandledRejection 钩子（见 logger.ts）。
 */
initLogger()

/**
 * Windows 通知的署名前缀。不设的话，从**免安装版直接双击 exe** 启动时，
 * 通知可能署名为 Electron、任务栏分组也可能不对（从快捷方式启动时 NSIS 会把 AUMID 写进快捷方式，
 * Electron 能推导出来，所以「安装版看起来正常」会掩盖这个问题）。
 * 取值必须与 electron-builder.yml 的 appId 一致。
 */
if (process.platform === 'win32') app.setAppUserModelId('com.steaminsight.desktop')

function authStatus(): { authenticated: boolean; steamId: string | null } {
  const s = getSettings()
  const st = getAuthStatus()
  const steamId = st.steamId || s.steamId || null
  return { authenticated: !!steamId, steamId }
}

// 自动同步定时器（跟随 settings.autoSync / syncIntervalMin）
let autoTimer: NodeJS.Timeout | null = null
function setupAutoSync(): void {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null }
  const s = getSettings()
  if (s.autoSync) autoTimer = setInterval(() => { void sync.run() }, s.syncIntervalMin * 60000)
}

/**
 * 自动备份轮询（F-2）。每 30 分钟看一眼「今天备份过没」，没有就补一份。
 *
 * 为什么是轮询而不是 `setTimeout(24h)`：`maybeBackup` 用**本地日期**判断是否跨天，
 * 一次性定时器在休眠/休眠唤醒后会漂移，而轮询天然自愈 —— 醒来后下一个 tick 就会补上。
 */
let backupTimer: NodeJS.Timeout | null = null
function setupAutoBackup(): void {
  if (backupTimer) { clearInterval(backupTimer); backupTimer = null }
  backupTimer = setInterval(() => { void maybeBackup('auto') }, 30 * 60 * 1000)
}

function registerIpc(): void {
  ipcMain.handle(CH.appInfo, () => appInfo())
  ipcMain.handle(CH.openExternal, (_e, url: string) => {
    // 只放行 http / https：shell.openExternal 会把地址交给系统 shell 处理，
    // 若放任 file:// 或自定义协议（如 ms-msdt:），渲染层等于拿到了任意命令入口。
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false
    void shell.openExternal(url)
    return true
  })
  ipcMain.handle(CH.steamDetect, () => detectSteam())
  ipcMain.handle(CH.steamLaunch, async () => { const d = await detectSteam(); return launchSteam(d.installPath) })

  ipcMain.handle(CH.authOpenIdStart, async (): Promise<AuthStartResult> => {
    const r = await startOpenId()
    if (r.ok && r.steamId) { setSettings({ steamId: r.steamId }); setAuthStatus(r.steamId) }
    return r
  })
  ipcMain.handle(CH.authOpenIdStatus, () => authStatus())
  ipcMain.handle(CH.authRestore, () => authStatus())
  ipcMain.handle(CH.authLogout, () => { setSettings({ steamId: '', personaName: '', avatarUrl: '' }); setAuthStatus(null); return { ok: true } })

  ipcMain.handle(CH.dbQuery, (_e, req: DbQueryRequest) => repo.query(req.name, req.params))
  ipcMain.handle(CH.dbExport, (_e, req: TableExportRequest) => exportTable(req))
  ipcMain.handle(CH.dbClearCache, () => { const n = clearCache(); return { ok: true, cleared: n } })
  ipcMain.handle(CH.dbLoadSnapshot, () => {
    const snap = repo.loadSnapshot(getSettings().steamId)
    return { ...snap, settings: getSettings(), detection: null }
  })
  ipcMain.handle(CH.dbHealth, () => getDatabaseHealth())
  ipcMain.handle(CH.dbVacuum, () => {
    // VACUUM 会重建整个库文件：期间必须是「没有同步在跑」的状态，
    // 否则同步的写被打包进半重建的库里。失败也要把原因带给界面。
    if (sync.isRunning()) return { ok: false, before: 0, after: 0, error: '同步正在进行，请等同步结束后再整理' }
    try {
      return { ok: true, ...vacuum() }
    } catch (err) {
      logError('db', 'VACUUM 失败', { message: err instanceof Error ? err.message : String(err) })
      return { ok: false, before: 0, after: 0, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // ---- 用户自己的内容（评分 / 笔记 / 追猎清单）----
  ipcMain.handle(CH.notesSet, (_e, patch: GameNotePatch) =>
    saveNote(patch.appId, { rating: patch.rating, note: patch.note, status: patch.status, tags: patch.tags })
  )
  ipcMain.handle(CH.notesClear, (_e, appId: number) => ({ ok: clearNote(appId) }))
  ipcMain.handle(CH.huntToggle, (_e, patch: HuntPickPatch) => ({ picked: togglePick(patch.appId, patch.apiName, patch.picked) }))

  // 手动补录会话（F-1）：steamId 必须是当前登录账号，不能由渲染层指定 ——
  // 否则补录出来的会话会挂到别的账号名下，下一次换账号清理时说不清该不该删。
  ipcMain.handle(CH.sessionsAdd, (_e, patch: ManualSessionPatch) => addManualSession(getSettings().steamId, patch))
  ipcMain.handle(CH.sessionsRemove, (_e, sessionId: number) => removeManualSession(sessionId))
  ipcMain.handle(CH.sessionsListApp, (_e, appId: number) => listAppSessions(appId))

  ipcMain.handle(CH.syncRun, (_e, opts: SyncRunOptions) => sync.run(opts))
  ipcMain.handle(CH.syncStatus, () => sync.getSyncStatus())

  ipcMain.handle(CH.settingsGet, () => getSettings())
  ipcMain.handle(CH.settingsSet, (_e, patch: Partial<AppSettings>) => {
    const s = setSettings(patch)
    if (patch.steamId !== undefined) setAuthStatus(patch.steamId || null)
    setupAutoSync()
    refreshTray()
    return s
  })

  ipcMain.handle(CH.notify, (_e, p: NotifyPayload) => {
    // 渲染层点「提醒我」时带上 appId：记入 wishlist.notified_at，刷新后按钮仍显示「已提醒」，
    // 也避免下一次同步的自动提醒再弹一遍同一款游戏。
    if (p.wishlistAppIds?.length) {
      const steamId = getSettings().steamId
      if (steamId) {
        markWishlistNotified(
          p.wishlistAppIds.map((appId) => ({ appId, steamId })),
          Math.floor(Date.now() / 1000)
        )
      }
    }
    return notify(p)
  })
  ipcMain.handle(CH.exportWrapped, (_e, req: WrappedExportRequest) => exportWrapped(req))
  ipcMain.handle(CH.exportTable, (_e, req: TableExportRequest) => exportTable(req))

  // 诊断与数据包
  ipcMain.handle(CH.netDiagnose, () => diagnoseNetwork())
  ipcMain.handle(CH.diagExport, () => exportDiagnostics())
  ipcMain.handle(CH.packExport, (): Promise<DataPackResult> => exportDataPack())
  ipcMain.handle(CH.packImport, (_e, mode: 'replace' | 'merge') => importDataPack(mode === 'merge' ? 'merge' : 'replace'))

  // 定期自动备份（F-2）
  ipcMain.handle(CH.backupStatus, () => backupStatus())
  ipcMain.handle(CH.backupRun, () => runBackup('manual'))
  ipcMain.handle(CH.backupOpenDir, async () => {
    try {
      const r = await shell.openPath(backupsDir())
      return { ok: r === '', error: r || undefined }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  // V5 优化 2：封面缓存的占用统计与手动清理
  ipcMain.handle(CH.coverCacheStats, () => coverCacheStats())
  ipcMain.handle(CH.coverCacheClear, () => clearCoverCache())

  ipcMain.handle(CH.windowMinimize, () => { getMainWindow()?.minimize() })
  ipcMain.handle(CH.windowMaximize, () => toggleMaximize())
  ipcMain.handle(CH.windowClose, () => { if (getSettings().minimizeToTray) getMainWindow()?.hide(); else getMainWindow()?.close() })
  ipcMain.handle(CH.windowIsMaximized, () => isMaximized())
}

async function main(): Promise<void> {
  await initDatabase()
  // 老库一次性瘦身：采样保留策略是 v3 引入的，装过旧版本的用户库里可能已经堆了大量
  // price_history / snapshots。放在启动时跑一次（幂等、只删过期行），
  // 这样不用等下一次同步就已经生效。
  const pruned = pruneSamples()
  if (pruned.priceHistory || pruned.snapshots) {
    logInfo('app', '启动时完成采样表降采样', { prunedPriceHistory: pruned.priceHistory, prunedSnapshots: pruned.snapshots })
  }
  applySettingsOnReady()
  setAuthStatus(getSettings().steamId || null)

  // 冷启动回填「上次同步时间」：数据库里已有历史同步结果时，若状态仍是初始值，
  // 界面会对着满屏数据写「尚未同步 / 从未同步」。synced_at 存的是秒，这里换算成毫秒。
  const lastUser = repo.query('user')[0] as SteamUser | undefined
  if (typeof lastUser?.syncedAt === 'number' && lastUser.syncedAt > 0) {
    sync.primeStatus({ lastSyncAt: lastUser.syncedAt * 1000 })
  }

  const win = createWindow()
  // V4/F6：封面本地缓存协议（ready 之后才能 protocol.handle）
  registerCoverProtocol()
  initNotifications(win)
  setExporterWindow(win)
  createTray()
  registerIpc()
  sync.setSyncBroadcaster((p) => {
    win.webContents.send(CH.syncStatus, p)
    // 只在一次同步收尾时刷新托盘菜单（进度更新很密集，没必要每次都重建）
    if (!p.running) {
      refreshTray()
      // 同步成功后顺手补一份备份：刚拉回来的价格采样是最新的，
      // 这时备份比等到半夜定时器更值钱。maybeBackup 内部按「每天最多一份」去重。
      if (p.lastSyncOk) maybeBackup('auto')
    }
  })
  setupAutoSync()
  setupAutoBackup()
  // 启动即检查一次，并把下面这个定时器挂起来：用户开着 App 连玩好几天时，
  // 「每天一份」不能只靠启动触发。
  void maybeBackup('startup')

  const s = getSettings()
  logInfo('app', '主进程就绪', {
    version: appVersion, userDataPath: userDataDir, dbPath: databaseFilePath(),
    source: s.steamId && s.steamApiKey ? 'api' : s.enableDemoData ? 'demo' : 'local',
    autoSync: s.autoSync, syncIntervalMin: s.syncIntervalMin
  })

  app.on('before-quit', () => { setForceQuit(true); flushNow(); flushLogs() })
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
}

// 单实例锁：第二个实例聚焦已有窗口
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const w = getMainWindow()
    if (w) { if (w.isMinimized()) w.restore(); w.show() }
  })
  void app.whenReady().then(main).catch((e) => {
    logError('app', '启动失败', { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined })
    flushLogs()
    console.error('启动失败', e)
    app.quit()
  })
}
