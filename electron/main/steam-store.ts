/**
 * Steam 商店接口封装（store.steampowered.com，公开接口，不需要 API Key）。
 * 与 steam-api.ts 的分工：那边是 api.steampowered.com 的 Web API（需要 Key）。
 *
 * 两条容易踩的事实（都已实测确认）：
 *  1) appdetails 的顶层键不一定等于请求的 appid，必须按 data.steam_appid 兜底匹配；
 *  2) 好评率不在 appdetails 里，只能走 appreviews。
 */
import { asBool, asNum, asStr, isObj, requestJson } from './api-base'
import { logInfo } from './logger'

const STORE_BASE = 'https://store.steampowered.com/api'
/** 评测与搜索接口在 store 域下、不带 /api 前缀。 */
const STORE_ROOT = 'https://store.steampowered.com'

/** 好评率：appreviews 是唯一来源（appdetails 只给推荐总数，没有百分比）。 */
export interface RawReviewSummary { percent: number; count: number; desc: string }
export function getAppReviewSummary(appId: number): Promise<RawReviewSummary | null> {
  return requestJson(`${STORE_ROOT}/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`, 12000, 1).then((j) => {
    const q = isObj(j) && isObj(j.query_summary) ? (j.query_summary as Record<string, unknown>) : null
    if (!q) return null
    const total = asNum(q.total_reviews)
    if (total <= 0) return null
    return { percent: Math.round((asNum(q.total_positive) / total) * 100), count: total, desc: asStr(q.review_score_desc) }
  })
}

export interface RawStoreApp {
  appId: number; name: string; headerImage: string; capsuleImage: string; genres: string[]; tags: string[]
  releaseDate: string; developer: string; publisher: string; isFree: boolean
  priceCents: number; originalPriceCents: number; reviewPercent: number; reviewCount: number
  endsAt: number | null
}
/**
 * appdetails 的顶层键不一定等于请求的 appid。
 * 实测请求 appids=3220060 返回的顶层键是 "5166020"、请求 2358720 返回 "3288260"，
 * 而 data.steam_appid 才是真实的 3220060 —— 按请求 id 取键会整片取到 null
 * （曾导致 54/69 款游戏没有开发商、release_date 69/69 全空、愿望单名字与价格全空）。
 */
function pickAppDetailsEntry(j: unknown, appId: number): Record<string, unknown> | null {
  if (!isObj(j)) return null
  const root = j as Record<string, unknown>
  const direct = root[String(appId)]
  if (isObj(direct) && direct.success === true) return direct
  let firstOk: Record<string, unknown> | null = null
  for (const v of Object.values(root)) {
    if (!isObj(v) || v.success !== true) continue
    const d = isObj(v.data) ? (v.data as Record<string, unknown>) : {}
    if (asNum(d.steam_appid) === appId) return v
    if (!firstOk) firstOk = v
  }
  return firstOk
}

export async function storeAppDetails(appId: number, cc = 'cn', l = 'schinese'): Promise<RawStoreApp | null> {
  // 详情与评测并行取，避免把单个 app 的等待时间翻倍。
  const [j, rev] = await Promise.all([
    requestJson(`${STORE_BASE}/appdetails?appids=${appId}&cc=${cc}&l=${l}`),
    getAppReviewSummary(appId).catch(() => null)
  ])
  const entry = pickAppDetailsEntry(j, appId)
  if (!entry) return null
  const d = isObj(entry.data) ? entry.data : {}
  const price = isObj(d.price_overview) ? d.price_overview : {}
  // Steam 的 categories 偶尔返回「未翻译的本地化键」（实测 schinese 下出现
  // "#category_playable_at_your_own_pace"），直接当标签显示会露出原始 key。
  const clean = (arr: unknown[]): string[] =>
    arr.map((g) => (isObj(g) ? asStr(g.description) : '')).filter((x) => x !== '' && !x.startsWith('#'))
  const genres = Array.isArray(d.genres) ? clean(d.genres as unknown[]) : []
  const cats = Array.isArray(d.categories) ? clean(d.categories as unknown[]) : []
  const finalCents = asNum(price.final, -1)
  const initialCents = asNum(price.initial, -1)
  const isFree = asBool(d.is_free) || finalCents === 0
  return {
    appId, name: asStr(d.name),
    headerImage: asStr(d.header_image), capsuleImage: asStr(d.capsule_image),
    genres, tags: [...new Set([...genres, ...cats])],
    // release_date 是 {date, coming_soon} 对象，早前用 asStr() 判空恒为 '' → release_date 全空
    releaseDate: isObj(d.release_date) ? asStr(d.release_date.date) : asStr(d.release_date),
    developer: Array.isArray(d.developers) ? (d.developers as unknown[]).join(', ') : '',
    publisher: Array.isArray(d.publishers) ? (d.publishers as unknown[]).join(', ') : '',
    isFree,
    priceCents: finalCents >= 0 ? finalCents : (isFree ? 0 : -1),
    originalPriceCents: initialCents >= 0 ? initialCents : (isFree ? 0 : -1),
    reviewPercent: rev?.percent ?? 0,
    reviewCount: rev?.count ?? asNum((isObj(d.recommendations) ? d.recommendations : {}).total),
    endsAt: asNum(price.discount_expiration) || null
  }
}

