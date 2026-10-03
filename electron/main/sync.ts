/**
 * 同步编排。产品事实（必须尊重）：Steam 官方 API 不提供「每天玩了多少分钟」。
 * 因此 play_sessions 只有两个来源：
 *  1) 快照差分采样：每次同步把每款游戏的 playtime_forever 写入 snapshots 表，与上次值之差按本次同步时间归到当天，生成一条会话（真实数据）。
 *  2) 演示模式：无 Key 或未登录且 enableDemoData=true 时，用 mock/dataset 生成整套数据写入 SQLite。
 * 史低：无第三方数据源，price_history 每次追加采样，isHistoricalLow = 当前价 ≤ 历史采样最低价。绝不信称有外部史低源。
 */
import type { SyncStatusPayload } from '@shared/contract'
import type { SyncRunOptions } from '@/types/ipc'
import type { Achievement, DiscountItem, DataSource, OwnedGame, PlaySession, PricePoint, SteamUser, WishlistItem } from '@/types/steam'
import { getSettings, setSettings } from './settings'
import * as repo from './repository'
import { clearAll } from './database'
import { detectAccountSwitch, pruneSamples, prunePickedUnlocked, purgePreviousAccount, stampGameOwners } from './user-data'
import { detectSteam } from './steam-detect'
import { pool } from './api-base'
import { syncAchievements } from './achievement-sync'
import { getPlayerSummaries, getOwnedGames, getPlayerProfile, getWishlist } from './steam-api'
import { storeAppDetails, storeFeaturedCategories, storeSearchSpecials, type SearchSpecialItem } from './steam-store'
import { notify } from './notifications'
import { markDiscountsNotified, markWishlistNotified, planNotifications, type NotifySource } from './notify-plan'
import { logError, logInfo, logWarn } from './logger'
import { buildDemoUser, buildDemoGames, buildDemoSessions, buildDemoAchievements, buildDemoWishlist, buildDemoDiscounts, buildDemoPriceHistory } from '@/services/mock/dataset'

/**
 * 游戏库商店详情的缓存有效期（小时）。
 *
 * 为什么需要：`buildApiData()` 早前每次同步都对**整个游戏库**重拉 appdetails + appreviews，
 * 没有任何过期判断。默认 30 分钟同步一次，69 款库 ≈ 3300 次/天，500 款库 ≈ 24000 次/天。
 * 而成就侧早就做了增量（achievement-sync.ts），两边不对称。
 *
 * 为什么是 12 小时：分类 / 标签 / 发行信息几乎不变，价格变动的真正信号来自
 * **愿望单与折扣专区**（这两个仍然每次刷）。所以库内详情半天刷一次足够，
 * 又不至于让价格长期停留在旧值。用户手动点「立即同步」时传 `force` 直接绕过。
 */
const STORE_DETAIL_TTL_HOURS = 12

/** meta 表里记录「稀有成就追猎提醒上次弹出的日期」的键。 */
const HUNT_META_KEY = 'hunt_notified_on'

interface SyncData {
  user: SteamUser; games: OwnedGame[]; sessions: PlaySession[]; achievements: Achievement[]
  wishlist: WishlistItem[]; discounts: DiscountItem[]; priceHistory: PricePoint[]
  /**
   * 本轮**促销数据源是否可信**（false = featuredcategories 与搜索 specials 都没拿到东西）。
   *
   * 这个标记存在的唯一理由：`purgeDiscounts` 会删掉「本轮结果里没有」的行，可它分不清
   * 「这个折扣真的结束了」和「这一轮根本没查到」。实测踩过：09:33 写入 40 条，09:55 那一轮
   * 搜索源没返回 → 31 条被当成已下架删光，界面上「在售折扣」从 40 款掉回 9 款。
   * 所以数据源不可用时必须**跳过折扣清理**、沿用上次结果，并如实告诉用户本轮没查到。
   */
  discountsTrusted: boolean
}

let lastStatus: SyncStatusPayload = { phase: 'idle', running: false, message: '', progress: 0, lastSyncAt: null, lastSyncOk: null, lastError: null, source: 'demo' }
let broadcast: (p: SyncStatusPayload) => void = () => {}
export function setSyncBroadcaster(fn: (p: SyncStatusPayload) => void): void { broadcast = fn }
/** 冷启动回填：数据库里已有历史同步结果时，让界面显示真实的上次同步时间而不是「尚未同步」。 */
export function primeStatus(patch: Partial<SyncStatusPayload>): void { update(patch) }

