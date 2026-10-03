/**
 * 页面级聚合：把基础统计组合成各页面直接消费的结构。
 * 与 stats.ts 的分工：stats 只做「一类指标」，analytics 负责「一屏内容」。
 */
import type { Achievement, AlmostDoneGroup, AchievementRow, DashboardOverview, DiscountItem, OwnedGame, PlaySession, PricePoint, WishlistItem } from '@/types/steam'
import { addDays, buildDayMap, dailySeries, enumerateDays, minutesInRange, rangeBounds, ranking, recentlyPlayed, streaks, todayYMD } from './stats'
import { toYMD } from './format'

export function buildOverview(
  games: OwnedGame[],
  sessions: PlaySession[],
  achievements: Achievement[],
  wishlist: WishlistItem[],
  discounts: DiscountItem[]
): DashboardOverview {
  const today = todayYMD()
  const week = rangeBounds('week', sessions, today)
  const prevFrom = addDays(week.from, -7)
  const prevTo = addDays(week.from, -1)

  const weekMinutes = minutesInRange(sessions, week.from, week.to)
  const prevMinutes = minutesInRange(sessions, prevFrom, prevTo)
  const weekDeltaPercent = prevMinutes > 0 ? ((weekMinutes - prevMinutes) / prevMinutes) * 100 : null

  const weekSessions = sessions.filter((s) => s.playDate >= week.from && s.playDate <= week.to)
  const weekTop = ranking(games, weekSessions, 1)[0] ?? null

  const dayMap = buildDayMap(sessions)
  /**
   * O-6：这里刻意造 **365 天**的每日序列，而不是 30 天。
   *
   * 折线图要提供「30 / 90 / 全部」三档切换，而这一档要真能看到更长的历史 ——
   * 若还是按 30 天出数据，切到 90 天只会得到一条一模一样的短线，按钮就成了摆设。
   * 代价可以忽略：每天一个 `{date,minutes,avg7}` 三元组，365 条约 12 KB JSON，
   * 而 7 日滚动窗口求和是纯 Map 查表。
   */
  const daysYear = enumerateDays(addDays(today, -364), today)
  const dailyTrend = daysYear.map((date) => {
    const window7 = enumerateDays(addDays(date, -6), date)
    const sum7 = window7.reduce((acc, d) => acc + (dayMap.get(d) ?? 0), 0)
    return { date, minutes: dayMap.get(date) ?? 0, avg7: sum7 / 7 }
  })
  // 保留 30 天口径的子序列（图表默认档、以及不想看长尾的场合），直接取尾部 30 条
  const last30Days = dailyTrend.slice(-30)

  const unlockedToday = achievements.filter((a) => a.unlocked && a.unlockedAt && toYMD(a.unlockedAt) === today)
  const lowAppIds = new Set<number>()
  for (const d of discounts) if (d.isHistoricalLow) lowAppIds.add(d.appId)
  for (const w of wishlist) if (w.isHistoricalLow) lowAppIds.add(w.appId)

  return {
    weekMinutes,
    weekDeltaPercent,
    streakDays: streaks(sessions, today).current,
    weekTopGame: weekTop
      ? { appId: weekTop.appId, name: weekTop.name, headerImage: weekTop.headerImage, minutes: weekTop.rangeMinutes }
      : null,
    wishlistDropCount: wishlist.filter((w) => w.discountPercent > 0).length,
    todayMinutes: dayMap.get(today) ?? 0,
    todayAchievements: unlockedToday.length,
    todayHistoricalLows: lowAppIds.size,
    dailyThisWeek: dailySeries(sessions, week.from, today),
    /** O-6：365 天每日序列，供折线图「30 / 90 / 全部」切换；30 天口径取它的尾部即可 */
    dailyTrend,
    last30Days,
    recentGames: recentlyPlayed(games, 5)
  }
}

/* --------------------------- 成就中心 --------------------------- */

/**
 * 总成就数 / 完成数取自 games 表（覆盖全部已拥有游戏，与游戏详情页口径一致）；
 * 成就明细列表来自 achievements 表。二者若不同步，以 games 表为权威。
 */
export function achievementSummary(games: OwnedGame[]): {
  total: number
  unlocked: number
  percent: number
  rareUnlocked: number
  perfectGames: number
  trackedGames: number
} {
  let total = 0
  let unlocked = 0
  let rareUnlocked = 0
  let perfectGames = 0
  let trackedGames = 0
  for (const g of games) {
    if (g.achievementsTotal <= 0) continue
    trackedGames += 1
    total += g.achievementsTotal
    unlocked += g.achievementsUnlocked
    rareUnlocked += g.rareAchievements
    if (g.achievementsUnlocked >= g.achievementsTotal) perfectGames += 1
  }
  return { total, unlocked, percent: total > 0 ? (unlocked / total) * 100 : 0, rareUnlocked, perfectGames, trackedGames }
}

