/**
 * 应用状态：导航、主题、设置、同步状态、Steam 环境检测。
 * 只放「全局唯一」的东西；页面自己的派生数据用组件内 useMemo，不塞进 store 免得互相打扰。
 */
import { create } from 'zustand'
import type { SteamDetection, SyncStatusPayload } from '@/types/ipc'
import { DEFAULT_SETTINGS, type AppSettings, type DataSource, type ReportPeriod, type ThemeMode } from '@/types/steam'
import { bridge, hasNativeBridge } from '@/services/bridge'

export type RouteKey =
  | 'welcome'
  | 'dashboard'
  | 'analysis'
  | 'library'
  | 'game'
  | 'compare'
  | 'achievements'
  | 'hunt'
  | 'store'
  | 'wishlist'
  | 'wrapped'
  | 'career'
  | 'settings'

export interface RouteParams {
  appId?: number
  year?: number
  tab?: string
  /** 报告页的周期（年度 / 月度 / 周度）与其周期键 */
  period?: ReportPeriod
  key?: string
  /** wrapped 页在导出时会带上这个标记，用于把页面切成纯海报态 */
  exportMode?: 'png' | undefined
  /** 从哪一页进来的。目前只有游戏详情页用：决定侧边栏高亮哪一项、以及「返回」回到哪。 */
  from?: RouteKey
  /** 游戏对比页的预选列表（最多 4 个 appId） */
  appIds?: number[]
}

export type ResolvedTheme = 'dark' | 'light'

/**
 * 路由的中文名。侧边栏与「返回 XX」按钮共用一份，避免两边各写一个标签后走偏
 * （游戏详情页的返回入口有 5 个来源，标签写死就会出现「从游戏库进来却写着返回游戏分析」）。
 */
export const ROUTE_LABELS: Record<RouteKey, string> = {
  welcome: '欢迎',
  dashboard: '首页',
  analysis: '游戏分析',
  library: '游戏库',
  game: '游戏详情',
  compare: '游戏对比',
  achievements: '成就中心',
  hunt: '成就追猎',
  store: '折扣商城',
  wishlist: '愿望单',
  wrapped: 'Steam Wrapped',
  career: 'Steam 生涯',
  settings: '设置'
}

/** 全部合法路由，供命令面板与主进程导航校验共用。 */
export const ROUTE_KEYS = Object.keys(ROUTE_LABELS) as RouteKey[]

const SYNC_IDLE: SyncStatusPayload = {
  phase: 'idle',
  running: false,
  message: '尚未同步',
  progress: 0,
  lastSyncAt: null,
  lastSyncOk: null,
  lastError: null,
  source: 'demo'
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return mode
}

function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode)
  document.documentElement.setAttribute('data-theme', resolved)
  return resolved
}

export interface RouteHistoryEntry {
  route: RouteKey
  params: RouteParams
}

