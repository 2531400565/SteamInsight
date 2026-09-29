// 确定性（固定种子）演示数据集生成器。禁止 Math.random，不发起网络请求，不读写文件。
// 除常量外全部数据在对应 buildDemoXxx() 被调用时才生成，惰性缓存避免重复计算。
//
// 会话生成口径（这一段决定页面上所有时间类图表是否可信）：
//   旧做法「按自然日顺序全局贪心塞游戏」会让时长被早期日期耗尽，导致最近几个月完全空白。
//   现在改为「按游戏逐个分配」：每款游戏在自己的首玩~末玩窗口内按权重采样若干天（周末/节假日/近期权重更高、
//   且必定包含它的最后一次游玩日），再把这游戏自己的 playtimeForever 精确摊到这些天上。
//   这样既保证单游戏时长与 Steam 累计值严格一致，也让时间分布自然铺满整个区间。
import type { SteamUser, OwnedGame, PlaySession, Achievement } from '@/types/steam'
import { CATALOG } from './catalog'
import { DEMO_STEAM_ID, HOLIDAYS, MS_DAY, START_UTC, TODAY_SEC, TODAY_UTC, mulberry32, pick, rint, rnd } from './seed'

// 价格侧生成器（愿望单 / 折扣 / 价格历史）在 pricing.ts，随机序列与这里共用同一个种子
export { DEMO_STEAM_ID }
export { buildDemoDiscounts, buildDemoPriceHistory, buildDemoWishlist } from './pricing'

const ACH_NAMES = ['The First Step', 'Tutorial Complete', 'First Blood', 'Sharpshooter', 'Explorer', 'Survivor', 'Collector', 'Night Owl', 'Perfectionist', 'Boss Slayer', 'Speedrunner', 'Pacifist', 'Completionist', 'Team Player', 'Lone Wolf', 'World Traveler', 'Master Crafter', 'Legend', 'Unstoppable', 'Hidden Truth']
const MAIN = new Set([14, 15, 30, 31, 32, 33, 34, 36])
const NEVER = new Set([2, 4, 6, 18, 19, 40])
const DRIVER = 26
const STREAK_DAYS = 14

let nextId = 1

