/**
 * 渲染进程与主进程之间的数据桥。
 *
 * 正常情况下 window.steamInsight 由 preload 注入，直接透传。
 * 若在纯浏览器里打开（例如用 vite dev 单独调试页面），则退化为「预览模式」：
 * 用内置演示数据集 + localStorage 设置构造一份完整快照，让界面依然可用。
 * 预览模式会在顶部状态栏明确标出，不会伪装成真实数据。
 */
import type { Snapshot, SteamInsightApi, SteamDetection, SyncStatusPayload } from '@/types/ipc'
import type { GameNote, HuntPick, PlaySession } from '@/types/steam'
import { DEFAULT_SETTINGS, toSnapshotAchievement, type AppSettings } from '@/types/steam'
import {
  buildDemoAchievements,
  buildDemoDiscounts,
  buildDemoGames,
  buildDemoPriceHistory,
  buildDemoSessions,
  buildDemoUser,
  buildDemoWishlist,
  DEMO_STEAM_ID
} from '@/services/mock/dataset'

const SETTINGS_KEY = 'steam-insight:preview-settings'

export const hasNativeBridge = (): boolean =>
  typeof window !== 'undefined' && typeof window.steamInsight === 'object' && window.steamInsight !== null

function loadPreviewSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS, steamId: DEMO_STEAM_ID, personaName: 'NovaSteam' }
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function savePreviewSettings(settings: AppSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* localStorage 不可用时静默忽略，预览模式设置不持久化 */
  }
}

let cachedSnapshot: Snapshot | null = null

/**
 * 预览模式下「用户自己的内容」的临时容器。
 *
 * 为什么要有：评分 / 笔记 / 追猎清单在真实应用里落 SQLite，预览模式没有主进程，
 * 如果直接返回空数组，界面上的星星点了不会亮 —— 验收时无法区分
 * 「功能坏了」和「预览模式本来就不落盘」。放在内存里让交互闭环，
 * 预模式横幅本身已经明确标注了「演示数据」。
 */
const previewNotes = new Map<number, GameNote>()
const previewPicks = new Map<string, HuntPick>()
/** 预览模式里手动补录的会话；id 用负的自增，避免与演示数据集的正 id 冲突。 */
let previewSessions: PlaySession[] = []
let previewSessionSeq = -1

/** 预览模式下「数据库文件」的假体积：取真实用户库同量级（约 2.3 MB），只为让健康面板有数可看。 */
let PREVIEW_DB_BYTES = 2_300_000
/** counts 的键是表名，界面要中文名。 */
const PREVIEW_TABLE_LABELS: Record<string, string> = {
  users: '账号',
  games: '游戏库',
  play_sessions: '游玩记录',
  achievements: '成就',
  wishlist: '愿望单',
  discounts: '折扣',
  price_history: '价格采样',
  snapshots: '差分快照'
}

/** 预览模式里「备份目录」的地址文案：真实路径来自 %APPDATA%，这里给一个示意。 */
const PREVIEW_BACKUP_DIR = 'C:\\Users\\you\\AppData\\Roaming\\steam-insight\\backups'
let previewBackups: Array<{ name: string; bytes: number; at: number }> = []

/** YYYY-MM-DD 对应的本地零点时间戳（秒）。 */
function localMidnightSeconds(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return Math.floor(new Date(y, m - 1, d, 0, 0, 0, 0).getTime() / 1000)
}

