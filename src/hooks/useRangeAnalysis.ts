/**
 * 把「时间维度 + 原始行」算成游戏分析页要的一屏数据。
 * 抽成 hook 是为了让页面保持声明式：换 range 就重算，页面不碰时间边界。
 */
import { useMemo } from 'react'
import type { DayPlaytime, GenreShare, RangeKey, RankingRow } from '@/types/steam'
import { useDataStore } from '@/store/useDataStore'
import {
  achievementsUnlockedBetween,
  bestTimeBucket,
  dailySeries,
  genreShares,
  hourDistribution,
  minutesInRange,
  rangeBounds,
  rangeLabel,
  ranking,
  sessionsInRange,
  streaks
} from '@/utils/stats'

export interface RangeAnalysis {
  bounds: { from: string; to: string }
  label: string
  totalMinutes: number
  sessionCount: number
  gameCount: number
  achievementsUnlocked: number
  avgMinutesPerDay: number
  streak: number
  longestStreak: number
  topGame: RankingRow | null
  daily: DayPlaytime[]
  heatmapDays: DayPlaytime[]
  heatmapYear: number
  ranking: RankingRow[]
  genres: GenreShare[]
  hours: Array<{ hour: number; minutes: number }>
  bestHourRange: { label: string; minutes: number } | null
  activeDays: number
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime()
  const b = new Date(`${to}T00:00:00`).getTime()
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1)
}

export function useRangeAnalysis(range: RangeKey, heatmapYear?: number): RangeAnalysis | null {
  const snapshot = useDataStore((s) => s.snapshot)
  // 成就读 derived 的那一份：快照里传的是紧凑形态（图标只带文件名），
  // derived 已经一次性展开成完整 Achievement，派生逻辑统一用这一份。
  const achievements = useDataStore((s) => s.derived?.achievements)

  return useMemo(() => {
    if (!snapshot || !achievements) return null
    const { games, sessions } = snapshot
    const bounds = rangeBounds(range, sessions)
    const inRange = sessionsInRange(sessions, bounds.from, bounds.to)
    const totalMinutes = minutesInRange(sessions, bounds.from, bounds.to)
    const streakInfo = streaks(sessions, bounds.to)
    const rank = ranking(games, inRange, 50)
    const hours = hourDistribution(inRange, bounds.from, bounds.to)

    const startYear = Number(bounds.from.slice(0, 4))
    const endYear = Number(bounds.to.slice(0, 4))
    const heatmapStart = range === 'all' ? `${startYear}-01-01` : range === 'year' ? `${endYear}-01-01` : bounds.from
    const heatmapEnd = range === 'year' ? `${endYear}-12-31` : bounds.to

    return {
      bounds,
      label: rangeLabel(range, bounds),
      totalMinutes,
      sessionCount: inRange.length,
      gameCount: new Set(inRange.map((s) => s.appId)).size,
      achievementsUnlocked: achievementsUnlockedBetween(achievements, bounds.from, bounds.to).length,
      avgMinutesPerDay: totalMinutes / daysBetween(bounds.from, bounds.to),
      streak: streakInfo.current,
      longestStreak: streakInfo.longest,
      topGame: rank[0] ?? null,
      daily: dailySeries(sessions, bounds.from, bounds.to),
      heatmapDays: dailySeries(sessions, heatmapStart, heatmapEnd),
      heatmapYear: heatmapYear ?? endYear,
      ranking: rank,
      genres: genreShares(games, inRange),
      hours,
      bestHourRange: bestTimeBucket(hours),
      activeDays: new Set(inRange.map((s) => s.playDate)).size
    }
  }, [snapshot, achievements, range, heatmapYear])
}