const fmtDate = (sec: number): string => { const d = new Date(sec * 1000); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}` }
const parseYMD = (s: string): [number, number, number] => { const p = s.split('-').map(Number); return [p[0], p[1], p[2]] }
function dayIndex(startUTC: number, sec: number, totalDays: number): number { let idx = Math.round((sec * 1000 - startUTC) / MS_DAY); if (idx < 0) idx = 0; if (idx > totalDays) idx = totalDays; return idx }

function achGlobalPercent(appId: number, i: number): number {
  const h = mulberry32((appId * 131 + i * 977 + 17) >>> 0)()
  if (h < 0.18) return Math.round((0.5 + (h / 0.18) * 4.5) * 10) / 10
  return Math.round((20 + ((h - 0.18) / 0.82) * 70) * 10) / 10
}

function computeGames(): OwnedGame[] {
  return CATALOG.map((c, idx) => {
    const [y, m, d] = parseYMD(c.releaseDate)
    const relSec = Date.UTC(y, m - 1, d) / 1000
    let total: number
    let twoWeeks = 0
    if (MAIN.has(idx)) total = rint(12000, 36000)
    else if (NEVER.has(idx)) total = rint(20, 110)
    else total = rint(500, 9000)
    if (idx === DRIVER) { total = rint(1800, 2600); twoWeeks = rint(300, 1500) }
    else if (MAIN.has(idx) && idx % 2 === 0) twoWeeks = rint(120, 2000)
    const lastOffset = idx === DRIVER ? 0 : MAIN.has(idx) ? pick([3, 8, 15, 40, 120, 200, 300]) : NEVER.has(idx) ? pick([5, 120, 250, 450, 600, 800]) : rint(2, 900)
    const last = TODAY_SEC - lastOffset * 86400
    const span = idx === DRIVER ? 13 : MAIN.has(idx) ? rint(300, 1200) : NEVER.has(idx) ? rint(2, 40) : rint(60, 800)
    let first = last - span * 86400
    if (first < relSec) first = relSec + rint(1, 10) * 86400
    if (first > last) first = last - 86400
    const firstEst = Number(c.releaseDate.slice(0, 4)) <= 2021
    const aTotal = NEVER.has(idx) ? (rnd() < 0.3 ? 0 : rint(5, 30)) : rint(20, 80)
    const aUnlocked = aTotal === 0 ? 0 : Math.min(aTotal, Math.round(aTotal * rnd()))
    let rare = 0
    for (let i = 0; i < aUnlocked; i++) if (achGlobalPercent(c.appId, i) < 10) rare++
    return {
      appId: c.appId, name: c.name,
      headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${c.appId}/header.jpg`,
      capsuleImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${c.appId}/capsule_616x353.jpg`,
      genres: c.genres, tags: c.tags, releaseDate: c.releaseDate, developer: c.developer, publisher: c.publisher,
      priceCents: c.basePriceCents, originalPriceCents: c.baseOriginalPriceCents, priceCheckedAt: TODAY_SEC,
      isHistoricalLow: false, reviewPercent: c.reviewPercent, reviewCount: c.reviewCount,
      playtimeForeverMin: total, playtimeTwoWeeksMin: twoWeeks,
      firstPlayedAt: Math.round(first), lastPlayedAt: Math.round(last),
      achievementsTotal: aTotal, achievementsUnlocked: aUnlocked, rareAchievements: rare, firstPlayedEstimated: firstEst
    }
  })
}

/** 把 total 分钟摊成 n 段（每段 20~240 分钟），合计严格等于 total。 */
function splitMinutes(total: number, n: number): number[] {
  if (n <= 1) return [total]
  const out: number[] = []
  let rem = total
  for (let k = 0; k < n - 1; k++) {
    const left = n - k
    const cap = Math.max(1, rem - 20 * (left - 1))
    let part = Math.round(rem / left + (rnd() - 0.5) * 70)
    part = Math.max(20, Math.min(part, Math.min(240, cap)))
    if (part > rem) part = rem
    out.push(part)
    rem -= part
  }
  out.push(rem)
  return out
}

/** 在 [from,to] 内不重复地按权重采样 count 天，返回升序的日索引。 */
function sampleDays(from: number, to: number, count: number, weight: (d: number) => number): number[] {
  const pool: Array<{ d: number; w: number }> = []
  for (let d = from; d <= to; d++) pool.push({ d, w: weight(d) })
  const take = Math.min(count, pool.length)
  const picked: number[] = []
  let totalWeight = pool.reduce((a, p) => a + p.w, 0)
  for (let k = 0; k < take; k++) {
    let r = rnd() * totalWeight
    let idx = pool.length - 1
    for (let i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) { idx = i; break } }
    picked.push(pool[idx].d)
    totalWeight -= pool[idx].w
    pool.splice(idx, 1)
  }
  return picked.sort((a, b) => a - b)
}

function computeSessions(games: OwnedGame[]): PlaySession[] {
  const sessions: PlaySession[] = []
  const totalDays = Math.round((TODAY_UTC - START_UTC) / MS_DAY)
  /** 第 d 天的 UTC 零点：只用来推「日期字符串」与星期，保证换台机器生成结果一致。 */
  const dayStartUTC = (d: number): number => START_UTC / 1000 + d * 86400
  /** 第 d 天的本地零点：会话「几点开始」必须用本地时间，否则页面上的时段分布会整体偏移一个时区。 */
  const dayStartLocal = (d: number): number => {
    const [y, m, day] = parseYMD(fmtDate(dayStartUTC(d)))
    return new Date(y, m - 1, day).getTime() / 1000
  }

  // 周末、节假日更活跃；越接近今天权重越高（真实玩家的近期活跃度通常大于两年前）
  const dayWeight = (d: number): number => {
    const sec = dayStartUTC(d)
    const wd = new Date(sec * 1000).getUTCDay()
    let w = wd === 0 || wd === 6 ? 1.9 : 1
    if (HOLIDAYS.has(fmtDate(sec))) w += 1.2
    return w * (0.5 + 0.5 * (d / totalDays))
  }

  /** 会话集中在本地时间傍晚到深夜（17:00 起），并保证「开始时刻 + 时长」不越过当天本地零点。 */
  const pushSession = (appId: number, d: number, minutes: number): void => {
    if (minutes <= 0) return
    const dayStart = dayStartLocal(d)
    const latest = dayStart + (24 * 60 - minutes) * 60
    const wanted = dayStart + Math.round(17 * 60 + rnd() * (6 * 60)) * 60
    const startedAt = Math.min(wanted, latest)
    sessions.push({
      id: nextId++, steamId: DEMO_STEAM_ID, appId, playDate: fmtDate(dayStartUTC(d)), minutes,
      startedAt, endedAt: startedAt + minutes * 60, source: 'demo'
    })
  }

  // 1) 驱动游戏：先把最近 14 天占满，保证「连续游玩天数」与「最近 7 天」指标成立
  const driver = games[DRIVER]
  let driverRemaining = driver.playtimeForeverMin
  for (let off = STREAK_DAYS - 1; off >= 0 && driverRemaining >= 40; off--) {
    const chunk = Math.min(driverRemaining - 20, rint(50, 165))
    pushSession(driver.appId, totalDays - off, chunk)
    driverRemaining -= chunk
  }

  // 2) 其余时长按游戏逐个摊到它自己的窗口里
  for (let gi = 0; gi < games.length; gi++) {
    const game = games[gi]
    const remaining = gi === DRIVER ? driverRemaining : game.playtimeForeverMin
    if (remaining <= 0) continue
    const first = dayIndex(START_UTC, game.firstPlayedAt ?? START_UTC / 1000, totalDays)
    const last = dayIndex(START_UTC, game.lastPlayedAt ?? TODAY_SEC, totalDays)
    const span = Math.max(1, last - first + 1)
    // 单段目标 150 分钟，段数不超过窗口天数
    const segCount = Math.max(1, Math.min(span, Math.round(remaining / 150)))
    // 窗口上界：驱动游戏最近 14 天已经占过，避免同一天重复堆叠
    const upper = gi === DRIVER ? Math.max(first, last - STREAK_DAYS) : last
    const fixedDays = [last]
    const extra = segCount > 1 ? sampleDays(first, Math.max(first, upper), segCount - 1, dayWeight) : []
    const days = Array.from(new Set([...fixedDays, ...extra])).sort((a, b) => a - b)
    const parts = splitMinutes(remaining, days.length)
    for (let k = 0; k < days.length; k++) pushSession(game.appId, days[k], parts[k])
  }

  sessions.sort((a, b) => a.startedAt - b.startedAt)
  return sessions
}

function computeAchievements(games: OwnedGame[]): Achievement[] {
  const out: Achievement[] = []
  const byApp = new Map<number, PlaySession[]>()
  for (const s of getSessions()) { const a = byApp.get(s.appId); if (a) a.push(s); else byApp.set(s.appId, [s]) }
  for (const g of games) {
    if (g.achievementsTotal === 0) continue
    // 覆盖全部有成就系统的游戏：成就中心的分母取自 games 表，
    // 若这里只生成前若干款，「总成就数」与「成就明细列表」就会对不上。
    const gs = byApp.get(g.appId) ?? []
    for (let i = 0; i < g.achievementsTotal; i++) {
      const unlocked = i < g.achievementsUnlocked
      const gp = achGlobalPercent(g.appId, i)
      const hash = ((g.appId * 31 + i * 17) >>> 0).toString(16).padStart(8, '0')
      const unlockedAt = unlocked ? (gs.length > 0 ? gs[Math.min(gs.length - 1, Math.floor(rnd() * gs.length))].startedAt : (g.firstPlayedAt ?? null)) : null
      out.push({
        appId: g.appId, apiName: `ACH_${g.appId}_${i + 1}`, displayName: ACH_NAMES[i % ACH_NAMES.length],
        description: `Achievement ${i + 1} for app ${g.appId}`,
        iconUrl: `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${g.appId}/${hash}.jpg`,
        iconGrayUrl: `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${g.appId}/${hash}_gray.jpg`,
        unlocked, unlockedAt, globalPercent: gp, isRare: gp < 10, hidden: rnd() < 0.1
      })
    }
  }
  return out
}

let gamesCache: OwnedGame[] | null = null
let sessionsCache: PlaySession[] | null = null
let achCache: Achievement[] | null = null
function getGames(): OwnedGame[] { if (!gamesCache) gamesCache = computeGames(); return gamesCache }
function getSessions(): PlaySession[] { if (!sessionsCache) sessionsCache = computeSessions(getGames()); return sessionsCache }

export function buildDemoUser(): SteamUser {
  return {
    steamId: DEMO_STEAM_ID, personaName: 'NovaSteam',
    avatarUrl: 'https://avatars.steamstatic.com/a1b2c3d4e5f60718293a4b5c6d7e8f90.jpg',
    profileUrl: `https://steamcommunity.com/profiles/${DEMO_STEAM_ID}`,
    countryCode: 'CN', accountCreatedAt: Math.round(Date.UTC(2016, 5, 12) / 1000),
    lastLogoffAt: Math.round(TODAY_SEC - 3600), personaState: 1, source: 'demo', syncedAt: Math.round(TODAY_SEC)
  }
}
export function buildDemoGames(): OwnedGame[] { return getGames() }
export function buildDemoSessions(games: OwnedGame[]): PlaySession[] { if (sessionsCache) return sessionsCache; sessionsCache = computeSessions(games); return sessionsCache }
export function buildDemoAchievements(games: OwnedGame[]): Achievement[] { if (achCache) return achCache; achCache = computeAchievements(games); return achCache }