/** 本地日期 YYYY-MM-DD（快照差分把差值归到「今天」）。 */
function todayYMD(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function update(p: Partial<SyncStatusPayload>): void { lastStatus = { ...lastStatus, ...p }; broadcast(lastStatus) }
export function getSyncStatus(): SyncStatusPayload { return { ...lastStatus } }

/** 当前是否有同步在跑。VACUUM 这类「重建整个库文件」的操作必须先问它。 */
export function isRunning(): boolean { return lastStatus.running }

// ---------- 演示模式：直接消费确定性数据集 ----------
function buildDemoData(): SyncData {
  const user = buildDemoUser()
  const games = buildDemoGames()
  const sessions = buildDemoSessions(games)
  const achievements = buildDemoAchievements(games)
  const wishlist = buildDemoWishlist()
  const discounts = buildDemoDiscounts()
  const priceHistory = buildDemoPriceHistory(games.map((g) => g.appId))
  // 演示数据集是本地内置的，不存在「数据源没查到」这回事
  return { user, games, sessions, achievements, wishlist, discounts, priceHistory, discountsTrusted: true }
}

// ---------- API 模式：真实拉取 ----------
async function buildApiData(settings: ReturnType<typeof getSettings>, force: boolean): Promise<SyncData> {
  const now = Math.floor(Date.now() / 1000)
  const steamId = settings.steamId
  // F-6：等级 / 徽章与资料并行拉。它们失败只降级为 0，**绝不能拖垮同步** ——
  // 这是锦上添花的数据，为了它让「同步失败」是完全不划算的取舍。
  const [profileSummary, profileBadges] = await Promise.all([
    getPlayerSummaries(steamId),
    getPlayerProfile(steamId).catch((e) => {
      logWarn('sync', 'Steam 等级/徽章拉取失败，按 0 兜底', { error: e instanceof Error ? e.message : String(e) })
      return { level: 0, badgeCount: 0, badgeXp: 0, playerXp: 0, xpToNext: 0 }
    })
  ])
  const user = {
    steamId: profileSummary.steamId, personaName: profileSummary.personaName, avatarUrl: profileSummary.avatarUrl, profileUrl: profileSummary.profileUrl,
    countryCode: profileSummary.countryCode, accountCreatedAt: profileSummary.accountCreatedAt, lastLogoffAt: profileSummary.lastLogoffAt,
    personaState: profileSummary.personaState, source: 'api' as const, syncedAt: now,
    level: profileBadges.level, badgeCount: profileBadges.badgeCount, badgeXp: profileBadges.badgeXp,
    playerXp: profileBadges.playerXp, xpToNext: profileBadges.xpToNext
  }
  const owned = await getOwnedGames(steamId)

  // 商店详情 TTL：库内 TTL 内的游戏直接复用上次的字段，不再重拉（详见文件顶部 STORE_DETAIL_TTL_HOURS）。
  const previous = repo.existingGames()
  const ttlSeconds = STORE_DETAIL_TTL_HOURS * 3600
  const staleIds: number[] = []
  for (const g of owned) {
    const prev = previous.get(g.appId)
    const fresh = !force && prev !== undefined && prev.priceCheckedAt !== null && now - prev.priceCheckedAt < ttlSeconds
    if (!fresh) staleIds.push(g.appId)
  }
  const storeCache = new Map<number, Awaited<ReturnType<typeof storeAppDetails>> | null>()
  await pool(staleIds, 4, async (appId) => { storeCache.set(appId, await storeAppDetails(appId).catch(() => null)) })
  logInfo('sync', '商店详情拉取', {
    owned: owned.length, fetched: staleIds.length, skippedByTtl: owned.length - staleIds.length,
    ttlHours: STORE_DETAIL_TTL_HOURS, force
  })

  const cdn = (appId: number, file: string): string => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/${file}`
  const games: OwnedGame[] = owned.map((g) => {
    const s = storeCache.get(g.appId)
    // TTL 命中 / 本次请求失败的两种情况都退回复用旧值；旧值也没有才用默认值。
    // 注意 upsert 的空值保护只负责「不把好数据洗成空」，它救不了 priceCheckedAt 被刷新 —— 所以必须在这里显式复用。
    const prev = previous.get(g.appId)
    return {
      appId: g.appId,
      name: s?.name || prev?.name || g.name,
      headerImage: prev?.headerImage || cdn(g.appId, 'header.jpg'),
      capsuleImage: prev?.capsuleImage || cdn(g.appId, 'capsule_616x353.jpg'),
      genres: s?.genres ?? prev?.genres ?? [], tags: s?.tags ?? prev?.tags ?? [],
      releaseDate: s?.releaseDate || prev?.releaseDate || '',
      developer: s?.developer || prev?.developer || '', publisher: s?.publisher || prev?.publisher || '',
      priceCents: s?.priceCents ?? prev?.priceCents ?? -1,
      originalPriceCents: s?.originalPriceCents ?? prev?.originalPriceCents ?? -1,
      // 只有真拉到新数据才推进 TTL 时间戳，否则 TTL 会被自己无限续期
      priceCheckedAt: s ? now : (prev?.priceCheckedAt ?? null),
      isHistoricalLow: false,
      reviewPercent: s?.reviewPercent ?? prev?.reviewPercent ?? 0,
      reviewCount: s?.reviewCount ?? prev?.reviewCount ?? 0,
      playtimeForeverMin: g.playtimeForeverMin, playtimeTwoWeeksMin: g.playtimeTwoWeeksMin,
      firstPlayedAt: prev?.firstPlayedAt ?? null, lastPlayedAt: g.lastPlayedAt,
      achievementsTotal: 0, achievementsUnlocked: 0,
      // 沿用上次的「精确/推算」标记：本次没重拉成就时，别把已经确认过的精确值降级成推算值
      rareAchievements: 0, firstPlayedEstimated: prev?.firstPlayedEstimated ?? true, source: 'api' as const
    }
  })

  // 快照差分：与上次 playtime 之差归到今天
  const today = todayYMD()
  const todayStart = Math.floor(Date.now() / 1000)
  const sessions: PlaySession[] = []
  // 顺手记下「这次被玩过」的游戏（playtime 相比上次快照有增长）—— 增量拉成就的判据。
  const playedAppIds = new Set<number>()
  for (const g of games) {
    // 先读上一次快照（差分基准，只认当前账号的行），再写入本次快照（带账号标记），
    // 否则会读到刚写的值导致差分为 0 —— 账号参数见 V5 优化 1（snapshots.steam_id）。
    const prev = repo.lastSnapshot(g.appId, steamId)
    repo.saveSnapshot(g.appId, todayStart, g.playtimeForeverMin, steamId)
    if (prev !== null && g.playtimeForeverMin > prev) {
      playedAppIds.add(g.appId)
      sessions.push({ id: 0, steamId, appId: g.appId, playDate: today, minutes: g.playtimeForeverMin - prev, startedAt: todayStart, endedAt: todayStart, source: 'api' })
    }
  }

  // 成就：逐游戏「按需」拉取（并发 4）。增量判据与旧值回填都在 achievement-sync.ts 里。
  const { achievements, firstByGame } = await syncAchievements(steamId, games, playedAppIds)
  // 首玩时间取「最早会话 / 最早解锁成就」较小值
  for (const s of sessions) { const cur = firstByGame.get(s.appId); if (!cur || s.startedAt < cur) firstByGame.set(s.appId, s.startedAt) }
  for (const g of games) { const f = firstByGame.get(g.appId) ?? null; if (f) { g.firstPlayedAt = f; g.firstPlayedEstimated = false } }

  // 愿望单：拉取后补价格
  const wlRaw = await getWishlist(steamId)
  const wishlist: WishlistItem[] = []
  await pool(wlRaw, 4, async (w) => {
    const s = await storeAppDetails(w.appId).catch(() => null)
    const orig = s?.originalPriceCents ?? -1
    const fin = s?.priceCents ?? -1
    wishlist.push({
      appId: w.appId, steamId, name: s?.name || w.name, headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${w.appId}/header.jpg`,
      // GetWishlist 的原文没有 tags 字段（实测只有 appid / priority / date_added），
      // 从它取永远是空数组 → 愿望单页的「标签分类」行只剩「全部」。同一个循环里
      // 已经调了 storeAppDetails()，它返回真实标签（游戏库 / 折扣表用的就是这套）。
      addedAt: w.addedAt, priority: w.priority, tags: s?.tags?.length ? s.tags : w.tags, originalPriceCents: orig, finalPriceCents: fin,
      // 折扣率是派生值：价格拿不到时用 -1（未知）而不是 0，
      // 否则会被 upsert 当场写进去，出现「价格保留旧值、折扣却变成无折扣」的自相矛盾
      discountPercent: orig > 0 && fin >= 0 ? Math.round((1 - fin / orig) * 100) : -1, currency: 'CNY',
      isHistoricalLow: false, historicalLowCents: -1, historicalLowAt: null, reviewPercent: s?.reviewPercent || 0, reviewCount: s?.reviewCount || 0,
      releaseDate: s?.releaseDate || '', notifiedAt: null
    })
  })

  // 折扣：specials 是「今日热门折扣」的真实来源；限时免费来自官方搜索接口（featuredcategories 没有 free 分类）。
  const featured = await storeFeaturedCategories().catch(() => ({ specials: [] as Array<{ appId: number; name: string; endsAt: number | null }>, freeAppIds: [] as number[] }))
  const discounts: DiscountItem[] = []
  const added = new Set<number>()
  const pushDiscount = (s: NonNullable<Awaited<ReturnType<typeof storeAppDetails>>>, category: DiscountItem['category']): void => {
    if (added.has(s.appId)) return
    added.add(s.appId)
    discounts.push(mkDiscount(s, category, now))
  }
  await pool(featured.specials, 4, async (sp) => {
    const s = await storeAppDetails(sp.appId).catch(() => null)
    if (!s) return
    // 促销到期时间只有 featuredcategories 有（appdetails 不返回该字段），
    // 缺了它「即将结束优先」排序与卡片上的倒计时会永远失效
    if (!s.endsAt && sp.endsAt) s.endsAt = sp.endsAt
    // 100% off（原价 > 0、现价 0）就是限时免费，必须归 'free'；
    // 早前只看 is_free（boolean 被当成 0）且把它排在 hot 判断之后，两个分类互相错位。
    if (s.priceCents === 0 && s.originalPriceCents > 0) pushDiscount(s, 'free')
    else if (s.priceCents > 0 && s.originalPriceCents > s.priceCents) pushDiscount(s, 'hot')
  })
  // 官方搜索接口发现的限时免费条目（不走 specials，避免遗漏）
  await pool(featured.freeAppIds, 4, async (appId) => {
    if (added.has(appId)) return
    const s = await storeAppDetails(appId).catch(() => null)
    if (s && s.priceCents === 0 && s.originalPriceCents > 0) pushDiscount(s, 'free')
  })

  // 折扣池扩容：featuredcategories 的 specials 恒定只有 10 条（实测 cc=cn/cc=us 都是 10，
  // 它给的是「今日精选」而非全部促销），所以「在售折扣只有 9 款」是源头上限，不是采集失败。
  // 搜索接口一次给几十条，且单条已含中文名/现价/原价/折扣率/好评率，**无需再逐条打 appdetails**
  // —— 折扣条目没有 TTL 缓存，每多一条就是每轮多两个请求，代价必须算清楚。
  // 拿不到 tags / 评测数量，所以这些条目 reviewPercent 之外的信息较薄，不参与「高评分折扣」筛选。
  const searchSpecials = await storeSearchSpecials().catch(() => [] as SearchSpecialItem[])
  let addedFromSearch = 0
  for (const it of searchSpecials) {
    if (added.has(it.appId)) continue
    // 100% 折扣（现价 0）归 free —— 与上面 specials 的判定保持同一套口径
    const category: DiscountItem['category'] = it.finalPriceCents === 0 && it.originalPriceCents > 0 ? 'free' : 'hot'
    if (category === 'hot' && it.finalPriceCents <= 0) continue
    added.add(it.appId)
    addedFromSearch += 1
    discounts.push({
      appId: it.appId, name: it.name, headerImage: it.headerImage,
      originalPriceCents: it.originalPriceCents, finalPriceCents: it.finalPriceCents,
      discountPercent: it.discountPercent, currency: 'CNY',
      isHistoricalLow: false, historicalLowCents: -1,
      reviewPercent: it.reviewPercent, reviewCount: it.reviewCount, tags: [], releaseDate: it.releaseDate,
      storeUrl: `https://store.steampowered.com/app/${it.appId}/`, category,
      // endsAt 只有 featuredcategories 给了；搜索结果里没有促销到期时间，卡片不显示倒计时、
      // 「即将结束优先」排序里这些条目会排在最后（不猜，避免显示错误的截止时间）。
      endsAt: null, fetchedAt: now, notifiedAt: null
    })
  }
  logInfo('sync', '折扣池', { featured: featured.specials.length, searchParsed: searchSpecials.length, addedFromSearch, total: discounts.length })

  // 两个源都空 = 本轮什么都没查到（网络问题 / 接口改版 / 被限流）。此时 discounts 也是空的，
  // 若照常清理就会把上一次的条目全删光 —— 用这个标记把「没查到」和「已下架」区分开。
  const discountsTrusted = featured.specials.length > 0 || searchSpecials.length > 0
  if (!discountsTrusted) {
    logWarn('sync', '本轮未取到任何促销数据，折扣列表将沿用上次结果', { featured: 0, searchParsed: 0 })
  }

  // 价格采样 + 史低判定：游戏库、愿望单、折扣条目统一采样。
  // 早前只采样游戏库，折扣商品从不进 price_history →「史低专区」永远算不出来。
  const samples: Array<{ appId: number; priceCents: number; originalPriceCents: number }> = []
  for (const g of games) if (g.priceCents >= 0) samples.push({ appId: g.appId, priceCents: g.priceCents, originalPriceCents: g.originalPriceCents })
  for (const w of wishlist) if (w.finalPriceCents >= 0) samples.push({ appId: w.appId, priceCents: w.finalPriceCents, originalPriceCents: w.originalPriceCents })
  for (const d of discounts) if (d.finalPriceCents >= 0) samples.push({ appId: d.appId, priceCents: d.finalPriceCents, originalPriceCents: d.originalPriceCents })

  const priceHistory: PricePoint[] = []
  const lowByApp = new Map<number, number>()
  const isLowByApp = new Map<number, boolean>()
  const bestByApp = new Map<number, number>()
  for (const s of samples) {
    if (!lowByApp.has(s.appId)) lowByApp.set(s.appId, repo.priceLowest(s.appId) ?? -1)
    const prevLow = lowByApp.get(s.appId) ?? -1
    // 史低需要至少一次「历史采样」可比；首次采样不算史低，否则全部条目都会被标成史低
    const isLow = prevLow >= 0 && s.priceCents <= prevLow
    const best = prevLow < 0 ? s.priceCents : Math.min(prevLow, s.priceCents)
    lowByApp.set(s.appId, best)
    bestByApp.set(s.appId, best)
    if (isLow) isLowByApp.set(s.appId, true)
    priceHistory.push({
      appId: s.appId, capturedAt: now, priceCents: s.priceCents, originalPriceCents: s.originalPriceCents,
      discountPercent: s.originalPriceCents > 0 ? Math.round((1 - s.priceCents / s.originalPriceCents) * 100) : 0,
      isHistoricalLow: isLow
    })
  }
  for (const g of games) g.isHistoricalLow = isLowByApp.get(g.appId) ?? false
  for (const d of discounts) {
    d.isHistoricalLow = isLowByApp.get(d.appId) ?? false
    d.historicalLowCents = bestByApp.get(d.appId) ?? -1
  }
  for (const w of wishlist) {
    w.isHistoricalLow = isLowByApp.get(w.appId) ?? false
    const best = bestByApp.get(w.appId)
    if (best !== undefined) { w.historicalLowCents = best; if (w.isHistoricalLow) w.historicalLowAt = now }
  }
  return { user, games, sessions, achievements, wishlist, discounts, priceHistory, discountsTrusted }
}
function mkDiscount(s: NonNullable<Awaited<ReturnType<typeof storeAppDetails>>>, category: DiscountItem['category'], now: number): DiscountItem {
  const orig = s.originalPriceCents, fin = s.priceCents, disc = orig > 0 && fin >= 0 ? Math.round((1 - fin / orig) * 100) : 0
  return {
    appId: s.appId, name: s.name, headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${s.appId}/header.jpg`,
    originalPriceCents: orig, finalPriceCents: fin, discountPercent: disc, currency: 'CNY', isHistoricalLow: false, historicalLowCents: -1,
    reviewPercent: s.reviewPercent, reviewCount: s.reviewCount, tags: s.tags, releaseDate: s.releaseDate,
    storeUrl: `https://store.steampowered.com/app/${s.appId}/`, category, endsAt: s.endsAt, fetchedAt: now,
    // null 交给 upsert 的 COALESCE 保护：已提醒过的条目不会被本次同步重置成「未提醒」。
    notifiedAt: null
  }
}

