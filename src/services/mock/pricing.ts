/**
 * 演示数据集的价格侧生成器：愿望单、折扣商城、价格历史采样。
 * 与 dataset.ts 共享 seed.ts 里的同一条随机序列，消费顺序必须与原实现一致。
 */
import type { DiscountCategory, DiscountItem, PricePoint, WishlistItem } from '@/types/steam'
import { CATALOG, type CatalogGame } from './catalog'
import { DEMO_STEAM_ID, TODAY_SEC, rfloat, rint, rnd } from './seed'

const headerUrl = (appId: number): string => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`

function computeWishlist(): WishlistItem[] {
  const out: WishlistItem[] = []
  const pool = CATALOG.map((_, i) => i)
  const idxs: number[] = []
  for (let k = 0; k < 24 && pool.length > 0; k++) { const j = Math.floor(rnd() * pool.length); idxs.push(pool[j]); pool.splice(j, 1) }
  const discounted = idxs.slice(0, 10)
  const histLowSet = new Set(discounted.slice(0, 4))
  for (const i of idxs) {
    const c = CATALOG[i]
    const original = c.baseOriginalPriceCents > 0 ? c.baseOriginalPriceCents : c.basePriceCents
    let finalP = original
    let disc = 0
    let isLow = false
    let histLow = original
    if (discounted.includes(i)) { disc = rint(10, 90); finalP = Math.round(original * (1 - disc / 100)); isLow = histLowSet.has(i); histLow = isLow ? finalP : Math.round(finalP * rfloat(0.7, 0.95)) }
    if (histLow > finalP) histLow = finalP
    const added = TODAY_SEC - rint(30, 900) * 86400
    const notified = rnd() < 0.12 ? TODAY_SEC - rint(1, 20) * 86400 : null
    out.push({
      appId: c.appId, steamId: DEMO_STEAM_ID, name: c.name,
      headerImage: headerUrl(c.appId),
      addedAt: Math.round(added), priority: rint(1, 3), tags: c.tags,
      originalPriceCents: original, finalPriceCents: finalP, discountPercent: disc, currency: 'CNY',
      isHistoricalLow: isLow, historicalLowCents: histLow,
      historicalLowAt: isLow ? Math.round(added - rint(10, 400) * 86400) : null,
      reviewPercent: c.reviewPercent, reviewCount: c.reviewCount, releaseDate: c.releaseDate, notifiedAt: notified
    })
  }
  return out
}

function takeN(arr: CatalogGame[], n: number): CatalogGame[] {
  const pool = arr.slice()
  const out: CatalogGame[] = []
  for (let k = 0; k < n && pool.length > 0; k++) { const j = Math.floor(rnd() * pool.length); out.push(pool[j]); pool.splice(j, 1) }
  return out
}

function computeDiscounts(): DiscountItem[] {
  const out: DiscountItem[] = []
  const paid = CATALOG.filter((c) => c.baseOriginalPriceCents > 0)
  const cats: DiscountCategory[] = ['hot', 'lowest', 'toprated', 'free']
  for (let ci = 0; ci < 4; ci++) {
    const cat = cats[ci]
    for (const c of takeN(paid, 10)) {
      const original = c.baseOriginalPriceCents
      let finalP = original
      let disc = 0
      let isLow = false
      let rev = c.reviewPercent
      if (cat === 'free') { finalP = 0; disc = 100 }
      else {
        disc = rint(10, 90)
        finalP = Math.round(original * (1 - disc / 100))
        if (cat === 'lowest') isLow = true
        if (cat === 'toprated') rev = Math.max(90, rint(90, 99))
      }
      out.push({
        appId: c.appId, name: c.name,
        headerImage: headerUrl(c.appId),
        originalPriceCents: original, finalPriceCents: finalP, discountPercent: disc, currency: 'CNY',
        isHistoricalLow: isLow, historicalLowCents: isLow ? finalP : Math.round(finalP * rfloat(0.7, 0.95)),
        reviewPercent: rev, reviewCount: c.reviewCount, tags: c.tags, releaseDate: c.releaseDate,
        storeUrl: `https://store.steampowered.com/app/${c.appId}/`, category: cat,
        endsAt: Math.round(TODAY_SEC + rint(1, 14) * 86400), fetchedAt: Math.round(TODAY_SEC),
        notifiedAt: null
      })
    }
  }
  return out
}

function computePriceHistory(appIds: number[]): PricePoint[] {
  const out: PricePoint[] = []
  const start = TODAY_SEC - 180 * 86400
  for (const id of appIds) {
    const c = CATALOG.find((x) => x.appId === id)
    const base = c && c.baseOriginalPriceCents > 0 ? c.baseOriginalPriceCents : (c ? c.basePriceCents : 0)
    const low = base > 0 ? Math.round(base * rfloat(0.4, 0.7)) : 0
    const lowIdx = rint(0, 25)
    let prev = base
    for (let k = 0; k <= 25; k++) {
      const cap = start + k * 7 * 86400
      let price: number
      if (k === lowIdx) price = low
      else { const drift = (rnd() - 0.5) * base * 0.1; price = Math.round(Math.max(low, Math.min(base, prev + drift))); price = Math.round(price / 100) * 100 }
      const disc = base > 0 ? Math.round((1 - price / base) * 100) : 0
      out.push({ appId: id, capturedAt: Math.round(cap), priceCents: price, originalPriceCents: base, discountPercent: disc, isHistoricalLow: price === low })
      prev = price
    }
  }
  return out
}

export function buildDemoWishlist(): WishlistItem[] { return computeWishlist() }
export function buildDemoDiscounts(): DiscountItem[] { return computeDiscounts() }
export function buildDemoPriceHistory(appIds: number[]): PricePoint[] { return computePriceHistory(appIds) }
