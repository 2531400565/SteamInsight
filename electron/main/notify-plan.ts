/**
 * 桌面通知的「该不该弹」判定 + 它唯一需要的状态写回。
 *
 * 为什么单独一层：早前 sync.ts 的 fireNotifications() 每次同步都无条件重弹聚合通知
 * （「N 款愿望单游戏正在打折」「N 款游戏达到历史最低价」）。默认 30 分钟自动同步，
 * 只要还在打折，同一条内容一天能弹几十次 —— 结果就是用户干脆关掉通知。
 *
 * 去重分两层，两层都是**持久化**的（跨重启有效）：
 *  1) 愿望单降价 → `wishlist.notified_at`（该列一直在 schema 里，但 sync 里被硬编码成 null）；
 *  2) 史低 / 限时免费 → `discounts.notified_at`（本阶段补的列 + 迁移）。
 *  3) 自定义价格阈值 → 写回 `settings.priceAlerts[].notifiedPriceCents`：同一价格只提醒一次，
 *     价格再降才算新消息。
 * 另外用 seen 兜住「已经弹了、但落库还没跟上」的窗口，键里带价格 —— 所以价格真降了仍会再提醒一次。
 *
 * 促销结束后条目会被 `purgeDiscounts()` 删掉，notified_at 随之消失；下次该游戏再打折是全新一行，
 * 因此不会出现「提醒过一次就永久沉默」。
 */
import type { Achievement, AppSettings, DiscountItem, OwnedGame, WishlistItem } from '@/types/steam'
import { run } from './database'

/** 判定只需快照里的这几个字段，避免把整个 Snapshot 类型拖进来。 */
export interface NotifySource {
  /**
   * F-7：多带两个字段只为把通知从「有/无」升级成「差多少 / 还剩多久」。
   * `historicalLowCents` 让它能说「距本机史低还差 ¥X」，`endsAt` 让它能带上促销倒计时 ——
   * 这两个数字本来就在库里，之前只是没被通知用上。
   */
  wishlist: Array<Pick<WishlistItem, 'appId' | 'steamId' | 'name' | 'discountPercent' | 'finalPriceCents' | 'historicalLowCents' | 'notifiedAt'>>
  discounts: Array<Pick<DiscountItem, 'appId' | 'category' | 'name' | 'isHistoricalLow' | 'finalPriceCents' | 'originalPriceCents' | 'historicalLowCents' | 'endsAt' | 'notifiedAt'>>
  /** 游戏库价格：自定义阈值可能设在已拥有的游戏上，且它是 TTL 缓存里唯一的价格来源。 */
  games: Array<Pick<OwnedGame, 'appId' | 'name' | 'priceCents' | 'achievementsTotal' | 'achievementsUnlocked'>>
  /** 稀有成就追猎清单的数据来源。 */
  achievements: Array<Pick<Achievement, 'appId' | 'apiName' | 'displayName' | 'unlocked' | 'isRare'>>
  /** 上次的追猎提醒日期（`YYYY-MM-DD`），null = 从没提醒过。用于「每天最多一次」。 */
  huntNotifiedOn: string | null
}
export type NotifySettings = Pick<
  AppSettings,
  'notifyWishlistDrop' | 'notifyHistoricalLow' | 'notifyFreeGame' | 'notifyAchievementHunt' | 'priceAlerts'
>

export interface NotifyVerdict {
  title: string
  body: string
  route: string
  /** 去重键：调用方弹过之后要写进 seen，避免同一次运行内重复。 */
  keys: string[]
  /** 需要回写 notified_at 的愿望单条目。 */
  wishlistTargets: Array<{ appId: number; steamId: string }>
  /** 需要回写 notified_at 的促销条目（史低 / 限时免费）。 */
  discountTargets: number[]
  /** 需要回写 notifiedPriceCents 的自定义阈值条目。 */
  alertTargets: Array<{ appId: number; priceCents: number }>
  /** 追猎提醒是否已弹（调用方落库「今天弹过了」）。 */
  markHuntNotified: boolean
}

/** 同步固定 cc=cn，通知里只可能出现人民币，直接按 ¥ 渲染。 */
const yuan = (cents: number): string => `¥${(cents / 100).toFixed(2)}`