// ---------- 写库 + 通知 ----------
/**
 * 清理本次结果里已经不存在的数据：出库 / 换了账号 / 移出愿望单 / 促销结束。
 * 不清理的话这些行会永远留在库里，而 `loadSnapshot()` 是整表返回，界面会一直显示幽灵条目。
 *
 * 用 `d.games` 的完整 app_id 列表（而不是「本次新写入的 id」）：增量同步会跳过未变化的游戏，
 * 它们的行必须留下。全部列表为空时 `purgeStale()` 内部会直接返回 0，不会误清库。
 */
/**
 * 折扣清理决策（纯函数，便于探针直接验证这条不变量）。
 *
 * 规则只有一条：**「本轮没查到」不等于「折扣已下架」**。
 * 数据源不可用时返回 purge=false，沿用上次结果 —— 宁可短暂多留几条已结束的条目，
 * 也不能把用户的列表凭空删掉一半（实测踩过：40 款掉回 9 款，且无法自愈）。
 */
export function planDiscountPurge(
  discountsTrusted: boolean,
  currentCount: number
): { purge: boolean; reason: string } {
  if (!discountsTrusted) {
    return { purge: false, reason: '本轮未取到促销数据，沿用上次结果（不把「没查到」当成「已下架」）' }
  }
  if (currentCount === 0) {
    return { purge: false, reason: '本轮促销列表为空，清空全部没有意义' }
  }
  return { purge: true, reason: '本轮取到了促销数据，按本轮结果清理' }
}

