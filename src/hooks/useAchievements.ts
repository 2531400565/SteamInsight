import { useCallback, useEffect, useMemo, useState } from 'react'
import { bridge } from '@/services/bridge'
import { useDataStore } from '@/store/useDataStore'
import { expandAchievement, type Achievement, type PricePoint } from '@/types/steam'
import type { AchievementBackfillProgress } from '@/types/ipc'

/** 成就明细的加载状态机（三个页面共用同一份缓存，不重复拉）。 */
interface Cache {
  status: 'idle' | 'loading' | 'ready' | 'error'
  items: Achievement[]
  error: string | null
  /** 数据版本号：补全完成后自增，触发各页面重新拉取 */
  version: number
}

let cache: Cache = { status: 'idle', items: [], error: null, version: 0 }
const listeners = new Set<() => void>()

function emit(): void { for (const l of listeners) l() }
function setCache(patch: Partial<Cache>): void { cache = { ...cache, ...patch }; emit() }

/**
 * 成就明细（按需加载）。
 *
 * 为什么要改成按需：明细实测 4536 行 ≈ 975 KB，早前随快照每次启动全量过 IPC，
 * 而 12 个页面里只有 3 个真的需要它。改成「进页面才拉」之后，
 * 只看仪表盘/游戏库的用户一次都不用付这个成本。
 *
 * 全量拉取（limit: 0）只在成就相关页面内部使用 —— 这三个页面本来就要遍历全部成就
 * （算 TOP 榜、筛稀有未解锁），按需拉一次和原来一样快，但不用的人不付成本。
 */
export function useAchievements(): { achievements: Achievement[]; status: Cache['status']; error: string | null; reload: () => void } {
  const [state, setState] = useState<Cache>(cache)
  const version = state.version

  useEffect(() => {
    const on = (): void => setState({ ...cache })
    listeners.add(on)
    return () => { listeners.delete(on) }
  }, [])

  const load = useCallback(async () => {
    if (cache.status === 'loading') return
    setCache({ status: 'loading', error: null })
    try {
      const r = await bridge.ach.query({ limit: 0 })
      setCache({ status: 'ready', items: r.rows.map(expandAchievement), error: null })
    } catch (e) {
      setCache({ status: 'error', items: [], error: e instanceof Error ? e.message : String(e) })
    }
  }, [])

  useEffect(() => {
    if (cache.status === 'idle' || cache.status === 'error') void load()
  }, [load, version])

  return { achievements: state.items, status: state.status, error: state.error, reload: load }
}

/** 单款游戏的成就（详情页用：只拉这一款，不碰全量）。 */
export function useGameAchievements(appId: number | undefined): { achievements: Achievement[]; status: Cache['status'] } {
  const [items, setItems] = useState<Achievement[]>([])
  const [status, setStatus] = useState<Cache['status']>('idle')

  useEffect(() => {
    if (appId === undefined) return
    let cancelled = false
    setStatus('loading')
    void bridge.ach.query({ appId, limit: 0 })
      .then((r) => {
        if (cancelled) return
        setItems(r.rows.map(expandAchievement))
        setStatus('ready')
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [appId])

  return { achievements: items, status }
}

/**
 * 「补全成就数据」任务（成就中心入口）。
 *
 * 同步是增量的 —— 只抓本次时长增长的游戏，所以新买/久玩的游戏一直没有成就记录
 * （实测 69 款里 56 款有）。这个任务把缺口补上：只处理**库里完全没有记录**的那些，
 * 绝不覆盖已有数据，单款失败不影响整轮。
 */
export function useAchievementBackfill(): {
  progress: AchievementBackfillProgress | null
  running: boolean
  start: () => Promise<void>
  /** 库里有多少款游戏还没有任何成就记录 —— 入口据此显示「N 款待补全」 */
  missingCount: number
} {
  const games = useDataStore((s) => s.snapshot?.games)
  const [progress, setProgress] = useState<AchievementBackfillProgress | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => bridge.ach.onBackfillProgress((p) => {
    setProgress(p)
    if (!p.running) {
      setRunning(false)
      // 补全写的是 achievements 表，页面里的明细缓存必须失效重拉
      setCache({ status: 'idle', version: cache.version + 1 })
    }
  }), [])

  // 「有多少款还缺成就」用 games 表的计数判断：total 为 0 且该游戏确实有成就位的可能性高，
  // 但更稳妥的判据是「成就总数为 0」—— 对没有成就的游戏这本来就该是 0，所以这里只提示
  // 「可能缺失」的数量，不当成确定结论，界面上措辞也据此写成「待补全」。
  const missingCount = (games ?? []).filter((g) => g.achievementsTotal === 0).length

  const start = useCallback(async () => {
    if (running) return
    setRunning(true)
    try {
      await bridge.ach.backfill()
    } finally {
      // 进度事件里 running=false 会复位；这里兜底防止异常路径下卡在「运行中」
      setTimeout(() => setRunning(false), 500)
    }
  }, [running])

  return { progress, running, start, missingCount }
}

/** 价格历史（按需）。与成就同理：整表走 IPC 是浪费，只有三个页面真的需要它。 */
let priceCache: { key: string; items: PricePoint[] } | null = null
const priceListeners = new Set<() => void>()
function emitPrice(): void { for (const l of priceListeners) l() }

/**
 * 拉价格历史并按 appId 分组。
 *
 * @param appIds 要哪些游戏；不传 = 全部（生涯页用，配合 daily 收敛行数）
 * @param daily  每天只取最后一笔 —— 画长期曲线时用它，行数能小一个量级
 */
export function usePriceHistory(
  appIds: number[] | null,
  opts?: { daily?: boolean; sinceDays?: number; enabled?: boolean }
): { byApp: Map<number, PricePoint[]>; all: PricePoint[]; status: 'idle' | 'loading' | 'ready' | 'error' } {
  const enabled = opts?.enabled !== false
  const key = JSON.stringify([appIds, opts?.daily ?? false, opts?.sinceDays ?? 0])
  const [items, setItems] = useState<PricePoint[]>(priceCache?.key === key ? priceCache.items : [])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(priceCache?.key === key ? 'ready' : 'idle')

  useEffect(() => {
    if (!enabled) return
    if (priceCache?.key === key) return
    let cancelled = false
    setStatus('loading')
    void bridge.price.history({ appIds: appIds ?? undefined, daily: opts?.daily, sinceDays: opts?.sinceDays })
      .then((rows) => {
        if (cancelled) return
        priceCache = { key, items: rows }
        setItems(rows)
        setStatus('ready')
        emitPrice()
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [key, enabled, appIds, opts?.daily, opts?.sinceDays])

  const byApp = useMemo(() => {
    const m = new Map<number, PricePoint[]>()
    for (const p of items) {
      const list = m.get(p.appId)
      if (list) list.push(p)
      else m.set(p.appId, [p])
    }
    return m
  }, [items])

  return { byApp, all: items, status }
}

/** 同步完成后要让价格缓存失效（数据变了）。 */
export function invalidatePriceHistory(): void { priceCache = null; emitPrice() }
