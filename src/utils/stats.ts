/**
 * 统计引擎（纯函数，无副作用、无 IO）。
 * 输入永远是数据库快照里的原始行，输出页面直接可渲染的结构。
 * 所有派生指标只在这里算一次，页面不再各自处理时间边界，避免口径漂移。
 */
import type { Achievement, DayPlaytime, GenreShare, MonthlyPoint, OwnedGame, PlaySession, RangeKey, RankingRow } from '@/types/steam'
import { GENRE_COLORS, normalizeGenre } from './constants'
import { heatLevel, toYMD, ymdToDate } from './format'

/* ------------------------------ 日期工具 ------------------------------ */

export function todayYMD(): string {
  return toYMD(new Date())
}

export function addDays(ymd: string, delta: number): string {
  const d = ymdToDate(ymd)
  d.setDate(d.getDate() + delta)
  return toYMD(d)
}

/** 周一为一周之始，与中文习惯一致 */
export function startOfWeekYMD(ymd: string): string {
  const d = ymdToDate(ymd)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return toYMD(d)
}

export function enumerateDays(from: string, to: string): string[] {
  const out: string[] = []
  let cursor = from
  let guard = 0
  while (cursor <= to && guard < 4000) {
    out.push(cursor)
    cursor = addDays(cursor, 1)
    guard += 1
  }
  return out
}

export interface RangeBounds {
  from: string
  to: string
}

export function rangeBounds(range: RangeKey, sessions: PlaySession[], today = todayYMD()): RangeBounds {
  switch (range) {
    case 'week':
      return { from: startOfWeekYMD(today), to: today }
    case 'month':
      return { from: `${today.slice(0, 7)}-01`, to: today }
    case 'year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today }
    default: {
      const earliest = sessions.reduce<string | null>((min, s) => (min === null || s.playDate < min ? s.playDate : min), null)
      return { from: earliest ?? today, to: today }
    }
  }
}