/**
 * 清理本次结果里已经不存在的数据。
 *
 * `discounts` 的清理走 `planDiscountPurge` 决策（见其注释）：数据源不可用时跳过，
 * 沿用上次结果。其它三类表没有这个问题 —— games / achievements / wishlist 都来自
 * 必然成功的账号接口，请求失败会直接抛错终止同步，根本走不到清理这步。
 */
function purgeStale(d: SyncData): number {
  const ownedIds = d.games.map((g) => g.appId)
  const base = repo.purgeGames(ownedIds) + repo.purgeAchievements(ownedIds)
    + repo.purgeWishlist(d.wishlist.map((w) => w.appId))
  const plan = planDiscountPurge(d.discountsTrusted, d.discounts.length)
  if (!plan.purge) {
    logInfo('sync', '跳过折扣清理', { reason: plan.reason, kept: d.discounts.length })
    return base
  }
  return base + repo.purgeDiscounts(d.discounts.map((x) => x.appId))
}

function persist(d: SyncData, full: boolean): Record<string, number> {
  if (full) clearAll()
  const settings = getSettings()
  // 换账号只在「真实账号同步」时判定：演示数据集的 steamId 是内置常量，
  // 拿它和真实账号比会凭空报一次「换账号」。
  const isApi = d.user.source === 'api'
  // 换账号检测必须在本轮 games 写入**之前**做：purgeGames 会把上一个账号的残留行删掉，
  // 那之后再问「库里原来是谁的数据」就问不出来了（要告知用户的事就丢了）。
  const accountSwitch = isApi ? detectAccountSwitch(d.user.steamId) : null
  repo.saveUser(d.user)
  repo.saveGames(d.games)
  if (d.sessions.length) repo.saveSessions(d.sessions)
  if (d.achievements.length) repo.saveAchievements(d.achievements)
  if (d.wishlist.length) repo.saveWishlist(d.wishlist)
  if (d.discounts.length) repo.saveDiscounts(d.discounts)
  if (d.priceHistory.length) repo.savePriceHistory(d.priceHistory)
  // full 模式刚 clearAll 过，库里没有多余行；只有增量同步需要清理。
  const purged = full ? 0 : purgeStale(d)
  // 给本次同步下来的游戏打上账号标记（只补历史空行），下次换账号才检测得出来
  if (isApi) stampGameOwners(d.user.steamId)
  // 换账号的收尾：旧账号的 play_sessions / snapshots 必须清掉，理由见 user-data.purgePreviousAccount
  // （不清会混数据显示 + 用旧账号时长当差分基准生成幽灵会话）。
  // policy='keep' 时跳过，让用户可以先导出旧数据 —— 但代价是界面仍会混合显示两个账号的内容，
  // 且 detectAccountSwitch 会一直提示，直到用户改回 'clear' 重新同步。
  const previousPurged = accountSwitch && settings.accountSwitchPolicy === 'clear'
    ? purgePreviousAccount(d.user.steamId)
    : { sessions: 0, snapshots: 0 }
  if (accountSwitch) {
    logInfo('sync', '检测到换账号', {
      previousSteamId: accountSwitch.previousSteamId, previousGames: accountSwitch.previousGames,
      currentSteamId: accountSwitch.currentSteamId, policy: settings.accountSwitchPolicy,
      purgedSessions: previousPurged.sessions, purgedSnapshots: previousPurged.snapshots
    })
  }
  // 采样表保留策略：降采样，避免一年后 price_history / snapshots 各上百万行（见 user-data.ts）
  const pruned = pruneSamples()
  if (pruned.priceHistory || pruned.snapshots) {
    logInfo('sync', '采样表已降采样', { prunedPriceHistory: pruned.priceHistory, prunedSnapshots: pruned.snapshots })
  }
  // 追猎清单：清掉这一轮里已经解锁的条目，避免清单计数悄悄高于列表实际显示条数
  const droppedPicks = prunePickedUnlocked()
  if (droppedPicks) logInfo('sync', '追猎清单已剔除已解锁的条目', { droppedPicks })
  return {
    users: 1, games: d.games.length, sessions: d.sessions.length, achievements: d.achievements.length,
    wishlist: d.wishlist.length, discounts: d.discounts.length, priceHistory: d.priceHistory.length,
    purged, pruned: pruned.priceHistory + pruned.snapshots, droppedPicks,
    previousPurged: previousPurged.sessions + previousPurged.snapshots
  }
}

