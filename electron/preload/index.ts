/**
 * 预加载脚本：通过 contextBridge 把 window.steamInsight 暴露给渲染进程，
 * 严格实现 src/types/ipc.ts 的 SteamInsightApi，且签名一个不能改。
 * 订阅类方法（onStatus / onNavigate / onMaximizedChange）返回取消订阅函数，内部 on + removeListener 防止泄漏。
 * 绝不把 ipcRenderer 本身暴露出去。
 */
import { contextBridge, ipcRenderer } from 'electron'
import { CH } from '@shared/channels'
import type { AchievementBackfillProgress, AchievementQueryRequest, PriceHistoryRequest, DbQueryName, NavigateRequest } from '@shared/contract'
import type { SteamInsightApi } from '../../src/types/ipc'

const api: SteamInsightApi = {
  app: {
    secretStatus: () => ipcRenderer.invoke(CH.secretStatus),
    info: () => ipcRenderer.invoke(CH.appInfo),
    openExternal: (url: string) => ipcRenderer.invoke(CH.openExternal, url)
  },
  steam: {
    detect: () => ipcRenderer.invoke(CH.steamDetect),
    launch: () => ipcRenderer.invoke(CH.steamLaunch)
  },
  auth: {
    startOpenId: () => ipcRenderer.invoke(CH.authOpenIdStart),
    status: () => ipcRenderer.invoke(CH.authOpenIdStatus),
    logout: () => ipcRenderer.invoke(CH.authLogout)
  },
  db: {
    loadSnapshot: () => ipcRenderer.invoke(CH.dbLoadSnapshot),
    query: <T = Record<string, unknown>>(name: DbQueryName, params?: Record<string, unknown>): Promise<T[]> =>
      ipcRenderer.invoke(CH.dbQuery, { name, params }) as Promise<T[]>,
    clearCache: () => ipcRenderer.invoke(CH.dbClearCache),
    health: () => ipcRenderer.invoke(CH.dbHealth),
    vacuum: () => ipcRenderer.invoke(CH.dbVacuum)
  },
  notes: {
    set: (patch) => ipcRenderer.invoke(CH.notesSet, patch),
    clear: (appId: number) => ipcRenderer.invoke(CH.notesClear, appId)
  },
  hunt: {
    toggle: (patch) => ipcRenderer.invoke(CH.huntToggle, patch)
  },
  sessions: {
    add: (patch) => ipcRenderer.invoke(CH.sessionsAdd, patch),
    remove: (sessionId: number) => ipcRenderer.invoke(CH.sessionsRemove, sessionId),
    listApp: (appId: number) => ipcRenderer.invoke(CH.sessionsListApp, appId)
  },
  sync: {
    run: (options) => ipcRenderer.invoke(CH.syncRun, options),
    status: () => ipcRenderer.invoke(CH.syncStatus),
    onStatus: (cb) => {
      const listener = (_e: unknown, payload: unknown): void => cb(payload as Parameters<typeof cb>[0])
      ipcRenderer.on(CH.syncStatus, listener)
      return () => { ipcRenderer.removeListener(CH.syncStatus, listener) }
    }
  },
  settings: {
    get: () => ipcRenderer.invoke(CH.settingsGet),
    set: (patch) => ipcRenderer.invoke(CH.settingsSet, patch)
  },
  notify: (payload) => ipcRenderer.invoke(CH.notify, payload),
  exporter: {
    wrapped: (request) => ipcRenderer.invoke(CH.exportWrapped, request),
    table: (request) => ipcRenderer.invoke(CH.exportTable, request)
  },
  price: {
    history: (req: PriceHistoryRequest) => ipcRenderer.invoke(CH.priceHistoryQuery, req)
  },
  store: {
    search: (keyword: string) => ipcRenderer.invoke(CH.storeSearch, keyword)
  },
  ach: {
    query: (req: AchievementQueryRequest) => ipcRenderer.invoke(CH.achQuery, req),
    backfill: () => ipcRenderer.invoke(CH.achBackfill),
    onBackfillProgress: (cb: (p: AchievementBackfillProgress) => void) => {
      const listener = (_e: unknown, payload: AchievementBackfillProgress): void => cb(payload)
      ipcRenderer.on(CH.achBackfillProgress, listener)
      return () => ipcRenderer.removeListener(CH.achBackfillProgress, listener)
    }
  },
  net: {
    diagnose: () => ipcRenderer.invoke(CH.netDiagnose),
    apiHealth: () => ipcRenderer.invoke(CH.apiHealth),
    hostsStatus: () => ipcRenderer.invoke(CH.hostsStatus),
    hostsPlan: () => ipcRenderer.invoke(CH.hostsPlan),
    hostsApply: () => ipcRenderer.invoke(CH.hostsApply),
    hostsBackups: () => ipcRenderer.invoke(CH.hostsBackups),
    hostsRestore: (file: string) => ipcRenderer.invoke(CH.hostsRestore, file),
    proxyApply: (proxyText: string) => ipcRenderer.invoke(CH.proxyApply, proxyText),
    proxyTest: () => ipcRenderer.invoke(CH.proxyTest)
  },
  diag: {
    exportPack: () => ipcRenderer.invoke(CH.diagExport)
  },
  datapack: {
    exportPack: () => ipcRenderer.invoke(CH.packExport),
    importPack: (mode) => ipcRenderer.invoke(CH.packImport, mode)
  },
  backup: {
    status: () => ipcRenderer.invoke(CH.backupStatus),
    run: () => ipcRenderer.invoke(CH.backupRun),
    openDir: () => ipcRenderer.invoke(CH.backupOpenDir)
  },
  covers: {
    stats: () => ipcRenderer.invoke(CH.coverCacheStats),
    clear: () => ipcRenderer.invoke(CH.coverCacheClear)
  },
  window: {
    minimize: () => { void ipcRenderer.invoke(CH.windowMinimize) },
    toggleMaximize: () => { void ipcRenderer.invoke(CH.windowMaximize) },
    close: () => { void ipcRenderer.invoke(CH.windowClose) },
    isMaximized: () => ipcRenderer.invoke(CH.windowIsMaximized),
    onMaximizedChange: (cb) => {
      const listener = (_e: unknown, maximized: unknown): void => cb(maximized as boolean)
      ipcRenderer.on(CH.windowMaximizedChanged, listener)
      return () => { ipcRenderer.removeListener(CH.windowMaximizedChanged, listener) }
    }
  },
  onNavigate: (cb) => {
    const listener = (_e: unknown, req: unknown): void => cb(req as NavigateRequest)
    ipcRenderer.on(CH.navigate, listener)
    return () => { ipcRenderer.removeListener(CH.navigate, listener) }
  }
}

contextBridge.exposeInMainWorld('steamInsight', api)