export function rangeLabel(range: RangeKey, bounds: RangeBounds): string {
  const short = (ymd: string): string => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`
  if (range === 'all') return `${bounds.from} ~ ${bounds.to}`
  return `${short(bounds.from)} ~ ${short(bounds.to)}`
}

/* ------------------------------ 基础聚合 ------------------------------ */

export function buildDayMap(sessions: PlaySession[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of sessions) {
    map.set(s.playDate, (map.get(s.playDate) ?? 0) + s.minutes)
  }
  return map
}

export function sessionsInRange(sessions: PlaySession[], from: string, to: string): PlaySession[] {
  return sessions.filter((s) => s.playDate >= from && s.playDate <= to)
}

export function minutesInRange(sessions: PlaySession[], from: string, to: string): number {
  let total = 0
  for (const s of sessions) if (s.playDate >= from && s.playDate <= to) total += s.minutes
  return total
}

export function dailySeries(sessions: PlaySession[], from: string, to: string): DayPlaytime[] {
  const map = buildDayMap(sessionsInRange(sessions, from, to))
  return enumerateDays(from, to).map((date) => {
    const minutes = map.get(date) ?? 0
    return { date, minutes, level: heatLevel(minutes) }
  })
}

export function hourDistribution(
  sessions: PlaySession[],
  from: string,
  to: string
): Array<{ hour: number; minutes: number }> {
  const buckets = new Array<number>(24).fill(0)
  for (const s of sessions) {
    if (s.playDate < from || s.playDate > to) continue
    const hour = new Date(s.startedAt * 1000).getHours()
    buckets[hour] += s.minutes
  }
  return buckets.map((minutes, hour) => ({ hour, minutes }))
}

/** 最常游玩时间段：把 24 小时按 4 段聚合，取峰值 */
export function bestTimeBucket(
  hours: Array<{ hour: number; minutes: number }>
): { label: string; minutes: number } | null {
  const labels = ['凌晨 0-6 点', '上午 6-12 点', '下午 12-18 点', '晚上 18-24 点']
  const buckets = [0, 0, 0, 0]
  for (const { hour, minutes } of hours) buckets[Math.floor(hour / 6)] += minutes
  const total = buckets.reduce((a, b) => a + b, 0)
  if (total === 0) return null
  let best = 0
  for (let i = 1; i < 4; i += 1) if (buckets[i] > buckets[best]) best = i
  return { label: labels[best], minutes: buckets[best] }
}

/* ------------------------------ 时长排行 ------------------------------ */

export function ranking(games: OwnedGame[], inRange: PlaySession[], limit?: number): RankingRow[] {
  const perGame = new Map<number, number>()
  for (const s of inRange) perGame.set(s.appId, (perGame.get(s.appId) ?? 0) + s.minutes)
  const rankable: RankingRow[] = games.map((g) => ({
    rank: 0,
    appId: g.appId,
    name: g.name,
    headerImage: g.headerImage,
    rangeMinutes: perGame.get(g.appId) ?? 0,
    playtimeForeverMin: g.playtimeForeverMin,
    playtimeTwoWeeksMin: g.playtimeTwoWeeksMin,
    lastPlayedAt: g.lastPlayedAt,
    achievementsUnlocked: g.achievementsUnlocked,
    achievementsTotal: g.achievementsTotal,
    genres: g.genres
  }))
  const filtered = rankable.filter((r) => r.rangeMinutes > 0 || r.playtimeTwoWeeksMin > 0)
  filtered.sort((a, b) => b.rangeMinutes - a.rangeMinutes || (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0))
  const sliced = typeof limit === 'number' ? filtered.slice(0, limit) : filtered
  return sliced.map((row, index) => ({ ...row, rank: index + 1 }))
}

/** 最近游玩（按最后启动时间倒序，与时长无关）。无区间语境，rangeMinutes 取累计总时长。 */
export function recentlyPlayed(games: OwnedGame[], limit = 5): RankingRow[] {
  return games
    .filter((g) => g.lastPlayedAt !== null)
    .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0))
    .slice(0, limit)
    .map((g, index) => ({
      rank: index + 1,
      appId: g.appId,
      name: g.name,
      headerImage: g.headerImage,
      rangeMinutes: g.playtimeForeverMin,
      playtimeForeverMin: g.playtimeForeverMin,
      playtimeTwoWeeksMin: g.playtimeTwoWeeksMin,
      lastPlayedAt: g.lastPlayedAt,
      achievementsUnlocked: g.achievementsUnlocked,
      achievementsTotal: g.achievementsTotal,
      genres: g.genres
    }))
}

/* ------------------------------ 类型分布 ------------------------------ */

/** 多类型游戏按时长均摊到各类型，避免重复计数导致占比加起来超过 100% */
export function genreShares(games: OwnedGame[], inRange: PlaySession[]): GenreShare[] {
  const minutesOf = new Map<number, number>()
  for (const s of inRange) minutesOf.set(s.appId, (minutesOf.get(s.appId) ?? 0) + s.minutes)
  const acc = new Map<string, number>()
  for (const g of games) {
    const minutes = minutesOf.get(g.appId) ?? 0
    if (minutes <= 0) continue
    const buckets = g.genres.length > 0 ? g.genres.map(normalizeGenre) : ['其他']
    const unique = Array.from(new Set(buckets))
    const each = minutes / unique.length
    for (const genre of unique) acc.set(genre, (acc.get(genre) ?? 0) + each)
  }
  const total = Array.from(acc.values()).reduce((a, b) => a + b, 0)
  return Array.from(acc.entries())
    .map(([genre, minutes]) => ({
      genre,
      minutes: Math.round(minutes),
      percent: total > 0 ? (minutes / total) * 100 : 0,
      color: GENRE_COLORS[genre] ?? GENRE_COLORS['其他']
    }))
    .filter((item) => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
}

/* ------------------------------ 连续天数 ------------------------------ */

export interface StreakInfo {
  current: number
  longest: number
  longestEnd: string | null
}

export function streaks(sessions: PlaySession[], today = todayYMD()): StreakInfo {
  const days = Array.from(new Set(sessions.filter((s) => s.minutes > 0).map((s) => s.playDate))).sort()
  if (days.length === 0) return { current: 0, longest: 0, longestEnd: null }
  let longest = 1
  let longestEnd = days[0]
  let run = 1
  for (let i = 1; i < days.length; i += 1) {
    if (days[i] === addDays(days[i - 1], 1)) {
      run += 1
    } else {
      run = 1
    }
    if (run > longest) {
      longest = run
      longestEnd = days[i]
    }
  }
  // 当前连续：最后一段必须延伸到今天或昨天才算「正在进行中」
  let tail = 1
  for (let i = days.length - 1; i > 0; i -= 1) {
    if (days[i] === addDays(days[i - 1], 1)) tail += 1
    else break
  }
  const lastDay = days[days.length - 1]
  const alive = lastDay === today || lastDay === addDays(today, -1)
  return { current: alive ? tail : 0, longest, longestEnd }
}

/* ------------------------------ 月度 / 成就 ------------------------------ */

export function monthlySeries(sessions: PlaySession[], achievements: Achievement[], year: number): MonthlyPoint[] {
  const prefix = String(year)
  const minutes = new Array<number>(12).fill(0)
  const unlocks = new Array<number>(12).fill(0)
  for (const s of sessions) {
    if (!s.playDate.startsWith(prefix)) continue
    const month = Number(s.playDate.slice(5, 7)) - 1
    if (month >= 0 && month < 12) minutes[month] += s.minutes
  }
  for (const a of achievements) {
    if (!a.unlocked || !a.unlockedAt) continue
    const d = new Date(a.unlockedAt * 1000)
    if (d.getFullYear() !== year) continue
    unlocks[d.getMonth()] += 1
  }
  return minutes.map((m, index) => ({
    month: `${year}-${String(index + 1).padStart(2, '0')}`,
    minutes: m,
    achievements: unlocks[index]
  }))
}

export function unlockedAchievements(achievements: Achievement[]): Achievement[] {
  return achievements.filter((a) => a.unlocked && a.unlockedAt !== null)
}

export function achievementsUnlockedBetween(achievements: Achievement[], from: string, to: string): Achievement[] {
  return unlockedAchievements(achievements).filter((a) => {
    const ymd = toYMD(a.unlockedAt)
    return ymd >= from && ymd <= to
  })
}