/** 本次运行内已弹过的通知键（史低 / 限时免费只能做到运行内去重，理由见 notify-plan.ts）。 */
const notifiedThisRun = new Set<string>()

/** 把「已达到心理价」写回设置 —— 它跨重启去重的依据（同一价格只提醒一次）。 */
function persistPriceAlertState(targets: Array<{ appId: number; priceCents: number }>, at: number): void {
  if (!targets.length) return
  const current = getSettings()
  const next = current.priceAlerts.map((a) => {
    const hit = targets.find((t) => t.appId === a.appId)
    return hit ? { ...a, notifiedAt: at, notifiedPriceCents: hit.priceCents } : a
  })
  setSettings({ priceAlerts: next })
}

function fireNotifications(settings: ReturnType<typeof getSettings>): void {
  const snap = repo.loadSnapshot(settings.steamId)
  const at = Math.floor(Date.now() / 1000)
  const source: NotifySource = {
    wishlist: snap.wishlist,
    discounts: snap.discounts,
    games: snap.games,
    achievements: snap.achievements,
    huntNotifiedOn: repo.getMeta(HUNT_META_KEY)
  }
  const verdicts = planNotifications(source, settings, notifiedThisRun)
  const alerts: Array<{ appId: number; priceCents: number }> = []
  for (const v of verdicts) {
    void notify({ title: v.title, body: v.body, route: v.route })
    v.keys.forEach((k) => notifiedThisRun.add(k))
    // 跨重启去重靠落库：下次同步不会再把同一条重弹一遍
    if (v.wishlistTargets.length > 0) markWishlistNotified(v.wishlistTargets, at)
    if (v.discountTargets.length > 0) markDiscountsNotified(v.discountTargets, at)
    if (v.markHuntNotified) repo.setMeta(HUNT_META_KEY, todayYMD())
    alerts.push(...v.alertTargets)
  }
  persistPriceAlertState(alerts, at)
  logInfo('notify', '通知判定完成', { fired: verdicts.map((v) => v.title).join('|') || '无', at })
}