function ymd(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * 促销剩余时间的人话版本（F-7）。
 *
 * `discounts.ends_at` 几乎每条都有值，但此前完全没进通知 —— 而「还剩多久」恰恰是
 * 决定「现在买还是再等等」的关键。超过 1 天说「还剩 N 天」，不到 1 天精确到小时，
 * 已经过期或没有这个字段则返回空串（宁可不说，也不要说错）。
 */
function countdown(endsAt: number | null | undefined, nowSec = Math.floor(Date.now() / 1000)): string {
  if (!endsAt || endsAt <= nowSec) return ''
  const left = endsAt - nowSec
  const hours = left / 3600
  if (hours >= 48) return `还剩 ${Math.floor(hours / 24)} 天`
  if (hours >= 24) return '还剩 1 天多'
  if (hours >= 1) return `还剩 ${Math.floor(hours)} 小时`
  return `不到 ${Math.max(1, Math.round(left / 60))} 分钟`
}

/**
 * 「距本机史低还差多少」（F-7）。
 *
 * 二值的「是否史低」回答不了用户真正的问题：「现在买划算吗？」
 * 差 ¥3 和差 ¥80 是两种完全不同的决策，只有把这个差额说出来，提醒才有行动指引。
 * 已是史低返回空代表文案分支（调用方改说「已达本机史低」）。
 */
function gapToLow(finalCents: number, lowCents: number | null | undefined): number | null {
  if (lowCents === null || lowCents === undefined || lowCents < 0) return null
  const gap = finalCents - lowCents
  return gap > 0 ? gap : 0
}

/** 纯函数：算出这次同步该弹哪些通知。不修改 seen（由调用方负责），便于单独验证。 */
export function planNotifications(snap: NotifySource, settings: NotifySettings, seen: ReadonlySet<string>): NotifyVerdict[] {
  const verdicts: NotifyVerdict[] = []

  if (settings.notifyWishlistDrop) {
    // !notifiedAt 是跨重启的持久去重；seen 兜住「本次运行里还没落库」的窗口
    const fresh = snap.wishlist.filter(
      (w) => w.discountPercent > 0 && !w.notifiedAt && !seen.has(`wishlist:${w.appId}:${w.finalPriceCents}`)
    )
    if (fresh.length > 0) {
      const cheapest = fresh.reduce((m, w) => (w.finalPriceCents < m.finalPriceCents ? w : m), fresh[0])
      const gap = gapToLow(cheapest.finalPriceCents, cheapest.historicalLowCents)
      const gapText =
        gap === null
          ? ''
          : gap === 0
            ? '，已达本机史低'
            : `，距本机史低还差 ${yuan(gap)}`
      const body =
        fresh.length === 1
          ? `《${cheapest.name}》降到 ${yuan(cheapest.finalPriceCents)}（省 ${cheapest.discountPercent}%）${gapText}`
          : `${fresh.length} 款愿望单游戏正在打折，最低《${cheapest.name}》${yuan(cheapest.finalPriceCents)}${gapText}`
      verdicts.push({
        title: '愿望单降价',
        body,
        route: 'wishlist',
        keys: fresh.map((w) => `wishlist:${w.appId}:${w.finalPriceCents}`),
        wishlistTargets: fresh.map((w) => ({ appId: w.appId, steamId: w.steamId })),
        discountTargets: [],
        alertTargets: [],
        markHuntNotified: false
      })
    }
  }

  if (settings.notifyHistoricalLow) {
    // !notifiedAt 是跨重启的持久去重；seen 同样兜住「还没落库」的窗口
    const fresh = snap.discounts.filter(
      (d) => d.isHistoricalLow && !d.notifiedAt && !seen.has(`low:${d.appId}:${d.finalPriceCents}`)
    )
    if (fresh.length > 0) {
      const cheapest = fresh.reduce((m, d) => (d.finalPriceCents < m.finalPriceCents ? d : m), fresh[0])
      const left = countdown(cheapest.endsAt)
      const leftText = left ? `，促销${left}` : ''
      verdicts.push({
        title: '史低提醒',
        body:
          fresh.length === 1
            ? `《${cheapest.name}》达到本机史低 ${yuan(cheapest.finalPriceCents)}${leftText}`
            : `${fresh.length} 款游戏达到历史最低价，最低《${cheapest.name}》${yuan(cheapest.finalPriceCents)}${leftText}`,
        route: 'store',
        keys: fresh.map((d) => `low:${d.appId}:${d.finalPriceCents}`),
        wishlistTargets: [],
        discountTargets: fresh.map((d) => d.appId),
        alertTargets: [],
        markHuntNotified: false
      })
    }
  }

  if (settings.notifyFreeGame) {
    // 必须同时满足「分类是 free」「现价 0」「原价 > 0」。只看 finalPriceCents === 0 会把
    // 本来就免费的游戏（F2P）也算成限时免费，是误报。
    const fresh = snap.discounts.filter(
      (d) => d.category === 'free' && d.finalPriceCents === 0 && d.originalPriceCents > 0
        && !d.notifiedAt && !seen.has(`free:${d.appId}`)
    )
    if (fresh.length > 0) {
      // 限时免费最有价值的信息就是「什么时候截止」——错过即永久错过，必须说清楚
      const soonest = fresh.reduce<number | null>((m, d) => {
        if (!d.endsAt) return m
        return m === null || d.endsAt < m ? d.endsAt : m
      }, null)
      const left = countdown(soonest)
      verdicts.push({
        title: '限时免费',
        body: `${fresh.length} 款游戏当前可免费领取${left ? `，领取截止${left}` : ''}`,
        route: 'store',
        keys: fresh.map((d) => `free:${d.appId}`),
        wishlistTargets: [],
        discountTargets: fresh.map((d) => d.appId),
        alertTargets: [],
        markHuntNotified: false
      })
    }
  }

  // ---- 自定义价格阈值：「降到 ¥X 以下通知我」 ----
  if (settings.priceAlerts.length > 0) {
    // 价格优先级：折扣 / 愿望单（每次同步都刷新）> 游戏库（可能命中商店 TTL 缓存）。
    const priceOf = new Map<number, number>()
    const nameOf = new Map<number, string>()
    for (const g of snap.games) {
      if (g.priceCents >= 0) priceOf.set(g.appId, g.priceCents)
      nameOf.set(g.appId, g.name)
    }
    for (const w of snap.wishlist) {
      if (w.finalPriceCents >= 0) priceOf.set(w.appId, w.finalPriceCents)
      nameOf.set(w.appId, w.name)
    }
    for (const d of snap.discounts) {
      if (d.finalPriceCents >= 0) priceOf.set(d.appId, d.finalPriceCents)
      nameOf.set(d.appId, d.name)
    }

    const hits: Array<{ appId: number; name: string; price: number; threshold: number }> = []
    for (const a of settings.priceAlerts) {
      const price = priceOf.get(a.appId)
      if (price === undefined || price < 0) continue
      if (price > a.thresholdCents) continue
      // 同一价格只提醒一次；价格再降（严格更小）才算新消息
      if (a.notifiedPriceCents !== null && price >= a.notifiedPriceCents) continue
      const key = `alert:${a.appId}:${price}`
      if (seen.has(key)) continue
      hits.push({ appId: a.appId, name: nameOf.get(a.appId) ?? `App ${a.appId}`, price, threshold: a.thresholdCents })
    }
    if (hits.length > 0) {
      const cheapest = hits.reduce((min, h) => (h.price < min.price ? h : min), hits[0])
      verdicts.push({
        title: '达到你的心理价',
        body:
          hits.length === 1
            ? `《${cheapest.name}》现在 ${yuan(cheapest.price)}，已低于你设定的 ${yuan(cheapest.threshold)}`
            : `${hits.length} 款游戏降到你的心理价以下，最低《${cheapest.name}》${yuan(cheapest.price)}`,
        route: 'wishlist',
        keys: hits.map((h) => `alert:${h.appId}:${h.price}`),
        wishlistTargets: [],
        discountTargets: [],
        alertTargets: hits.map((h) => ({ appId: h.appId, priceCents: h.price })),
        markHuntNotified: false
      })
    }
  }

  // ---- 稀有成就追猎：每天最多提醒一次 ----
  if (settings.notifyAchievementHunt && snap.huntNotifiedOn !== ymd()) {
    const rareLocked = snap.achievements.filter((a) => a.isRare && !a.unlocked)
    if (rareLocked.length > 0) {
      const remainingByApp = new Map<number, number>()
      for (const a of rareLocked) remainingByApp.set(a.appId, (remainingByApp.get(a.appId) ?? 0) + 1)
      // 「最接近的」= 该游戏整体完成度最高（分母来自 games 表，口径与成就中心一致）
      const progressOf = new Map(snap.games.map((g) => [g.appId, g]))
      let best: { appId: number; remaining: number; percent: number } | null = null
      for (const [appId, remaining] of remainingByApp) {
        const g = progressOf.get(appId)
        if (!g || g.achievementsTotal <= 0) continue
        const percent = (g.achievementsUnlocked / g.achievementsTotal) * 100
        if (!best || percent > best.percent || (percent === best.percent && remaining < best.remaining)) {
          best = { appId, remaining, percent }
        }
      }
      const closest = best ? `${nameOf(snap, best.appId)}还差 ${best.remaining} 个` : ''
      verdicts.push({
        title: '稀有成就追猎',
        body: `还有 ${rareLocked.length} 个稀有成就未解锁${closest ? `，最近的是${closest}` : ''}`,
        route: 'hunt',
        keys: [`hunt:${ymd()}:${rareLocked.length}`],
        wishlistTargets: [],
        discountTargets: [],
        alertTargets: [],
        markHuntNotified: true
      })
    }
  }

  return verdicts
}

function nameOf(snap: NotifySource, appId: number): string {
  return snap.games.find((g) => g.appId === appId)?.name ?? `App ${appId}`
}

/** 回写愿望单的「已提醒」标记 —— 愿望单跨重启去重的依据。 */
export function markWishlistNotified(targets: Array<{ appId: number; steamId: string }>, at: number): void {
  for (const t of targets) {
    run('UPDATE wishlist SET notified_at = $at WHERE app_id = $appId AND steam_id = $steamId', {
      at,
      appId: t.appId,
      steamId: t.steamId
    })
  }
}

/** 回写促销条目的「已提醒」标记 —— 史低 / 限时免费跨重启去重的依据。 */
export function markDiscountsNotified(appIds: number[], at: number): void {
  for (const appId of appIds) run('UPDATE discounts SET notified_at = $at WHERE app_id = $appId', { at, appId })
}