export interface FeaturedResult {
  /** endsAt 只能从促销列表拿：appdetails 的 price_overview 实测不返回 discount_expiration。 */
  specials: Array<{ appId: number; name: string; endsAt: number | null }>
  /** 官方搜索接口里「免费 + 促销」的 appid —— featuredcategories 没有 free 分类，这是限时免费的唯一信号源。 */
  freeAppIds: number[]
}
/** 商店「今日热门折扣」真实来源：featuredcategories 的 specials。 */
export function storeFeaturedCategories(cc = 'cn', l = 'schinese'): Promise<FeaturedResult> {
  const featured = requestJson(`${STORE_BASE}/featuredcategories?cc=${cc}&l=${l}`).then((j) => {
    const specials = isObj(j) && isObj(j.specials) ? (j.specials as Record<string, unknown>).items as unknown[] | undefined : undefined
    return Array.isArray(specials)
      ? specials.map((s) => { const o = isObj(s) ? s : {}; return { appId: asNum(o.id), name: asStr(o.name), endsAt: asNum(o.discount_expiration) || null } }).filter((x) => x.appId > 0)
      : []
  })
  return Promise.all([featured, storeSearchFreeAppIds(cc, l)]).then(([specials, freeAppIds]) => ({ specials, freeAppIds }))
}

/**
 * 官方搜索接口：只用它「发现」限时免费的 appid，详情仍走 appdetails。
 * 返回体里每个 item 只有 name / logo，appid 得从 logo 的 /apps/<id>/ 段里提。
 */
function storeSearchFreeAppIds(cc: string, l: string): Promise<number[]> {
  const url = `${STORE_ROOT}/search/results/?query&start=0&count=50&maxprice=free&specials=1&cc=${cc}&l=${l}&json=1`
  return requestJson(url, 12000, 1).then((j) => {
    const items = isObj(j) && Array.isArray(j.items) ? (j.items as unknown[]) : []
    const ids = new Set<number>()
    for (const it of items) {
      const o = isObj(it) ? it : {}
      const m = /\/apps\/(\d+)\//.exec(asStr(o.logo))
      if (m) { const id = Number(m[1]); if (Number.isFinite(id) && id > 0) ids.add(id) }
    }
    return [...ids]
  })
}

/** 搜索结果里的一条促销（字段全部来自官方搜索页，**不需要再调 appdetails**）。 */
export interface SearchSpecialItem {
  appId: number
  name: string
  finalPriceCents: number
  originalPriceCents: number
  discountPercent: number
  reviewPercent: number
  reviewCount: number
  releaseDate: string
  headerImage: string
}

/**
 * 把 `¥1,234.00` / `¥89,90` 这类本地化价格文本解析成「分」。
 * 解析不了返回 -1，交给调用方走「按折扣率反推」的兜底。
 */
export function parsePriceTextToCents(text: string): number {
  const cleaned = text.replace(/[^\d.,]/g, '').trim()
  if (!cleaned) return -1
  const lastDot = cleaned.lastIndexOf('.')
  const lastComma = cleaned.lastIndexOf(',')
  let intPart = cleaned
  let frac = ''
  if (lastComma > lastDot) {
    // 逗号是小数点（欧洲写法）：去掉所有千分位逗号后取最后一段
    intPart = cleaned.slice(0, lastComma).replace(/,/g, '')
    frac = cleaned.slice(lastComma + 1)
  } else if (lastDot > -1) {
    intPart = cleaned.slice(0, lastDot).replace(/,/g, '')
    frac = cleaned.slice(lastDot + 1)
  } else {
    intPart = cleaned.replace(/,/g, '')
  }
  const yuan = Number(intPart)
  if (!Number.isFinite(yuan)) return -1
  const cents = frac ? Math.round(Number(`0.${frac}`) * 100) : 0
  return Math.round(yuan * 100) + (Number.isFinite(cents) ? cents : 0)
}

