/**
 * 库价值与性价比（N1-1）。纯函数，无 IO。
 *
 * ⚠️ **口径是这一整块功能的核心，不能含糊**：
 * Steam 的接口**不返回实付价**（你可能是打折买的、可能是礼物、可能在第三方站买的），
 * 所以本模块算出来的永远是「**按当前商店价估算**」，绝不是「你一共花了多少钱」。
 * 界面上任何一处展示都必须带这句限定，否则就是 PRD §5 明令禁止的
 * 「用看起来像的数据糊过去」。`VALUE_CAVEAT` 是这句话的单一来源。
 */
import type { OwnedGame } from '@/types/steam'

/** 口径声明。界面必须原样展示，不要在别处再写一份。 */
export const VALUE_CAVEAT =
  'Steam 接口不返回实付价（可能是打折、礼物或第三方渠道购买），因此这里的金额是按**当前商店标价**估算的库价值，不等于你实际花掉的钱。'

export interface ValueRow {
  game: OwnedGame
  /** 每花 1 元能玩多少小时（时长 ÷ 现价） */
  hoursPerYuan: number
}

export interface SunkRow {
  game: OwnedGame
  priceCents: number
}

export interface LibraryValue {
  /** 有商店标价的游戏数（price > 0） */
  pricedCount: number
  /** 商店里免费的游戏数（price === 0） */
  freeCount: number
  /** 没拿到价格的游戏数（price < 0，通常是 API 限流或 TTL 内未刷新） */
  unknownCount: number
  /** 「按当前商店价估算」的库价值合计（分） */
  currentTotalCents: number
  /** 同一批游戏的原价合计（分） */
  originalTotalCents: number
  /** 当前正在促销的条目数 */
  onSaleCount: number
  /** 加权折扣率（%）：1 − 现价合计 ÷ 原价合计。反映「整库现在买一遍能省多少」 */
  weightedDiscountPercent: number
  /** 正在促销那些条目的平均降幅（%） */
  averageSaleDiscountPercent: number
  /** 有标价游戏的累计时长（分钟） */
  totalMinutes: number
  /** 性价比：每 1 元能玩多少小时（按当前价） */
  hoursPerYuanCurrent: number
  /** 性价比：每 1 元能玩多少小时（按原价） */
  hoursPerYuanOriginal: number
  /** 已玩过（时长 > 0）的游戏数 */
  playedCount: number
  /** 最划算 TOP N（时长 ÷ 现价 最高） */
  bestValue: ValueRow[]
  /** 「买回来一次没玩」清单，按现价从高到低（最多 sunkLimit 条） */
  sunkCost: SunkRow[]
  /** ⚠️ 只合计上面这张**已列出**的清单，不是全库沉没成本总额 */
  sunkCostTotalCents: number
  /** 全库「买了没玩」的总款数（可能大于 sunkCost.length，因为清单被截断） */
  sunkCostAllCount: number
  /** 全库「买了没玩」的现价合计（分） */
  sunkCostAllTotalCents: number
}

/** 每 1 元对应的可玩小时数。分钟 ÷ 分 → 需要 ×100/60。 */
function hoursPerYuanOf(minutes: number, cents: number): number {
  return cents > 0 ? (minutes * 100) / (60 * cents) : 0
}

/**
 * 计算库价值。
 *
 * 三个刻意的决定：
 *  1) **免费游戏不计入金额**（现价 0），但计入 `freeCount` —— 把它们算进「库价值」会虚增，
 *     而虚增正好是这个功能最容易被质疑的地方。
 *  2) **没拿到价格的游戏单独计数**，不当作 0 处理。`-1` 是「未知」哨兵，
 *     当成 0 会让库价值凭空缩水，用户看到的数字就没有意义了。
 *  3) 沉没成本**只统计有标价且一次没玩的**：免费领的游戏放在库里没玩不是浪费，
 *     把它列进去只会让这份清单变成噪声、掩盖真正的「花了大价钱没碰过」。
 */
export function libraryValue(games: OwnedGame[], options: { bestLimit?: number; sunkLimit?: number } = {}): LibraryValue {
  const bestLimit = options.bestLimit ?? 5
  const sunkLimit = options.sunkLimit ?? 8

  let currentTotalCents = 0
  let originalTotalCents = 0
  let totalMinutes = 0
  let pricedCount = 0
  let freeCount = 0
  let unknownCount = 0
  let onSaleCount = 0
  let salePercentSum = 0

  const valued: ValueRow[] = []
  const sunk: SunkRow[] = []

  for (const g of games) {
    if (g.priceCents < 0) {
      unknownCount += 1
    } else if (g.priceCents === 0) {
      freeCount += 1
    } else {
      pricedCount += 1
      currentTotalCents += g.priceCents
      // 原价缺失时退化成现价，避免把「原价未知」当成「原价 0」而算出一个假的 100% 折扣
      const original = g.originalPriceCents > 0 ? g.originalPriceCents : g.priceCents
      originalTotalCents += original
      totalMinutes += g.playtimeForeverMin
      if (original > g.priceCents) {
        onSaleCount += 1
        salePercentSum += Math.round((1 - g.priceCents / original) * 100)
      }
      if (g.playtimeForeverMin > 0) valued.push({ game: g, hoursPerYuan: hoursPerYuanOf(g.playtimeForeverMin, g.priceCents) })
      else sunk.push({ game: g, priceCents: g.priceCents })
    }
  }

  const sunkSorted = sunk.sort((a, b) => b.priceCents - a.priceCents)
  const sunkShown = sunkSorted.slice(0, sunkLimit)

  return {
    pricedCount,
    freeCount,
    unknownCount,
    currentTotalCents,
    originalTotalCents,
    onSaleCount,
    weightedDiscountPercent: originalTotalCents > 0 ? (1 - currentTotalCents / originalTotalCents) * 100 : 0,
    averageSaleDiscountPercent: onSaleCount > 0 ? salePercentSum / onSaleCount : 0,
    totalMinutes,
    hoursPerYuanCurrent: hoursPerYuanOf(totalMinutes, currentTotalCents),
    hoursPerYuanOriginal: hoursPerYuanOf(totalMinutes, originalTotalCents),
    playedCount: games.filter((g) => g.playtimeForeverMin > 0).length,
    bestValue: valued.sort((a, b) => b.hoursPerYuan - a.hoursPerYuan || b.game.playtimeForeverMin - a.game.playtimeForeverMin).slice(0, bestLimit),
    // 合计必须与**展示出来的那几行**一致：清单被截断后还按全量合计，
    // 界面上「这些游戏合计 ¥X」就会变成一个看着很确定、实则对不上的数字。
    sunkCost: sunkShown,
    sunkCostTotalCents: sunkShown.reduce((acc, s) => acc + s.priceCents, 0),
    sunkCostAllCount: sunkSorted.length,
    sunkCostAllTotalCents: sunkSorted.reduce((acc, s) => acc + s.priceCents, 0)
  }
}