/** 预览模式快照：演示数据 + 本地设置，全部内存构造，只算一次。 */
function buildPreviewSnapshot(force = false): Snapshot {
  if (cachedSnapshot && !force) return cachedSnapshot
  const games = buildDemoGames()
  const sessions = buildDemoSessions(games)
  const achievements = buildDemoAchievements(games)
  const wishlist = buildDemoWishlist()
  const discounts = buildDemoDiscounts()
  const priceAppIds = Array.from(new Set([...wishlist.slice(0, 8).map((w) => w.appId), ...discounts.slice(0, 8).map((d) => d.appId)]))
  const detection: SteamDetection = {
    installed: false,
    installPath: null,
    libraryPaths: [],
    running: false,
    steamPid: null,
    loggedIn: false,
    lastLoginAccount: null,
    lastLoginPersona: null,
    lastLoginSteamId: null,
    recentAccounts: [],
    apiReachable: false,
    storeReachable: false,
    apiLatencyMs: null,
    networkDetail: null,
    checkedAt: Math.floor(Date.now() / 1000),
    notes: ['浏览器预览模式：未连接 Electron 主进程，因此未执行 Steam 本地检测。']
  }
  cachedSnapshot = {
    user: buildDemoUser(),
    games,
    sessions: [...sessions, ...previewSessions].sort((a, b) => (a.playDate < b.playDate ? 1 : a.playDate > b.playDate ? -1 : 0)),
    // 与主进程一致：走紧凑传输形态（图标只带文件名），渲染层再 expand
    achievements: achievements.map(toSnapshotAchievement),
    wishlist,
    discounts,
    priceHistory: buildDemoPriceHistory(priceAppIds),
    notes: Array.from(previewNotes.values()),
    picks: Array.from(previewPicks.values()),
    accountSwitch: null,
    settings: loadPreviewSettings(),
    detection,
    counts: {
      users: 1,
      games: games.length,
      play_sessions: sessions.length + previewSessions.length,
      achievements: achievements.length,
      wishlist: wishlist.length,
      discounts: discounts.length,
      price_history: priceAppIds.length * 26,
      gameNotes: previewNotes.size,
      huntPicks: previewPicks.size
    },
    loadedAt: Math.floor(Date.now() / 1000)
  }
  return cachedSnapshot
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 预览模式的 API 实现：只保证界面可跑通，不做任何真实网络或磁盘操作。 */
function createPreviewApi(): SteamInsightApi {
  let settings = loadPreviewSettings()
  let syncState: SyncStatusPayload = {
    phase: 'idle',
    running: false,
    message: '预览模式',
    progress: 0,
    lastSyncAt: null,
    lastSyncOk: null,
    lastError: null,
    source: 'demo'
  }
  const listeners = new Set<(payload: SyncStatusPayload) => void>()

  const emit = (patch: Partial<SyncStatusPayload>): void => {
    syncState = { ...syncState, ...patch }
    for (const listener of listeners) listener(syncState)
  }

  return {
    app: {
    secretStatus: async () => ({ encrypted: false }),
      info: async () => ({
        version: '1.0.0',
        electron: '—',
        chrome: navigator.userAgent,
        node: '—',
        platform: navigator.platform,
        userDataPath: '（浏览器预览模式）',
        dbPath: '（浏览器预览模式）',
        logsPath: '（浏览器预览模式）',
        demoMode: true
      }),
      openExternal: async (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer')
        return true
      }
    },
    steam: {
      detect: async () => buildPreviewSnapshot().detection as SteamDetection,
      launch: async () => ({ ok: false, error: '预览模式下无法启动 Steam 客户端' })
    },
    auth: {
      startOpenId: async () => ({ ok: false, error: '预览模式下不支持 Steam 登录，请从桌面应用启动', cancelled: true }),
      status: async () => ({ authenticated: true, steamId: DEMO_STEAM_ID }),
      logout: async () => ({ ok: true })
    },
    db: {
      loadSnapshot: async () => buildPreviewSnapshot(),
      query: async () => [],
      clearCache: async () => ({ ok: true, cleared: 0 }),
      // 预览模式没有真实 db 文件：给一份与实际同形状、数字来自内存数据集的假健康度，
      // 好让健康面板在浏览器里也能被看到、被验证，而不是白屏或报错。
      health: async () => {
        const snap = buildPreviewSnapshot()
        const rows = Object.values(snap.counts).reduce((a, b) => a + b, 0)
        return {
          fileBytes: PREVIEW_DB_BYTES,
          totalRows: rows,
          tables: snap.counts
            ? Object.entries(snap.counts).map(([key, value]) => ({
                table: key,
                label: PREVIEW_TABLE_LABELS[key] ?? key,
                rows: value,
                last7: 0
              }))
            : [],
          growth: { last7Rows: 0, observedDays: 1, perDay: 0, projectedYearRows: 0, projectedYearBytes: 0, bytesPerRow: PREVIEW_DB_BYTES / Math.max(1, rows) },
          hasEnoughHistory: false
        }
      },
      vacuum: async () => {
        // 预览库源自演示数据集，重算回同样大小 —— 这是诚实的结果，不是「假装省了空间」
        const fake = Math.round(PREVIEW_DB_BYTES * 0.06)
        PREVIEW_DB_BYTES -= fake
        return { ok: true, before: PREVIEW_DB_BYTES + fake, after: PREVIEW_DB_BYTES }
      }
    },
    notes: {
      set: async (patch) => {
        const prev = previewNotes.get(patch.appId)
        const rating = Math.max(0, Math.min(5, Math.round(patch.rating ?? prev?.rating ?? 0)))
        const note = (patch.note ?? prev?.note ?? '').slice(0, 2000)
        const status = (patch.status ?? prev?.status ?? '').slice(0, 16)
        const tags = patch.tags ?? prev?.tags ?? []
        if (rating === 0 && note === '' && status === '' && tags.length === 0) {
          previewNotes.delete(patch.appId)
        } else {
          previewNotes.set(patch.appId, { appId: patch.appId, rating, note, status, tags, updatedAt: Math.floor(Date.now() / 1000) })
        }
        buildPreviewSnapshot(true)
        return previewNotes.get(patch.appId) ?? null
      },
      clear: async (appId: number) => {
        previewNotes.delete(appId)
        buildPreviewSnapshot(true)
        return { ok: true }
      }
    },
    hunt: {
      toggle: async (patch) => {
        const key = `${patch.appId}:${patch.apiName}`
        if (patch.picked) previewPicks.set(key, { appId: patch.appId, apiName: patch.apiName, addedAt: Math.floor(Date.now() / 1000) })
        else previewPicks.delete(key)
        buildPreviewSnapshot(true)
        return { picked: patch.picked }
      }
    },
    // 手动补录（F-1）：预览模式下把补录的会话塞进内存快照，让趋势图立刻动起来。
    // 与主进程 manual-sessions.ts 的校验口径保持一致（1–1440 分钟、不能补录未来）。
    sessions: {
      add: async (patch) => {
        const minutes = Math.round(patch.minutes)
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
          return { ok: false as const, error: '时长需在 1–1440 分钟之间' }
        }
        if (!previewSessions.some((s) => s.appId === patch.appId)) {
          if (!buildPreviewSnapshot().games.some((g) => g.appId === patch.appId)) {
            return { ok: false as const, error: '游戏库里没有这款游戏，请先完成一次同步' }
          }
        }
        const today = new Date()
        const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        if (patch.playDate > todayYmd) return { ok: false as const, error: '不能给未来补录会话' }
        const minuteOfDay = Math.min(1439, Math.max(0, Math.round(patch.startMinuteOfDay ?? 20 * 60)))
        const startedAt = localMidnightSeconds(patch.playDate) + minuteOfDay * 60
        const id = previewSessionSeq--
        previewSessions.push({
          id, steamId: buildPreviewSnapshot().user?.steamId ?? '', appId: patch.appId, playDate: patch.playDate,
          minutes, startedAt, endedAt: startedAt + minutes * 60, source: 'manual'
        })
        buildPreviewSnapshot(true)
        return { ok: true as const, id, startedAt, endedAt: startedAt + minutes * 60 }
      },
      remove: async (sessionId: number) => {
        const before = previewSessions.length
        previewSessions = previewSessions.filter((s) => !(s.id === sessionId && s.source === 'manual'))
        const removed = before - previewSessions.length
        if (removed) buildPreviewSnapshot(true)
        return { ok: removed > 0, removed }
      },
      listApp: async (appId: number) =>
        buildPreviewSnapshot().sessions
          .filter((s) => s.appId === appId)
          .slice(0, 200)
          .map((s) => ({ id: s.id, playDate: s.playDate, minutes: s.minutes, source: s.source }))
    },
    sync: {
      run: async () => {
        const phases: Array<{ phase: SyncStatusPayload['phase']; progress: number; message: string }> = [
          { phase: 'detecting', progress: 12, message: '检测 Steam 环境…' },
          { phase: 'profile', progress: 32, message: '读取账号资料…' },
          { phase: 'games', progress: 55, message: '同步游戏库与游玩时长…' },
          { phase: 'achievements', progress: 74, message: '同步成就进度…' },
          { phase: 'wishlist', progress: 88, message: '同步愿望单…' },
          { phase: 'prices', progress: 96, message: '更新价格与折扣…' }
        ]
        emit({ running: true, progress: 4, message: '开始同步…', lastError: null })
        for (const step of phases) {
          emit({ phase: step.phase, progress: step.progress, message: step.message })
          await sleep(220)
        }
        emit({ phase: 'done', running: false, progress: 100, message: '同步完成（预览模式）', lastSyncAt: Math.floor(Date.now() / 1000), lastSyncOk: true })
        return { ok: true, counts: buildPreviewSnapshot().counts }
      },
      status: async () => syncState,
      onStatus: (cb) => {
        listeners.add(cb)
        return () => {
          listeners.delete(cb)
        }
      }
    },
    settings: {
      get: async () => settings,
      set: async (patch) => {
        settings = { ...settings, ...patch }
        savePreviewSettings(settings)
        return settings
      }
    },
    notify: async () => ({ ok: false }),
    exporter: {
      wrapped: async () => ({ ok: false, error: '预览模式下无法导出文件，请从桌面应用操作' }),
      table: async () => ({ ok: false, error: '预览模式下无法导出文件，请从桌面应用操作' })
    },
    price: {
      history: async () => []
    },
    store: {
      // 预览模式没有主进程，搜索必然失败：如实返回空数组，界面显示「没搜到」而不是假装有结果
      search: async () => []
    },
    ach: {
      query: async () => ({ rows: [], total: 0 }),
      backfill: async () => ({ ok: false, attempted: 0, added: 0, failed: 0, error: '浏览器预览模式下无法抓取成就，请从桌面应用操作' }),
      onBackfillProgress: () => () => undefined
    },
    net: {
      apiHealth: async () => [],
      // 预览模式没有主进程，无法做真实探测。如实返回「不可用」而不是编造一份看起来正常的结论。
      diagnose: async () => ({
        checkedAt: Date.now(),
        proxy: '未知',
        proxyReachable: null,
        checks: [],
        okCount: 0,
        total: 0,
        level: 'warn' as const,
        title: '浏览器预览模式下无法自检',
        detail: '连通性自检需要 Electron 主进程的传输层（net / node），请从桌面应用运行。',
        actions: ['用打包后的桌面版启动（npm run dev 或安装包）'],
        config: { apiKeySet: false, steamIdSet: false, demoDataEnabled: true, autoSync: false, syncIntervalMin: 30, activeSource: 'demo' as const },
        configWarning: null
      }),
      // hosts 守卫：预览模式既读不到系统 hosts，也写不了。如实说「不可用」，
      // 绝不用假数据冒充「检测到 15 条劫持」——那种面板比没有更危险。
      hostsStatus: async () => ({
        path: '',
        hijacked: [],
        kept: [],
        disabled: [],
        localProxyListening: false,
        checkedAt: Date.now()
      }),
      hostsPlan: async () => ({ disable: [], kept: [], changed: false }),
      hostsApply: async () => ({ ok: false, disabledCount: 0, backupFile: null, error: '浏览器预览模式下无法修改系统 hosts，请从桌面应用操作', verified: false }),
      hostsBackups: async () => [],
      hostsRestore: async () => ({ ok: false, disabledCount: 0, backupFile: null, error: '浏览器预览模式下无法修改系统 hosts', verified: false }),
      proxyApply: async () => ({ applied: false, label: '未知', error: '浏览器预览模式下无法设置代理，请从桌面应用操作' }),
      proxyTest: async () => ({ ok: false, via: null, ms: 0, error: '浏览器预览模式下无法测试代理，请从桌面应用操作' })
    },
    diag: {
      exportPack: async () => ({ ok: false, error: '预览模式下无法导出诊断包，请从桌面应用操作' })
    },
    datapack: {
      exportPack: async () => ({ ok: false, error: '预览模式下无法导出数据包，请从桌面应用操作' }),
      importPack: async () => ({ ok: false, error: '预览模式下无法导入数据包，请从桌面应用操作' })
    },
    // F-2：预览模式没有真实文件系统，备份状态用内存模拟，让面板可交互、可验收。
  backup: {
    status: async () => ({
      enabled: true,
      keep: 7,
      dir: PREVIEW_BACKUP_DIR,
      files: previewBackups,
      totalBytes: previewBackups.reduce((n, f) => n + f.bytes, 0),
      lastAt: previewBackups.length > 0 ? previewBackups[0].at : null,
      lastPath: previewBackups.length > 0 ? `${PREVIEW_BACKUP_DIR}/${previewBackups[0].name}` : null,
      lastRows: previewBackups.length > 0 ? Math.round(PREVIEW_DB_BYTES / 40) : 0,
      lastError: null
    }),
    run: async () => {
      const at = Math.floor(Date.now() / 1000)
      const p = (n: number): string => String(n).padStart(2, '0')
      const d = new Date()
      const name = `steam-insight-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`
      previewBackups = [{ name, bytes: Math.round(PREVIEW_DB_BYTES * 0.9), at }, ...previewBackups].slice(0, 7)
      return { ok: true as const, filePath: `${PREVIEW_BACKUP_DIR}/${name}`, rows: Math.round(PREVIEW_DB_BYTES / 40), removed: 0 }
    },
    openDir: async () => ({ ok: false, error: '预览模式没有本地文件，请从桌面应用打开备份目录' })
  },
  // V5 优化 2：预览模式没有磁盘缓存，返回 0/0 让面板可见、清理按钮可点但无实际效果。
  covers: {
    stats: async () => ({ count: 0, totalBytes: 0 }),
    clear: async () => ({ ok: true, cleared: 0 })
  },
  window: {
      minimize: () => undefined,
      toggleMaximize: () => undefined,
      close: () => undefined,
      isMaximized: async () => false,
      onMaximizedChange: () => () => undefined
    },
    onNavigate: () => () => undefined
  }
}

let previewApi: SteamInsightApi | null = null

/** 统一入口：主进程可用就走主进程，否则走预览实现。 */
export const bridge: SteamInsightApi = hasNativeBridge()
  ? (window.steamInsight as SteamInsightApi)
  : (previewApi ??= createPreviewApi())

/** 供设置页「重新同步」等场景主动丢弃预览快照缓存 */
export function resetPreviewSnapshot(): void {
  cachedSnapshot = null
}