/** 纯函数版解析器：从 `results_html` 里抽出促销条目。抽成纯函数是为了能直接被探针断言。 */
export function parseSearchSpecials(html: string, limit: number): SearchSpecialItem[] {
  if (!html) return []
  const out: SearchSpecialItem[] = []
  const seen = new Set<number>()
  // 每条结果是一个 <a data-ds-appid=...>…</a> 块；按块切分再逐块取字段，
  // 比对整段 HTML 跑一堆全局正则更稳（字段一定属于同一条结果）。
  for (const raw of html.split('<a ')) {
    if (out.length >= limit) break
    if (!raw.includes('data-ds-appid=')) continue
    const appId = Number(/data-ds-appid="(\d+)"/.exec(raw)?.[1])
    if (!Number.isFinite(appId) || appId <= 0 || seen.has(appId)) continue
    const finalCents = Number(/data-price-final="(\d+)"/.exec(raw)?.[1])
    if (!Number.isFinite(finalCents) || finalCents < 0) continue
    const pct = Math.abs(Number(/class="discount_pct[^"]*"[^>]*>-?(\d+)%/.exec(raw)?.[1] ?? NaN))
    let originalCents = parsePriceTextToCents(/class="discount_original_price"[^>]*>([^<]+)</.exec(raw)?.[1] ?? '')
    // 原价文本缺失或解析失败时按折扣率反推：现价 ÷ (1 - 折扣率)
    if (originalCents <= finalCents && pct > 0 && pct < 100) {
      originalCents = Math.round(finalCents / (1 - pct / 100))
    }
    if (originalCents <= finalCents) continue
    const reviewPercent = Number(/有 (\d+)% 为好评/.exec(raw)?.[1] ?? NaN)
    seen.add(appId)
    out.push({
      appId, name: /<span class="title">([^<]+)<\/span>/.exec(raw)?.[1]?.trim() || `App ${appId}`,
      finalPriceCents: finalCents, originalPriceCents: originalCents,
      discountPercent: Number.isFinite(pct) && pct > 0 ? pct : Math.max(0, Math.round((1 - finalCents / originalCents) * 100)),
      reviewPercent: Number.isFinite(reviewPercent) ? reviewPercent : 0, reviewCount: 0,
      releaseDate: /class="search_released[^"]*"[^>]*>\s*([^<]+?)\s*</.exec(raw)?.[1] ?? '',
      // 统一用官方 header 图地址；取不到时由渲染层的候选链兜底（capsule_616x353 等）
      headerImage: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`
    })
  }
  return out
}

/**
 * 折扣池扩容：`featuredcategories` 的 specials **恒定只有 10 条**（实测 cc=cn / cc=us 都是 10，
 * 它给的是「今日精选」而不是全部促销），所以「在售折扣 9 款」不是采集失败，是源头上限。
 *
 * 官方搜索接口的 `specials=1` 能一次给出几十条促销，且单条里已经带齐
 * 中文名 / 现价（分）/ 原价 / 折扣率 / 好评率 / 发售日 —— 意味着**不需要为每条再打一次
 * appdetails + appreviews**（那会让每次同步多几十个请求，而折扣条目没有 TTL 缓存）。
 * 代价是拿不到 tags 与评测数量，因此这些条目不参与「高评分折扣」的评分筛选。
 * 解析失败一律返回空数组，退回 featuredcategories 的 10 条，行为与改动前一致。
 */
export async function storeSearchSpecials(cc = 'cn', l = 'schinese', limit = 40): Promise<SearchSpecialItem[]> {
  const url = `${STORE_ROOT}/search/results/?query&start=0&count=${Math.min(100, limit + 10)}&specials=1&cc=${cc}&l=${l}&json=1&infinite=1`
  const html = await requestJson(url, 15000, 1).then((j) => (isObj(j) ? asStr((j as Record<string, unknown>).results_html) : '')).catch(() => '')
  const items = parseSearchSpecials(html, limit)
  logInfo('store', '搜索促销解析完成', { htmlBytes: html.length, parsed: items.length, limit })
  return items
}