export function recentUnlocks(
  achievements: Achievement[],
  games: OwnedGame[],
  limit = 20
): AchievementRow[] {
  const index = new Map(games.map((g) => [g.appId, g]))
  return achievements
    .filter((a) => a.unlocked && a.unlockedAt !== null)
    .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))
    .slice(0, limit)
    .map((a) => ({
      ...a,
      gameName: index.get(a.appId)?.name ?? `App ${a.appId}`,
      gameHeader: index.get(a.appId)?.headerImage ?? ''
    }))
}

/**
 * 「我拿到的最稀有成就」榜（N1-3）。
 *
 * 为什么需要：成就追猎页展示的是**尚未解锁**的稀有成就，成就中心的三个板块
 * 是「最近解锁 / 即将完成 / 待解锁」—— 「已经拿到手的稀有成就」反而没有地方能看到，
 * 而这恰恰是玩家最想拿出来看的那一类。
 *
 * `globalPercent === 0` 表示 Steam 没给出该成就的全球占比（未知）。
 * 它**整条排除**，不参与排序 —— 「未知稀有度」没有可比的位置：
 * 放进榜里无论排在最前（冒充 0%，看着最稀有）还是最后，都是在表达一个 Steam 没提供的事实。
 */
export function rarestUnlocked(achievements: Achievement[], games: OwnedGame[], limit = 12): AchievementRow[] {
  const index = new Map(games.map((g) => [g.appId, g]))
  return achievements
    .filter((a) => a.unlocked && a.globalPercent > 0)
    .sort((a, b) => a.globalPercent - b.globalPercent || (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))
    .slice(0, limit)
    .map((a) => ({
      ...a,
      gameName: index.get(a.appId)?.name ?? `App ${a.appId}`,
      gameHeader: index.get(a.appId)?.headerImage ?? ''
    }))
}

/** 有全球占比数据、且已解锁的成就数（用来判断上面那张榜有没有意义）。 */
export function ratedUnlockedCount(achievements: Achievement[]): number {
  return achievements.filter((a) => a.unlocked && a.globalPercent > 0).length
}

export function almostDone(games: OwnedGame[], achievements: Achievement[], limit = 8): AlmostDoneGroup[] {
  const byApp = new Map<number, Achievement[]>()
  for (const a of achievements) {
    const list = byApp.get(a.appId)
    if (list) list.push(a)
    else byApp.set(a.appId, [a])
  }
  return games
    .filter((g) => g.achievementsTotal > 0 && g.achievementsUnlocked < g.achievementsTotal)
    .map((g) => {
      const remaining = g.achievementsTotal - g.achievementsUnlocked
      const percent = (g.achievementsUnlocked / g.achievementsTotal) * 100
      const missing = (byApp.get(g.appId) ?? [])
        .filter((a) => !a.unlocked)
        .sort((a, b) => b.globalPercent - a.globalPercent)
        .slice(0, 3)
        .map<AchievementRow>((a) => ({ ...a, gameName: g.name, gameHeader: g.headerImage }))
      return {
        appId: g.appId,
        gameName: g.name,
        headerImage: g.headerImage,
        total: g.achievementsTotal,
        unlocked: g.achievementsUnlocked,
        remaining,
        percent,
        nextUp: missing
      }
    })
    .filter((row) => row.percent >= 60 || row.remaining <= 12)
    .sort((a, b) => a.remaining - b.remaining || b.percent - a.percent)
    .slice(0, limit)
}

/* --------------------------- 游戏详情 --------------------------- */
export interface GameTrendPoint {
  /** 原始键：月度趋势为 `YYYY-MM`，年度汇总为 `YYYY`。轴标签交给图表自行格式化。 */
  month: string
  minutes: number
}

/** 最近 N 个月的单游戏时长趋势（含无记录的月份，画图不会断档） */
export function gameMonthlyTrend(sessions: PlaySession[], appId: number, months = 12, today = todayYMD()): GameTrendPoint[] {
  const [year, month] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))]
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i -= 1) {
    const total = year * 12 + (month - 1) - i
    keys.push(`${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`)
  }
  const acc = new Map<string, number>(keys.map((k) => [k, 0]))
  for (const s of sessions) {
    if (s.appId !== appId) continue
    const key = s.playDate.slice(0, 7)
    if (acc.has(key)) acc.set(key, (acc.get(key) ?? 0) + s.minutes)
  }
  return keys.map((key) => ({ month: key, minutes: acc.get(key) ?? 0 }))
}

