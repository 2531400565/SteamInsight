/**
 * 数据状态：一份来自 SQLite 的快照 + 启动时算好的全局派生指标。
 * 派生指标只依赖原始行，快照换新时整体重算一次，避免每处页面各算一遍口径不一。
 */
import { create } from 'zustand'
import type { Snapshot } from '@/types/ipc'
import type { Achievement, DashboardOverview, GameNote, GenreShare, OwnedGame, RankingRow } from '@/types/steam'
import { expandAchievement } from '@/types/steam'
import { achievementSummary, buildOverview } from '@/utils/analytics'
import { genreShares, minutesInRange, rangeBounds, ranking, sessionsInRange } from '@/utils/stats'
import { availableYears } from '@/utils/wrapped'
import { pickKey } from '@/utils/picks'
import { bridge } from '@/services/bridge'

export { pickKey }

export interface DerivedData {
  overview: DashboardOverview
  achievement: ReturnType<typeof achievementSummary>
  genresAll: GenreShare[]
  years: number[]
  rankingAll: RankingRow[]
  totalMinutes: number
  gameIndex: Map<number, OwnedGame>
  /** 「稀有且尚未解锁」的成就数（成就追猎页的清单规模，侧边栏角标用） */
  huntRareCount: number
  /**
   * 完整形态的成就（图标 URL 已拼回）。
   *
   * 快照里传的是紧凑形态（图标只带文件名），在这里**一次性**展开：
   * 展开是纯字符串拼接，代价远低于把这 0.8 MB 冗余每页走一遍 IPC。
   * 页面请一律读 `derived.achievements` 而不是 `snapshot.achievements`。
   */
  achievements: Achievement[]
  /** 用户自己的评分 / 笔记，按 appId 索引 */
  notes: Map<number, GameNote>
  /** 手动加入追猎清单的成就键（pickKey） */
  pickIndex: Set<string>
}

interface DataState {
  snapshot: Snapshot | null
  derived: DerivedData | null
  loading: boolean
  loadError: string | null
  load: () => Promise<void>
  reload: () => Promise<void>
  /**
   * 本地就地更新一条笔记（不重新拉快照）。
   *
   * 为什么要单独开一个入口：`reload()` 会把整份快照再走一遍 IPC
   * —— 仅成就就有 4500+ 条、数 MB。写一条笔记却要重传全库，代价与收益完全不成比例。
   * 写库已经在主进程完成，这里只负责把内存里的派生数据对齐。
   */
  applyNote: (note: GameNote | null, appId: number) => void
  /** 本地就地更新一条追猎勾选状态（不重新拉快照）。理由同上。 */
  applyPick: (picked: boolean, appId: number, apiName: string) => void
}

function derive(snapshot: Snapshot): DerivedData {
  const { games, sessions, wishlist, discounts } = snapshot
  const bounds = rangeBounds('all', sessions)
  const allSessions = sessionsInRange(sessions, bounds.from, bounds.to)
  // 快照里的成就走的是紧凑形态：先展开成完整对象，下面所有派生指标都用这一份
  const achievements = snapshot.achievements.map(expandAchievement)
  return {
    overview: buildOverview(games, sessions, achievements, wishlist, discounts),
    achievement: achievementSummary(games),
    genresAll: genreShares(games, allSessions),
    years: availableYears(sessions),
    rankingAll: ranking(games, allSessions, 60),
    totalMinutes: minutesInRange(sessions, bounds.from, bounds.to),
    gameIndex: new Map(games.map((g) => [g.appId, g])),
    huntRareCount: achievements.filter((a) => a.isRare && !a.unlocked).length,
    achievements,
    notes: new Map(snapshot.notes.map((n) => [n.appId, n])),
    pickIndex: new Set(snapshot.picks.map((p) => pickKey(p.appId, p.apiName)))
  }
}

export const useDataStore = create<DataState>((set) => ({
  snapshot: null,
  derived: null,
  loading: false,
  loadError: null,

  load: async () => {
    set({ loading: true, loadError: null })
    try {
      const snapshot = await bridge.db.loadSnapshot()
      set({ snapshot, derived: derive(snapshot), loading: false })
    } catch (error) {
      set({ loading: false, loadError: error instanceof Error ? error.message : String(error) })
    }
  },

  reload: async () => {
    await useDataStore.getState().load()
  },

  applyNote: (note, appId) => {
    set((state) => {
      if (!state.derived) return state
      const notes = new Map(state.derived.notes)
      if (note) notes.set(appId, note)
      else notes.delete(appId)
      return { derived: { ...state.derived, notes } }
    })
  },

  applyPick: (picked, appId, apiName) => {
    set((state) => {
      if (!state.derived) return state
      const pickIndex = new Set(state.derived.pickIndex)
      const key = pickKey(appId, apiName)
      if (picked) pickIndex.add(key)
      else pickIndex.delete(key)
      return { derived: { ...state.derived, pickIndex } }
    })
  }
}))
