/**
 * Steam Web API 封装（api.steampowered.com，需要 API Key）。
 * 商店侧公开接口（appdetails / appreviews / featuredcategories）在 steam-store.ts。
 * 铁律：Key 缺失时绝不发请求直接抛明确错误；统一 12s 超时、失败重试 2 次（500/1500ms 退避）；
 * 并发上限 4（并发池在 api-base.ts）；返回全部做防御性解析。
 */
import { URLSearchParams } from 'node:url'
import { getSettings } from './settings'
import { asBool, asNum, asStr, isObj, requestJson } from './api-base'

const API_BASE = 'https://api.steampowered.com'

function apiUrl(path: string, params: Record<string, string>): string {
  const key = getSettings().steamApiKey
  if (!key) throw new Error('缺少 Steam API Key，无法调用 Web API')
  const q = new URLSearchParams({ key, ...params })
  return `${API_BASE}${path}?${q.toString()}`
}

export function resolveVanityURL(vanity: string): Promise<{ steamId: string }> {
  return requestJson(apiUrl('/ISteamUser/ResolveVanityURL/v1/', { vanityurl: vanity })).then((j) => {
    const r = (j as Record<string, unknown>).response as Record<string, unknown> | undefined
    const id = asStr(r?.steamid)
    if (!id) throw new Error('未找到该 vanity 对应的 SteamID')
    return { steamId: id }
  })
}

export interface RawPlayerSummary {
  steamId: string; personaName: string; avatarUrl: string; profileUrl: string
  countryCode: string; accountCreatedAt: number | null; lastLogoffAt: number | null; personaState: number
}
export function getPlayerSummaries(steamId: string): Promise<RawPlayerSummary> {
  return requestJson(apiUrl('/ISteamUser/GetPlayerSummaries/v2/', { steamids: steamId })).then((j) => {
    const players = ((j as Record<string, unknown>).response as Record<string, unknown> | undefined)?.players as unknown[] | undefined
    const p = Array.isArray(players) && isObj(players[0]) ? players[0] : null
    if (!p) throw new Error('未获取到玩家资料')
    return {
      steamId, personaName: asStr(p.personaname), avatarUrl: asStr(p.avatarfull), profileUrl: asStr(p.profileurl),
      countryCode: asStr(p.loccountrycode), accountCreatedAt: asNum(p.timecreated) || null, lastLogoffAt: asNum(p.lastlogoff) || null,
      personaState: asNum(p.personastate)
    }
  })
}

export interface RawOwnedGame {
  appId: number; name: string; playtimeForeverMin: number; playtimeTwoWeeksMin: number; lastPlayedAt: number | null
  imgIconUrl: string; imgLogoUrl: string
}
function toOwnedGames(j: unknown): RawOwnedGame[] {
  const games = ((j as Record<string, unknown>).response as Record<string, unknown> | undefined)?.games as unknown[] | undefined
  if (!Array.isArray(games)) return []
  return games.map((g) => {
    const o = isObj(g) ? g : {}
    return {
      appId: asNum(o.appid), name: asStr(o.name), playtimeForeverMin: Math.round(asNum(o.playtime_forever)),
      playtimeTwoWeeksMin: Math.round(asNum(o.playtime_2weeks)), lastPlayedAt: asNum(o.rtime_last_played) || null,
      imgIconUrl: asStr(o.img_icon_url), imgLogoUrl: asStr(o.img_logo_url)
    }
  })
}
export function getOwnedGames(steamId: string): Promise<RawOwnedGame[]> {
  return requestJson(apiUrl('/IPlayerService/GetOwnedGames/v1/', {
    steamid: steamId, include_appinfo: '1', include_played_free_games: '1'
  })).then(toOwnedGames)
}

export function getRecentlyPlayedGames(steamId: string): Promise<RawOwnedGame[]> {
  return requestJson(apiUrl('/IPlayerService/GetRecentlyPlayedGames/v1/', { steamid: steamId })).then(toOwnedGames)
}

export interface RawAchievement { apiName: string; displayName: string; description: string; unlocked: boolean; unlockTime: number | null }
export function getPlayerAchievements(steamId: string, appId: number): Promise<{ appId: number; achievements: RawAchievement[] }> {
  // l=schinese 必须显式传：实测不传时 Steam 干脆不返回 name / description 字段，
  // 结果是 4536 条成就名字全空、界面只能显示兜底文案「隐藏成就」。
  return requestJson(apiUrl('/ISteamUserStats/GetPlayerAchievements/v1/', {
    steamid: steamId, appid: String(appId), l: 'schinese'
  })).then((j) => {
    const playerStats = (j as Record<string, unknown>).playerstats as Record<string, unknown> | undefined
    const list = Array.isArray(playerStats?.achievements) ? (playerStats?.achievements as unknown[]) : []
    return {
      appId,
      achievements: list.map((a) => {
        const o = isObj(a) ? a : {}
        return {
          apiName: asStr(o.apiname),
          displayName: asStr(o.name) || asStr(o.displayName),
          // 真实字段名是 description，早前写成 desc 导致描述全空
          description: asStr(o.description) || asStr(o.desc),
          unlocked: asNum(o.achieved) === 1, unlockTime: asNum(o.unlocktime) || null
        }
      })
    }
  })
}

export function getGlobalAchievementPercentagesForApp(appId: number): Promise<Record<string, number>> {
  return requestJson(`${API_BASE}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`).then((j) => {
    const list = ((j as Record<string, unknown>).achievementpercentages as Record<string, unknown> | undefined)?.achievements as unknown[] | undefined
    const out: Record<string, number> = {}
    if (Array.isArray(list)) for (const a of list) { const o = isObj(a) ? a : {}; out[asStr(o.name)] = asNum(o.percent) }
    return out
  })
}

