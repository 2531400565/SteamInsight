/**
 * 成就同步：整个同步流程里最重的一段（逐游戏并发拉 3 个接口），独立成模块并承载「增量」策略。
 *
 * 增量判据 —— 只拉这两类游戏：
 *   1. 本次 playtime 相比上次快照有增长（= 这局真被玩了，解锁状态可能变了）；
 *   2. 库里还没有它的任何成就记录（新买的游戏 / 上次拉取失败，需要一次自愈）。
 * 其余游戏沿用上一次结果。实测全量拉 69 款 ≈ 207 个请求 / 约 18 秒，而默认每 30 分钟自动同步
 * （`DEFAULT_SETTINGS.syncIntervalMin = 30`），一天下来约 2 万请求；这里把绝大多数重复请求省掉，
 * 同时不再每次重写 4500+ 行成就。
 */
import type { Achievement, OwnedGame } from '@/types/steam'
import { pool } from './api-base'
import * as repo from './repository'
import { logWarn } from './logger'
import {
  getPlayerAchievements, getGlobalAchievementPercentagesForApp, getAchievementSchema
} from './steam-api'

/** 本次实际拉到的成就，以及「最早解锁时间」表（供调用方推导游戏首玩时间）。 */
export interface AchievementSyncResult {
  achievements: Achievement[]
  firstByGame: Map<number, number>
}

/** meta 里记录「成就抽取失败的游戏」的键：{ appId: 已尝试次数 }。 */
export const ACH_FAILED_META_KEY = 'ach_failed'
/**
 * 同一款游戏最多重抓几次。**必有上限**：网络常年不可达 / 该游戏被下架的情况下，
 * 没有上限会把几个固定的 appId 永久钉在增量名单里，每次同步都白跑 3 个请求。
 * 达到上限就放弃并记日志，用户下次玩它（playedAppIds）仍会重新触发。
 */
export const ACH_MAX_RETRY = 5

/**
 * 读取上一次记录的重试名单，剔除已经达到上限的条目。
 * 返回 [待重试 appId, 剩余次数表] —— 调用方在本轮结束后按结果更新。
 */
export function loadRetries(): { retryAppIds: Set<number>; attempts: Map<number, number> } {
  const attempts = new Map<number, number>()
  const retryAppIds = new Set<number>()
  let raw: unknown = null
  try {
    raw = JSON.parse(repo.getMeta(ACH_FAILED_META_KEY) || '{}')
  } catch {
    raw = {} // 手写脏数据 / 旧版本残留：当成「没有待重试项」，不要让用户卡在一次解析失败上
  }
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const appId = Number(k)
      const n = typeof v === 'number' ? v : 0
      if (!Number.isFinite(appId)) continue
      if (n >= ACH_MAX_RETRY) continue
      attempts.set(appId, n)
      retryAppIds.add(appId)
    }
  }
  return { retryAppIds, attempts }
}

/** 把本轮的重试名单写回 meta（剔除已完成 / 超限的）。 */
export function saveRetries(attempts: Map<number, number>): void {
  if (!attempts.size) { repo.setMeta(ACH_FAILED_META_KEY, '{}'); return }
  repo.setMeta(ACH_FAILED_META_KEY, JSON.stringify(Object.fromEntries(attempts)))
}

/**
 * 「增量」的全部判定逻辑，抽成纯函数以便单测：
 *  1) 未刷新的游戏，把库里的旧计数回填进去。这一步不能省：数字 0 是合法值，upsert 的空值保护
 *     不会拦它，若任其保持初始值 0，就会把已统计好的成就数洗成 0（数据只劣化不自愈）；
 *  2) 返回本次真正需要拉取的游戏 —— 本次玩过的、库里还没有它成就记录的、
 *     或**上一轮拉取失败待重试**的。
 *
 * 第三类曾经缺失：早期版本的 catch 注释声称「失败的游戏不在库里，下次会自动重试」，
 * 但只要该游戏以前成功过一次，`counts` 里就有它 → 它再也不会进目标名单 →
 * 一次网络抖动就把这款游戏的成就数永久冻结（直到用户再去玩它）。
 *
 * @param counts achievementCounts() 的结果：app_id → [总数, 已解锁, 稀有数]
 * @param retryAppIds loadRetries() 得到的待重试名单（可选，默认空）
 */
