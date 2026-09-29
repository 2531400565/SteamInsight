/**
 * Steam Wrapped（年度报告）构建器。
 * 输入是数据库里的会话/游戏/成就原始行，输出一份可直接渲染 + 导出的报告对象。
 * 报告本身不落库：它完全由原始数据推导，随时可重算，避免出现「缓存陈旧」的假数据。
 *
 * 同一套渲染也承担「周报 / 月报」：`buildPeriodReport` 产出的对象与年度报告同形，
 * 只是把「月度序列」换成「单日序列」（见 WrappedReport.daily / monthly 的注释）。
 */
import type { Achievement, GenreShare, OwnedGame, PlaySession, ReportPeriod, WrappedReport } from '@/types/steam'
import { addDays, bestTimeBucket, buildDayMap, dailySeries, genreShares, hourDistribution, monthlySeries, ranking, rangeLabel, streaks, startOfWeekYMD, todayYMD } from './stats'
import { toYMD, ymdToDate } from './format'

export function availableYears(sessions: PlaySession[]): number[] {
  const set = new Set<number>()
  for (const s of sessions) set.add(Number(s.playDate.slice(0, 4)))
  return Array.from(set).sort((a, b) => b - a)
}

/** 有记录的全部月份键（`YYYY-MM`），倒序。 */
export function availableMonths(sessions: PlaySession[], limit = 24): string[] {
  const set = new Set<string>()
  for (const s of sessions) set.add(s.playDate.slice(0, 7))
  return Array.from(set).sort((a, b) => b.localeCompare(a)).slice(0, limit)
}

/**
 * 周键：`YYYY-Www`。
 * 采用 ISO 口径（第 1 周 = 包含 1 月 4 日的那一周，周一起算），
 * 否则年初几天会被算成「第 0 周」，与日历上看到的周数对不上。
 */
export function weekKeyOf(ymd: string): string {
  const d = ymdToDate(ymd)
  const monday = startOfWeekYMD(ymd)
  const week1Monday = startOfWeekYMD(`${d.getFullYear()}-01-04`)
  const weeks = Math.round((ymdToDate(monday).getTime() - ymdToDate(week1Monday).getTime()) / 604800000) + 1
  if (weeks >= 1) return `${d.getFullYear()}-W${String(weeks).padStart(2, '0')}`
  // 跨年边界：这一周属于上一年的最后一两周
  const prevYear = d.getFullYear() - 1
  const prevFirst = startOfWeekYMD(`${prevYear}-01-04`)
  const w = Math.round((ymdToDate(monday).getTime() - ymdToDate(prevFirst).getTime()) / 604800000) + 1
  return `${prevYear}-W${String(w).padStart(2, '0')}`
}

/** 有记录的全部周键，倒序。 */
export function availableWeeks(sessions: PlaySession[], limit = 26): string[] {
  const set = new Set<string>()
  for (const s of sessions) set.add(weekKeyOf(s.playDate))
  return Array.from(set).sort((a, b) => b.localeCompare(a)).slice(0, limit)
}

export interface PeriodBounds {
  from: string
  to: string
  label: string
}

/** 周键 → 该周的周一（键非法时退化为今天所在周）。 */
export function mondayOfWeekKey(key: string): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(key)
  if (!m) return startOfWeekYMD(todayYMD())
  const week1Monday = startOfWeekYMD(`${Number(m[1])}-01-04`)
  return addDays(week1Monday, (Number(m[2]) - 1) * 7)
}

/** 月键（`YYYY-MM`）→ 范围与标签。 */
export function monthBounds(key: string): PeriodBounds {
  const m = /^(\d{4})-(\d{2})$/.exec(key)
  const year = m ? Number(m[1]) : new Date().getFullYear()
  const month = m ? Number(m[2]) : new Date().getMonth() + 1
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to, label: `${year} 年 ${month} 月` }
}