export interface RawAchievementSchema { displayName: string; description: string; iconUrl: string; iconGrayUrl: string; hidden: boolean }
/**
 * 成就图标 / 隐藏标记来自 GetSchemaForGame —— GetPlayerAchievements 不返回图标字段。
 * 图标 URL 是 CDN 完整地址，直接可用。
 */
export function getAchievementSchema(appId: number): Promise<Map<string, RawAchievementSchema>> {
  return requestJson(apiUrl('/ISteamUserStats/GetSchemaForGame/v2/', { appid: String(appId), l: 'schinese' })).then((j) => {
    const game = isObj(j) && isObj(j.game) ? (j.game as Record<string, unknown>) : {}
    const stats = isObj(game.availableGameStats) ? (game.availableGameStats as Record<string, unknown>) : {}
    const list = Array.isArray(stats.achievements) ? (stats.achievements as unknown[]) : []
    const out = new Map<string, RawAchievementSchema>()
    for (const a of list) {
      const o = isObj(a) ? a : {}
      const name = asStr(o.name)
      if (!name) continue
      out.set(name, {
        displayName: asStr(o.displayName), description: asStr(o.description),
        iconUrl: asStr(o.icon), iconGrayUrl: asStr(o.icongray), hidden: asBool(o.hidden)
      })
    }
    return out
  })
}

export interface RawWishlistItem { appId: number; name: string; addedAt: number; priority: number; tags: string[] }
export function getWishlist(steamId: string): Promise<RawWishlistItem[]> {
  // GetWishlist 的原文里根本没有 name 字段（实测字段集只有 appid / priority / date_added），
  // 名字只能靠 appdetails 回填；这里的 name 只是兜底，可能为空串。
  return requestJson(`${API_BASE}/IWishlistService/GetWishlist/v1/?steamid=${steamId}`).then((j) => {
    const items = ((j as Record<string, unknown>).response as Record<string, unknown> | undefined)?.items as unknown[] | undefined
    if (!Array.isArray(items)) return []
    return items.map((it) => {
      const o = isObj(it) ? it : {}
      const tags = Array.isArray(o.tags) ? (o.tags as unknown[]).map((t) => (isObj(t) ? asStr(t.name) : '')).filter(Boolean) : []
      // 真实响应里字段叫 date_added（不是 added），写错会让「添加时间」全变成 1970
      return { appId: asNum(o.appid), name: asStr(o.name), addedAt: asNum(o.date_added) || asNum(o.added) || 0, priority: asNum(o.priority, 1), tags }
    })
  })
}

/* ------------------------- 会员概览：等级 / 徽章（V3 / F-6） ------------------------- */

export interface RawPlayerProfile {
  /** Steam 等级（GetBadges 也会顺带返回，两者一致时以 GetBadges 为准） */
  level: number
  /** 已获得的徽章数量 */
  badgeCount: number
  /** 徽章经验值（升级的主要来源） */
  badgeXp: number
  /** 当前等级已积累的经验 */
  playerXp: number
  /** 距下一级还需要的经验；0 表示接口没有返回该字段 */
  xpToNext: number
}

/**
 * Steam 等级与徽章数。
 *
 * 为什么值得加：数据是**顺手**的（已有 Key 就能调，两个请求各几十字节），
 * 展示也简单（一个数字 + 一行说明），但情感价值很高 ——
 * 它回答的是「我在 Steam 上到底走了多远」，而这恰恰是本应用唯一能免费拿到的"资历"数据。
 *
 * 两个接口都带 `response` 包裹层；任何一环缺失都按「取不到」降级（返回 0）而不是抛错 ——
 * 等级显示不出来不该让整次同步失败。
 */
export function getPlayerLevel(steamId: string): Promise<number> {
  return requestJson(apiUrl('/IPlayerService/GetPlayerLevel/v1/', { steamid: steamId }))
    .then((j) => asNum(((j as Record<string, unknown>).response as Record<string, unknown> | undefined)?.player_level))
    .catch(() => 0)
}

export function getBadges(steamId: string): Promise<RawPlayerProfile> {
  return requestJson(apiUrl('/IPlayerService/GetBadges/v1/', { steamid: steamId })).then((j) => {
    const r = (j as Record<string, unknown>).response as Record<string, unknown> | undefined
    const badges = Array.isArray(r?.badges) ? (r?.badges as unknown[]) : []
    // 这里不能用 isObj 过滤后再数长度：徽章条目里有 level/xp 等数值字段，
    // 但统计「获得过多少枚」只看数组长度就够了。
    return {
      level: asNum(r?.player_level),
      badgeCount: badges.length,
      badgeXp: asNum(r?.badge_xp),
      playerXp: asNum(r?.player_xp),
      xpToNext: asNum(r?.player_next_level_xp)
    }
  })
}

/** 合并两个接口：等级以 GetBadges 为准（它同时给出等级与经验，一次请求就够）。失败降级为全 0。 */
export async function getPlayerProfile(steamId: string): Promise<RawPlayerProfile> {
  try {
    const badges = await getBadges(steamId)
    if (badges.level > 0 || badges.badgeCount > 0) return badges
  } catch {
    /* 落到下面的单次兜底 */
  }
  const level = await getPlayerLevel(steamId)
  return { level, badgeCount: 0, badgeXp: 0, playerXp: 0, xpToNext: 0 }
}