/** 每年累计时长（跨到当前年份） */
export function gameYearlyTotals(sessions: PlaySession[], appId: number): GameTrendPoint[] {
  const acc = new Map<number, number>()
  for (const s of sessions) {
    if (s.appId !== appId) continue
    const year = Number(s.playDate.slice(0, 4))
    acc.set(year, (acc.get(year) ?? 0) + s.minutes)
  }
  const years = Array.from(acc.keys()).sort((a, b) => a - b)
  return years.map((year) => ({ month: String(year), minutes: acc.get(year) ?? 0 }))
}

export function gameSessions(sessions: PlaySession[], appId: number, limit = 12): PlaySession[] {
  return sessions
    .filter((s) => s.appId === appId)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit)
}

export function gameFirstLast(sessions: PlaySession[], appId: number): { first: string | null; last: string | null; days: number } {
  let first: string | null = null
  let last: string | null = null
  let count = 0
  const seen = new Set<string>()
  for (const s of sessions) {
    if (s.appId !== appId) continue
    if (first === null || s.playDate < first) first = s.playDate
    if (last === null || s.playDate > last) last = s.playDate
    if (!seen.has(s.playDate)) {
      seen.add(s.playDate)
      count += 1
    }
  }
  return { first, last, days: count }
}

/* --------------------------- 降价趋势（V3 / F-5） --------------------------- */

export interface PriceTrendSummary {
  /** 统计窗口（天） */
  windowDays: number
  /** 窗口内的采样点数 */
  points: number
  /** 出现过的「降价段」数量 —— 连续几天在打折只算一次 */
  discountRuns: number
  /** 打折期间的平均折扣百分比（0 = 从没打过折） */
  avgDiscountPercent: number
  /** 窗口内的最低到手价 */
  lowestCents: number
  lowestAt: number
  /** 最近一次采样的价格 */
  currentCents: number
  /** 距窗口最低价还差多少；0 表示现在就是窗口内最低 */
  gapToLowestCents: number
  /** 打折时间占窗口的比例（0–100），用来回答「这款游戏常不常打折」 */
  discountDaysPercent: number
}

/**
 * 把 1510 条价格采样里藏着的一件事算出来：**这款游戏多久降一次、降幅多大、最低到过多少**。
 *
 * 为什么比「是否史低」有用：「史低」是二值的，回答不了用户的真实问题
 * —— 「再等等会不会更便宜」。而「过去 90 天降过 3 次，平均打 6 折，最低 ¥42，
 * 现在 ¥58、距最低还差 ¥16」直接把决策依据摆出来了。
 *
 * 全部由本机采样算出，**不引入任何第三方低价数据源**（与「史低」同一口径）。
 * 采样点不足 2 个时返回 null：一次采样推不出「多久降一次」，画出来的会像结论其实是噪音。
 */
export function priceTrend(points: PricePoint[], windowDays = 90, nowSec = Math.floor(Date.now() / 1000)): PriceTrendSummary | null {
  if (points.length < 2) return null
  const threshold = nowSec - windowDays * 86400
  const window = points.filter((p) => p.capturedAt >= threshold).sort((a, b) => a.capturedAt - b.capturedAt)
  if (window.length < 2) return null

  let runs = 0
  let discountPoints = 0
  let discountSum = 0
  let inRun = false
  for (const p of window) {
    const on = p.discountPercent > 0
    if (on) {
      if (!inRun) runs += 1
      discountPoints += 1
      discountSum += p.discountPercent
    }
    inRun = on
  }

  let lowest = window[0]
  for (const p of window) if (p.priceCents >= 0 && p.priceCents < lowest.priceCents) lowest = p
  const current = window[window.length - 1]
  const gap = current.priceCents - lowest.priceCents

  return {
    windowDays,
    points: window.length,
    discountRuns: runs,
    avgDiscountPercent: discountPoints > 0 ? discountSum / discountPoints : 0,
    lowestCents: lowest.priceCents,
    lowestAt: lowest.capturedAt,
    currentCents: current.priceCents,
    gapToLowestCents: gap > 0 ? gap : 0,
    discountDaysPercent: Math.round((discountPoints / window.length) * 100)
  }
}

/**
 * 「现在这个价，在历史采样里算不算便宜」——返回当前价所处的历史分位（0–100）。
 *
 * 0 = 比历史上所有采样都低（即当前就是历史最低）；100 = 比所有采样都高（最贵）。
 * 越接近 0 越划算。V4/F1 用它在详情页给「入手建议」，比单看「是否史低」更有信息量：
 * 「不是史低，但处于历史 12% 分位」比「没到史低」更能支撑「可以入了」。
 *
 * 与 `priceTrend` 同源限制：采样不足 2 条时返回 null（一次采样推不出分位）。
 */