/** 周键 → 范围与标签。 */
export function weekBounds(key: string): PeriodBounds {
  const from = mondayOfWeekKey(key)
  const to = addDays(from, 6)
  const weekNo = /^(\d{4})-W(\d{2})$/.exec(key)
  const short = (ymd: string): string => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`
  const head = weekNo ? `${weekNo[1]} 年第 ${Number(weekNo[2])} 周` : rangeLabel('week', { from, to })
  return { from, to, label: `${head}（${short(from)} - ${short(to)}）` }
}

/** 周期键 → 范围与标签。 */
export function periodBounds(period: ReportPeriod, key: string): PeriodBounds {
  if (period === 'month') return monthBounds(key)
  if (period === 'week') return weekBounds(key)
  const year = /^\d{4}$/.test(key) ? key : String(new Date().getFullYear())
  return { from: `${year}-01-01`, to: `${year}-12-31`, label: `${year} 年` }
}

/** 最常玩类型里的代表作品（按时长倒序取前 3）。两个报告构建器共用，避免口径漂移。 */
function topGenreNames(games: OwnedGame[], sessions: PlaySession[], favoriteGenre: GenreShare | null): string[] {
  if (!favoriteGenre) return []
  const ids = new Set(
    sessions
      .filter((s) => {
        const game = games.find((g) => g.appId === s.appId)
        return game ? game.genres.includes(favoriteGenre.genre) : false
      })
      .map((s) => s.appId)
  )
  const minutesOf = (appId: number): number => sessions.filter((s) => s.appId === appId).reduce((acc, s) => acc + s.minutes, 0)
  return games
    .filter((g) => ids.has(g.appId))
    .sort((a, b) => minutesOf(b.appId) - minutesOf(a.appId))
    .slice(0, 3)
    .map((g) => g.name)
}

/** 组装报告里与周期无关的那部分（TOP5 / 类型 / 时段 / 连续天数）。 */
function commonParts(games: OwnedGame[], achievements: Achievement[], sessions: PlaySession[], from: string, to: string) {
  const totalMinutes = sessions.reduce((acc, s) => acc + s.minutes, 0)
  const dayMap = buildDayMap(sessions)
  let busiestDay: { date: string; minutes: number } | null = null
  for (const [date, minutes] of dayMap) {
    if (!busiestDay || minutes > busiestDay.minutes) busiestDay = { date, minutes }
  }
  const genres = genreShares(games, sessions)
  const favoriteGenre = genres[0] ?? null
  const hours = hourDistribution(sessions, from, to)
  const unlocked = achievements.filter((a) => a.unlocked && a.unlockedAt && toYMD(a.unlockedAt) >= from && toYMD(a.unlockedAt) <= to)
  return {
    totalMinutes,
    busiestDay,
    genres,
    favoriteGenre,
    hours,
    bestHourRange: bestTimeBucket(hours),
    achievementsUnlocked: unlocked.length,
    longestStreak: streaks(sessions, to).longest,
    topGames: ranking(games, sessions, 5).map((row) => ({
      rank: row.rank,
      appId: row.appId,
      name: row.name,
      headerImage: row.headerImage,
      minutes: row.rangeMinutes,
      percent: totalMinutes > 0 ? (row.rangeMinutes / totalMinutes) * 100 : 0
    })),
    gameCount: new Set(sessions.map((s) => s.appId)).size,
    topGenreGames: topGenreNames(games, sessions, favoriteGenre)
  }
}

export function buildWrapped(
  games: OwnedGame[],
  sessions: PlaySession[],
  achievements: Achievement[],
  year: number
): WrappedReport {
  const yearSessions = sessions.filter((s) => s.playDate.startsWith(String(year)))
  const c = commonParts(games, achievements, yearSessions, `${year}-01-01`, `${year}-12-31`)

  return {
    year,
    period: 'year',
    periodKey: String(year),
    periodLabel: `${year} 年`,
    totalMinutes: c.totalMinutes,
    gameCount: c.gameCount,
    achievementsUnlocked: c.achievementsUnlocked,
    busiestDay: c.busiestDay,
    longestStreak: c.longestStreak,
    topGames: c.topGames,
    favoriteGenre: c.favoriteGenre,
    genres: c.genres,
    bestHourRange: c.bestHourRange,
    hourDistribution: c.hours,
    monthly: monthlySeries(sessions, achievements, year),
    topGenreGames: c.topGenreGames,
    generatedAt: Math.floor(Date.now() / 1000)
  }
}

/**
 * 周报 / 月报。返回结构与年度报告完全一致，方便共用渲染与导出链路。
 * `monthly` 留空、改用 `daily`（周/月看「每天」比看「每月」有意义）。
 */
export function buildPeriodReport(
  games: OwnedGame[],
  sessions: PlaySession[],
  achievements: Achievement[],
  period: Exclude<ReportPeriod, 'year'>,
  key: string
): WrappedReport {
  const { from, to, label } = periodBounds(period, key)
  const inRange = sessions.filter((s) => s.playDate >= from && s.playDate <= to)
  const c = commonParts(games, achievements, inRange, from, to)

  return {
    year: Number(from.slice(0, 4)),
    period,
    periodKey: key,
    periodLabel: label,
    daily: dailySeries(sessions, from, to),
    totalMinutes: c.totalMinutes,
    gameCount: c.gameCount,
    achievementsUnlocked: c.achievementsUnlocked,
    busiestDay: c.busiestDay,
    longestStreak: c.longestStreak,
    topGames: c.topGames,
    favoriteGenre: c.favoriteGenre,
    genres: c.genres,
    bestHourRange: c.bestHourRange,
    hourDistribution: c.hours,
    monthly: [],
    topGenreGames: c.topGenreGames,
    generatedAt: Math.floor(Date.now() / 1000)
  }
}