export function planAchievementTargets(
  games: OwnedGame[], playedAppIds: Set<number>, counts: Map<number, number[]>, retryAppIds: Set<number> = new Set()
): OwnedGame[] {
  for (const g of games) {
    const c = counts.get(g.appId)
    if (c) { g.achievementsTotal = c[0]; g.achievementsUnlocked = c[1]; g.rareAchievements = c[2] }
  }
  return games.filter((g) => playedAppIds.has(g.appId) || !counts.has(g.appId) || retryAppIds.has(g.appId))
}

/**
 * 按需拉取成就，并把每款游戏的成就计数**原地写回**传入的 games。
 *
 * @param playedAppIds 本次 playtime 有增长的游戏；只有它们需要重新判定解锁与稀有度
 */
export async function syncAchievements(
  steamId: string, games: OwnedGame[], playedAppIds: Set<number>
): Promise<AchievementSyncResult> {
  const { retryAppIds, attempts } = loadRetries()
  const targets = planAchievementTargets(games, playedAppIds, repo.achievementCounts(), retryAppIds)
  const failed = new Set<number>()
  const achievements: Achievement[] = []
  const firstByGame = new Map<number, number>()

  await pool(targets, 4, async (g) => {
    try {
      const pa = await getPlayerAchievements(steamId, g.appId)
      // 该游戏没有成就（Steam 返回 success:false）：省掉另外两个请求，直接跳过。
      if (!pa.achievements.length) return
      const [gp, schema] = await Promise.all([
        getGlobalAchievementPercentagesForApp(g.appId).catch(() => ({}) as Record<string, number>),
        getAchievementSchema(g.appId).catch(() => new Map())
      ])
      let total = 0, unlocked = 0, rare = 0
      for (const a of pa.achievements) {
        const sc = schema.get(a.apiName)
        const pct = gp[a.apiName] ?? 0
        // pct 为 0 表示「Steam 没有给出该成就的全球占比」，不是「0% 玩家拥有」。
        // 早前按 pct < 10 判定，导致 4536 条成就全被标成「极稀有」并显示「全球 0.0%」。
        const isRare = pct > 0 && pct < 10
        if (isRare && a.unlocked) rare++
        if (a.unlocked) {
          unlocked++
          if (a.unlockTime) { const cur = firstByGame.get(g.appId); if (!cur || a.unlockTime < cur) firstByGame.set(g.appId, a.unlockTime) }
        }
        total++
        achievements.push({
          appId: g.appId, apiName: a.apiName,
          displayName: a.displayName || sc?.displayName || '',
          description: a.description || sc?.description || '',
          iconUrl: sc?.iconUrl ?? '', iconGrayUrl: sc?.iconGrayUrl ?? '',
          unlocked: a.unlocked, unlockedAt: a.unlockTime, globalPercent: pct, isRare, hidden: sc?.hidden ?? false
        })
      }
      g.achievementsTotal = total
      g.achievementsUnlocked = unlocked
      g.rareAchievements = rare
    } catch (err) {
      // 单游戏失败不影响整体，但必须**登记重试**：否则它会掉出增量名单，成就数冻结在旧值。
      failed.add(g.appId)
      const n = (attempts.get(g.appId) ?? 0) + 1
      if (n >= ACH_MAX_RETRY) {
        attempts.delete(g.appId)
        logWarn('ach', '成就抓取反复失败，已达重试上限，暂时放弃', {
          appId: g.appId, attempts: n, error: err instanceof Error ? err.message : String(err)
        })
      } else {
        attempts.set(g.appId, n)
      }
    }
  })

  // 成功抓到的游戏要从重试名单里摘掉；超限的在上面已经删除，这里不再写回。
  for (const g of targets) {
    if (!failed.has(g.appId)) attempts.delete(g.appId)
  }
  saveRetries(attempts)

  return { achievements, firstByGame }
}