export function pricePercentileRank(points: PricePoint[], priceCents: number): number | null {
  if (points.length < 2 || priceCents < 0) return null
  const vals = points.map((p) => p.priceCents).filter((v) => v >= 0).sort((a, b) => a - b)
  if (vals.length < 2) return null
  let below = 0
  for (const v of vals) if (v <= priceCents) below += 1
  return Math.round((below / (vals.length + 1)) * 100)
}

/**
 * 「Steam 生涯」聚合（V5 差异化功能的核心）。
 *
 * 这一页回答的是**「你的库在过去几年里发生了什么」** —— 而不是「这个游戏现在多少钱」。
 * 差别在于数据来源：Steam 官方没有历史接口，任何现查型工具（含手机端 App）都拿不到这些；
 * 只有本机长期跑、不断累积采样，才能拼出下面这几条曲线。
 *
 * 所有输入都来自本地库，**不额外请求任何接口**，所以它既离线可用也不会消耗 API 配额。
 */
export interface CareerPoint {
  /** YYYY-MM */
  month: string
  /** 当月游玩分钟数（由会话/快照差分汇总） */
  minutes: number
  /** 当月解锁的成就数 */
  achievements: number
  /** 当月新增游戏数（按首玩时间归月） */
  newGames: number
  /** 当月为这些新游戏付出的原价总额（分） */
  spentCents: number
}

export interface CareerSummary {
  months: CareerPoint[]
  totalMinutes: number
  totalAchievements: number
  totalSpentCents: number
  /** 库中原价总额（分）——「你为这个库花了多少钱」的答案 */
  libraryValueCents: number
  /** 有数据的月份数（不足 2 个月时趋势类结论要慎用） */
  monthsCovered: number
  firstMonth: string | null
  lastMonth: string | null
}

function ym(sec: number): string {
  const d = new Date(sec * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 汇总生涯曲线。
 *
 * @param sessions  会话（由快照差分生成）→ 时长
 * @param achievements 成就明细 → 解锁时间
 * @param games 游戏库 → 首玩时间与原价
 * @param months 输出近多少个月（默认 24）
 */
export function buildCareer(
  sessions: PlaySession[],
  achievements: Achievement[],
  games: OwnedGame[],
  months = 24,
  nowSec = Math.floor(Date.now() / 1000)
): CareerSummary {
  const buckets = new Map<string, CareerPoint>()
  const key = (offset: number): string => {
    const d = new Date((nowSec - offset * 30 * 86400) * 1000)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  // 预生成最近 N 个月的桶，保证没有数据的月份也占位（曲线才不会「跳过」空月）
  for (let i = months - 1; i >= 0; i--) {
    buckets.set(key(i), { month: key(i), minutes: 0, achievements: 0, newGames: 0, spentCents: 0 })
  }
  const ensure = (m: string): CareerPoint => {
    let b = buckets.get(m)
    if (!b) { b = { month: m, minutes: 0, achievements: 0, newGames: 0, spentCents: 0 }; buckets.set(m, b) }
    return b
  }

  for (const s of sessions) {
    if (!s.playDate) continue
    ensure(s.playDate.slice(0, 7)).minutes += s.minutes
  }
  for (const a of achievements) {
    if (!a.unlocked || !a.unlockedAt) continue
    ensure(ym(a.unlockedAt)).achievements += 1
  }
  for (const g of games) {
    if (!g.firstPlayedAt) continue
    const b = ensure(ym(g.firstPlayedAt))
    b.newGames += 1
    // 原价才是「花出去的钱」：现价只是今天的标价，用它会低估历史投入
    b.spentCents += g.originalPriceCents > 0 ? g.originalPriceCents : 0
  }

  const list = [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month))
  const totalMinutes = list.reduce((s, p) => s + p.minutes, 0)
  const totalAchievements = achievements.filter((a) => a.unlocked).length
  const totalSpentCents = list.reduce((s, p) => s + p.spentCents, 0)
  const libraryValueCents = games.reduce((s, g) => s + (g.originalPriceCents > 0 ? g.originalPriceCents : 0), 0)
  const covered = list.filter((p) => p.minutes > 0 || p.achievements > 0 || p.newGames > 0).length

  return {
    months: list,
    totalMinutes,
    totalAchievements,
    totalSpentCents,
    libraryValueCents,
    monthsCovered: covered,
    firstMonth: list[0]?.month ?? null,
    lastMonth: list[list.length - 1]?.month ?? null
  }
}
