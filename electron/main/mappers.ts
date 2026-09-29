/**
 * 行(snake_case) ↔ 领域对象(camelCase) 的映射集中在这里。
 *
 * 从 repository.ts 拆出来，是为了守住「单文件 ≤ 300 行」：repository.ts 已经顶到 300 行上限，
 * 而它接下来还要承载「同步后清理残留」等新逻辑。映射是纯函数，拆出来也更好单测。
 */
import type { SqlValue } from 'sql.js'
import type { Row } from './database'
import type { GameNote, HuntPick } from '@shared/contract'
import type {
  Achievement, DiscountItem, OwnedGame, PlaySession, PricePoint,
  SteamUser, WishlistItem
} from '@/types/steam'

// ---------- 基础存取小工具 ----------
export const num = (v: SqlValue | undefined, d = 0): number => (typeof v === 'number' ? v : d)
export const str = (v: SqlValue | undefined, d = ''): string => (typeof v === 'string' ? v : d)
export const optNum = (v: SqlValue | undefined): number | null => (typeof v === 'number' ? v : null)
export const bool = (v: SqlValue | undefined): boolean => v === 1 || v === '1'
export function parseArr(v: SqlValue | undefined): string[] {
  if (typeof v !== 'string' || !v) return []
  try { const a = JSON.parse(v); return Array.isArray(a) ? a.map(String) : [] } catch { return [] }
}
export function jsonOr<T>(v: SqlValue | undefined, fallback: T): T {
  if (typeof v !== 'string' || !v) return fallback
  try { return JSON.parse(v) as T } catch { return fallback }
}

// ---------- 行 → 领域对象 ----------
export function rowToUser(r: Row): SteamUser {
  return {
    steamId: str(r.steam_id), personaName: str(r.persona_name), avatarUrl: str(r.avatar_url),
    profileUrl: str(r.profile_url), countryCode: str(r.country_code),
    accountCreatedAt: optNum(r.account_created_at), lastLogoffAt: optNum(r.last_logoff_at),
    personaState: num(r.persona_state), source: str(r.source, 'demo') as SteamUser['source'],
    syncedAt: optNum(r.synced_at),
    // F-6：等级/徽章。老库没有这几列（v5 才补），num() 对 undefined 返回默认值 0，天然兼容。
    level: num(r.level), badgeCount: num(r.badge_count), badgeXp: num(r.badge_xp),
    playerXp: num(r.player_xp), xpToNext: num(r.xp_to_next)
  }
}
export function rowToGame(r: Row): OwnedGame {
  return {
    appId: num(r.app_id), name: str(r.name), headerImage: str(r.header_image), capsuleImage: str(r.capsule_image),
    genres: parseArr(r.genres), tags: parseArr(r.tags), releaseDate: str(r.release_date),
    developer: str(r.developer), publisher: str(r.publisher),
    priceCents: num(r.price_cents, -1), originalPriceCents: num(r.original_price_cents, -1),
    priceCheckedAt: optNum(r.price_checked_at), isHistoricalLow: bool(r.is_historical_low),
    reviewPercent: num(r.review_percent), reviewCount: num(r.review_count),
    playtimeForeverMin: num(r.playtime_forever_min), playtimeTwoWeeksMin: num(r.playtime_two_weeks_min),
    firstPlayedAt: optNum(r.first_played_at), lastPlayedAt: optNum(r.last_played_at),
    achievementsTotal: num(r.achievements_total), achievementsUnlocked: num(r.achievements_unlocked),
    rareAchievements: num(r.rare_achievements), firstPlayedEstimated: bool(r.first_played_estimated)
  }
}
export function rowToSession(r: Row): PlaySession {
  return {
    id: num(r.id), steamId: str(r.steam_id), appId: num(r.app_id), playDate: str(r.play_date),
    minutes: num(r.minutes), startedAt: num(r.started_at), endedAt: num(r.ended_at),
    source: str(r.source, 'demo') as PlaySession['source']
  }
}
export function rowToAchievement(r: Row): Achievement {
  return {
    appId: num(r.app_id), apiName: str(r.api_name), displayName: str(r.display_name), description: str(r.description),
    iconUrl: str(r.icon_url), iconGrayUrl: str(r.icon_gray_url), unlocked: bool(r.unlocked),
    unlockedAt: optNum(r.unlocked_at), globalPercent: Number(r.global_percent ?? 0),
    isRare: bool(r.is_rare), hidden: bool(r.hidden)
  }
}
export function rowToWishlist(r: Row): WishlistItem {
  return {
    appId: num(r.app_id), steamId: str(r.steam_id), name: str(r.name), headerImage: str(r.header_image),
    addedAt: num(r.added_at), priority: num(r.priority), tags: parseArr(r.tags),
    originalPriceCents: num(r.original_price_cents, -1), finalPriceCents: num(r.final_price_cents, -1),
    discountPercent: num(r.discount_percent), currency: str(r.currency, 'CNY'),
    isHistoricalLow: bool(r.is_historical_low), historicalLowCents: num(r.historical_low_cents, -1),
    historicalLowAt: optNum(r.historical_low_at), reviewPercent: num(r.review_percent), reviewCount: num(r.review_count),
    releaseDate: str(r.release_date), notifiedAt: optNum(r.notified_at)
  }
}
export function rowToDiscount(r: Row): DiscountItem {
  return {
    appId: num(r.app_id), name: str(r.name), headerImage: str(r.header_image),
    originalPriceCents: num(r.original_price_cents, -1), finalPriceCents: num(r.final_price_cents, -1),
    discountPercent: num(r.discount_percent), currency: str(r.currency, 'CNY'),
    isHistoricalLow: bool(r.is_historical_low), historicalLowCents: num(r.historical_low_cents, -1),
    reviewPercent: num(r.review_percent), reviewCount: num(r.review_count), tags: parseArr(r.tags),
    releaseDate: str(r.release_date), storeUrl: str(r.store_url),
    category: str(r.category, 'hot') as DiscountItem['category'], endsAt: optNum(r.ends_at), fetchedAt: num(r.fetched_at),
    notifiedAt: optNum(r.notified_at)
  }
}
export function rowToPricePoint(r: Row): PricePoint {
  return {
    appId: num(r.app_id), capturedAt: num(r.captured_at), priceCents: num(r.price_cents, -1),
    originalPriceCents: num(r.original_price_cents, -1), discountPercent: num(r.discount_percent),
    isHistoricalLow: bool(r.is_historical_low)
  }
}
/** game_notes：用户自己的评分（0 = 未评分，1–5 星）、备注、状态与标签。 */
export function rowToGameNote(r: Row): GameNote {
  return {
    appId: num(r.app_id),
    rating: num(r.rating),
    note: str(r.note),
    status: str(r.status),
    tags: parseArr(r.tags),
    updatedAt: num(r.updated_at)
  }
}
/** hunt_picks：用户手动加入追猎清单的成就。 */
export function rowToHuntPick(r: Row): HuntPick {
  return { appId: num(r.app_id), apiName: str(r.api_name), addedAt: num(r.added_at) }
}