/** 执行一次同步。每阶段独立 try/catch；阶段失败广播 failed 并停止，但已写入的数据保留。 */
export async function run(options?: SyncRunOptions): Promise<{ ok: boolean; error?: string; counts?: Record<string, number> }> {
  // 并发闸门：run() 有**三个**可以重叠触发的入口 —— 渲染层的「立即同步」按钮、
  // 定时器的自动同步、托盘菜单。早前这里没有任何保护，两个 run() 同时跑时会：
  //   1) buildApiData 里的「读上一次快照 → 写本次快照」两次读到同一基准，
  //      同一段增量各生成一条会话 → play_sessions 出现重复行（表是自增主键，无法自愈）；
  //   2) persist() 的 purgeStale 各自拿着不完整的 keep 列表，互相删除对方刚写入的行；
  //   3) 模块级 notifiedThisRun 被两条 run 共享，通知去重互相串味。
  // 自动同步被挡掉是完全可以接受的：下一轮定时器仍然会跑，数据只是延后一个周期。
  if (lastStatus.running) {
    logInfo('sync', '同步被忽略：已有同步正在进行', { source: options?.source ?? '(auto)' })
    return { ok: false, error: '同步正在进行中，已忽略本次请求' }
  }
  const settings = getSettings()
  let source: DataSource
  if (options?.source) source = options.source
  else if (settings.steamId && settings.steamApiKey) source = 'api'
  else if (settings.enableDemoData) source = 'demo'
  else source = 'local'

  const startedAt = Date.now()
  // full 隐含 force：用户点「重新同步全部数据」时，期望的就是真·全量刷新
  const force = !!options?.force || !!options?.full
  logInfo('sync', '同步开始', { source, full: !!options?.full, force })
  update({ running: true, phase: 'idle', source, lastError: null, lastSyncOk: null, message: `开始同步（${source}）`, progress: 0 })
  try {
    if (source === 'local' && !settings.enableDemoData) throw new Error('未配置 API Key 且未开启演示数据，无法同步')

    if (source === 'api') {
      update({ phase: 'detecting', message: '检测 Steam 客户端与网络', progress: 5 })
      // 这条检测以前是把结果扔掉的死代码（`await detectSteam().catch(() => null)`），
      // 于是「启动瞬间探测失败」会一直挂在顶栏上。现在把结论写进日志：
      // 同步成功而这里显示 API 不可达，说明探测端点本身需要复核（而不是网络真有问题）。
      const det = await detectSteam().catch(() => null)
      if (det) {
        logInfo('sync', '网络检测结论', {
          apiReachable: det.apiReachable, storeReachable: det.storeReachable, apiLatencyMs: det.apiLatencyMs
        })
      }
    } else {
      update({ phase: 'detecting', message: '演示模式：跳过本地检测', progress: 5 })
    }

    update({ phase: 'profile', message: '获取玩家资料', progress: 20 })
    const data = source === 'api' ? await buildApiData(settings, force) : buildDemoData()

    update({ phase: 'games', message: '写入游戏库', progress: 45 })
    const counts = persist(data, source === 'demo' || !!options?.full)

    update({ phase: 'achievements', message: '写入成就', progress: 65 })
    update({ phase: 'wishlist', message: '写入愿望单', progress: 80 })
    update({ phase: 'prices', message: '写入价格采样与折扣', progress: 95 })

    fireNotifications(settings)
    const t = Date.now()
    logInfo('sync', '同步完成', { source, elapsedMs: t - startedAt, counts: JSON.stringify(counts) })
    // 「同步成功」不等于「每个数据源都取到了」。促销源本轮不可用时要如实说出来 ——
    // 否则用户看到的是「同步完成」但列表悄悄少了一半，完全无从判断发生了什么。
    const doneMessage = data.discountsTrusted
      ? '同步完成'
      : '同步完成（但本轮未取到促销数据，折扣列表沿用上次结果）'
    update({ phase: 'done', running: false, message: doneMessage, progress: 100, lastSyncAt: t, lastSyncOk: true })
    return { ok: true, counts }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logError('sync', '同步失败', { source, elapsedMs: Date.now() - startedAt, error: msg, stack: err instanceof Error ? err.stack : undefined })
    update({ phase: 'failed', running: false, message: `同步失败：${msg}`, lastSyncOk: false, lastError: msg })
    return { ok: false, error: msg }
  }
}