interface AppState {
  route: RouteKey
  params: RouteParams
  /**
   * 访问历史（最近的在后）。
   *
   * 为什么要有：Esc「返回上一页」是桌面应用的肌肉记忆，而本项目的路由**完全在内存里**
   * （没有 hash / history 路由，见 contract.ts 的 NavigateRequest 说明），
   * 所以「上一页」只能自己记。上限 30 条，够用且不会无限增长。
   */
  history: RouteHistoryEntry[]
  booted: boolean
  loading: boolean
  error: string | null
  settings: AppSettings
  theme: ResolvedTheme
  detection: SteamDetection | null
  detecting: boolean
  sync: SyncStatusPayload
  previewMode: boolean
  /** 命令面板是否打开。放在 store 里是为了让顶栏的「搜索」按钮和 Ctrl+K 共享同一个状态。 */
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  /** 快捷键清单是否打开（V4 / F-7）。? 键与命令面板共享这一个入口。 */
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
  navigate: (route: RouteKey, params?: RouteParams) => void
  /** 返回上一页。没有历史时返回 false，调用方自行决定兜底（例如回首页）。 */
  goBack: () => boolean
  bootstrap: () => Promise<void>
  detect: () => Promise<void>
  runSync: (source?: DataSource, full?: boolean) => Promise<boolean>
  patchSettings: (patch: Partial<AppSettings>) => Promise<void>
  setTheme: (mode: ThemeMode) => Promise<void>
  launchSteam: () => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

/** 历史栈上限。超过就丢最早的，避免长时间使用后无限增长。 */
const HISTORY_LIMIT = 30

/** 路由参数的稳定序列化（键按字典序），用于「原地重复点击」判定。见 navigate 的说明。 */
function stableParams(params: RouteParams): string {
  const keys = Object.keys(params) as Array<keyof RouteParams>
  return JSON.stringify(keys.sort().map((k) => [k, params[k]]))
}

/**
 * bridge 订阅是否已经挂过。
 *
 * `bootstrap()` 不止跑一次 —— 「加载失败」界面上的「重试」按钮会再调它一次。
 * 而 `bridge.sync.onStatus` / `bridge.onNavigate` 每次注册都会**追加**一个回调且返回取消订阅函数；
 * 早前这个返回值被直接丢弃，于是点一次「重试」监听器就翻一倍：主进程推一次跳转，
 * 渲染层 `navigate()` 被触发两次；每条同步状态包也会重复 `set`。
 * 一个模块级开关是这里最简单也最可靠的守卫（订阅本身是进程生命周期级别的）。
 */
let bridgeSubscribed = false

export const useAppStore = create<AppState>((set, get) => ({
  route: 'welcome',
  params: {},
  history: [],
  booted: false,
  loading: true,
  error: null,
  settings: DEFAULT_SETTINGS,
  theme: 'dark',
  detection: null,
  detecting: false,
  sync: SYNC_IDLE,
  previewMode: !hasNativeBridge(),
  paletteOpen: false,

  setPaletteOpen: (open) => set({ paletteOpen: open }),

  shortcutsOpen: false,

  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),

  navigate: (route, params = {}) => {
    const { route: current, params: currentParams, history } = get()
    // 原地重复点击不产生历史：否则点三下「游戏库」要按三次 Esc 才退得出去。
    // 参数比较必须走**稳定序列化**：`JSON.stringify` 对键顺序敏感，
    // `{appId, from}` 与 `{from, appId}` 会算出两个不同的字符串 → 去重失效、多出一条历史。
    if (route === current && stableParams(currentParams) === stableParams(params)) return
    set({ route, params, history: [...history, { route: current, params: currentParams }].slice(-HISTORY_LIMIT) })
  },

  goBack: () => {
    const history = get().history
    if (history.length === 0) return false
    const last = history[history.length - 1]
    set({ route: last.route, params: last.params, history: history.slice(0, -1) })
    return true
  },

  /** 启动流程：读设置 → 应用主题 → 读快照 → 决定落地页 → 后台检测 Steam */
  bootstrap: async () => {
    set({ loading: true, error: null })
    try {
      const settings = await bridge.settings.get()
      const theme = applyTheme(settings.theme)
      set({ settings, theme })

      if (!bridgeSubscribed) {
        bridgeSubscribed = true
        bridge.sync.onStatus((payload) => set({ sync: payload }))
        bridge.onNavigate((req) => {
          // 兼容两种负载：纯字符串（旧的通知跳转）与 { route, params }（导出海报等带参跳转）
          const route = typeof req === 'string' ? req : req?.route
          const params = typeof req === 'string' ? {} : (req?.params ?? {})
          if (route && (ROUTE_KEYS as string[]).includes(route)) {
            // 走 navigate 而不是直接 set：这样主进程驱动的跳转也进历史，Esc 能退回来
            get().navigate(route as RouteKey, params as RouteParams)
          }
        })
      }

      const status = await bridge.sync.status()
      const snapshot = await bridge.db.loadSnapshot()
      const hasUser = Boolean(snapshot.user && snapshot.user.steamId)
      const hasData = snapshot.games.length > 0
      set({
        sync: status,
        settings: snapshot.settings ?? settings,
        booted: true,
        loading: false,
        route: hasUser && hasData ? 'dashboard' : 'welcome'
      })

      // 检测不阻塞首屏：慢的网络探测放到后台
      void get().detect()
    } catch (error) {
      set({
        booted: true,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
        route: 'welcome'
      })
    }
  },

  detect: async () => {
    set({ detecting: true })
    try {
      const detection = await bridge.steam.detect()
      set({ detection })
    } catch {
      set({ detection: null })
    } finally {
      set({ detecting: false })
    }
  },

  runSync: async (source, full = false) => {
    set({ error: null })
    try {
      // force：渲染层发起的同步都是用户手动点的，期望「立刻拿到最新数据」，
      // 所以绕过商店详情的 TTL 缓存。后台定时同步走主进程的 sync.run()，不带 force。
      const result = await bridge.sync.run({ full, source, force: true })
      if (!result.ok) set({ error: result.error ?? '同步失败' })
      // 同步结果就是最硬的连通性证据：真同步要连打十几个接口，比启动时那次探测严格得多。
      // 借它顺手刷新一次网络检测，顶栏的「网络受限」才不会停留在启动瞬间的过期结论上
      // （典型场景：加速器刚启动时探测失败，之后同步成功了，标签却一直黄着）。
      if (result.ok) void get().detect()
      return result.ok
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) })
      return false
    }
  },

  patchSettings: async (patch) => {
    const next = await bridge.settings.set(patch)
    const theme = applyTheme(next.theme)
    set({ settings: next, theme })
  },

  setTheme: async (mode) => {
    await get().patchSettings({ theme: mode })
  },

  launchSteam: async () => bridge.steam.launch(),

  logout: async () => {
    await bridge.auth.logout()
    set({ route: 'welcome', params: {} })
  }
}))