// ---------- 领域对象 → 行（bind 用，run() 会自动加 $ 前缀）----------
export function gameToRow(g: OwnedGame): Record<string, SqlValue> {
  return {
    app_id: g.appId, name: g.name, header_image: g.headerImage, capsule_image: g.capsuleImage,
    genres: JSON.stringify(g.genres), tags: JSON.stringify(g.tags), release_date: g.releaseDate,
    developer: g.developer, publisher: g.publisher, price_cents: g.priceCents, original_price_cents: g.originalPriceCents,
    price_checked_at: g.priceCheckedAt, is_historical_low: g.isHistoricalLow ? 1 : 0,
    review_percent: g.reviewPercent, review_count: g.reviewCount, playtime_forever_min: g.playtimeForeverMin,
    playtime_two_weeks_min: g.playtimeTwoWeeksMin, first_played_at: g.firstPlayedAt, last_played_at: g.lastPlayedAt,
    achievements_total: g.achievementsTotal, achievements_unlocked: g.achievementsUnlocked,
    rare_achievements: g.rareAchievements, first_played_estimated: g.firstPlayedEstimated ? 1 : 0
  }
}
export function achievementToRow(a: Achievement): Record<string, SqlValue> {
  return {
    app_id: a.appId, api_name: a.apiName, display_name: a.displayName, description: a.description,
    icon_url: a.iconUrl, icon_gray_url: a.iconGrayUrl, unlocked: a.unlocked ? 1 : 0, unlocked_at: a.unlockedAt,
    global_percent: a.globalPercent, is_rare: a.isRare ? 1 : 0, hidden: a.hidden ? 1 : 0
  }
}
export function wishlistToRow(w: WishlistItem): Record<string, SqlValue> {
  return {
    app_id: w.appId, steam_id: w.steamId, name: w.name, header_image: w.headerImage, added_at: w.addedAt,
    priority: w.priority, tags: JSON.stringify(w.tags), original_price_cents: w.originalPriceCents,
    final_price_cents: w.finalPriceCents, discount_percent: w.discountPercent, currency: w.currency,
    is_historical_low: w.isHistoricalLow ? 1 : 0, historical_low_cents: w.historicalLowCents,
    historical_low_at: w.historicalLowAt, review_percent: w.reviewPercent, review_count: w.reviewCount,
    release_date: w.releaseDate, notified_at: w.notifiedAt
  }
}
export function discountToRow(d: DiscountItem): Record<string, SqlValue> {
  return {
    app_id: d.appId, category: d.category, name: d.name, header_image: d.headerImage,
    original_price_cents: d.originalPriceCents, final_price_cents: d.finalPriceCents, discount_percent: d.discountPercent,
    currency: d.currency, is_historical_low: d.isHistoricalLow ? 1 : 0, historical_low_cents: d.historicalLowCents,
    review_percent: d.reviewPercent, review_count: d.reviewCount, tags: JSON.stringify(d.tags),
    release_date: d.releaseDate, store_url: d.storeUrl, ends_at: d.endsAt, fetched_at: d.fetchedAt,
    notified_at: d.notifiedAt
  }
}
export function priceToRow(p: PricePoint): Record<string, SqlValue> {
  return {
    app_id: p.appId, captured_at: p.capturedAt, price_cents: p.priceCents,
    original_price_cents: p.originalPriceCents, discount_percent: p.discountPercent, is_historical_low: p.isHistoricalLow ? 1 : 0
  }
}
export function sessionToRow(s: PlaySession): Record<string, SqlValue> {
  return {
    steam_id: s.steamId, app_id: s.appId, play_date: s.playDate, minutes: s.minutes,
    started_at: s.startedAt, ended_at: s.endedAt, source: s.source
  }
}
export function userToRow(u: SteamUser): Record<string, SqlValue> {
  return {
    steam_id: u.steamId, persona_name: u.personaName, avatar_url: u.avatarUrl, profile_url: u.profileUrl,
    country_code: u.countryCode, account_created_at: u.accountCreatedAt, last_logoff_at: u.lastLogoffAt,
    persona_state: u.personaState, source: u.source, synced_at: u.syncedAt,
    level: u.level ?? 0, badge_count: u.badgeCount ?? 0, badge_xp: u.badgeXp ?? 0,
    player_xp: u.playerXp ?? 0, xp_to_next: u.xpToNext ?? 0
  }
}
