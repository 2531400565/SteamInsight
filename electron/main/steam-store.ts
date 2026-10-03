/**
 * Steam 商店接口封装（store.steampowered.com，公开接口，不需要 API Key）。
 * 与 steam-api.ts 的分工：那边是 api.steampowered.com 的 Web API（需要 Key）。
 *
 * 两条容易踩的事实（都已实测确认）：
 *  1) appdetails 的顶层键不一定等于请求的 appid，必须按 data.steam_appid 兜底匹配；
 *  2) 好评率不在 appdetails 里，只能走 appreviews。
 */
import { asBool, asNum, asStr, isObj, requestJson } from './api-base'
import { logInfo, logWarn } from './logger'
import * as repo from './repository'

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
  return Promise.all([featured, storeSearchFreeAppIds(cc, l)]).then(([specials, freeAppIds]) => {
    // specials 恒定 10 条是 Steam 的设计，但**如果有一天变了**（变成 3 条或 40 条），
    // 用户看到的折扣数量就会无声变化 —— 记一条指纹，变了就报警。
    recordApiHealth({
      key: 'store.featuredcategories', label: '商店 · 今日精选',
      shape: `specials:${Array.isArray(specials) ? 'arr' : typeof specials}`,
      ok: specials.length > 0, size: specials.length
    })
    return { specials, freeAppIds }
  })
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
export async function storeSearchSpecials(cc = 'cn', l = 'schinese', limit = 80): Promise<SearchSpecialItem[]> {
  // count 上限 100 是官方允许的峰值；实测 specials 在国区能回 59–60 条，
  // 所以 limit=80 已经能取到「这个数据源能给的全部」，再往上加也只是白设一个更大的数。
  const url = `${STORE_ROOT}/search/results/?query&start=0&count=${Math.min(100, limit + 10)}&specials=1&cc=${cc}&l=${l}&json=1&infinite=1`
  const html = await requestJson(url, 15000, 1).then((j) => (isObj(j) ? asStr((j as Record<string, unknown>).results_html) : '')).catch(() => '')
  const items = parseSearchSpecials(html, limit)
  logInfo('store', '搜索促销解析完成', { htmlBytes: html.length, parsed: items.length, limit })
  // 结构指纹：results_html 从有变成空、或解析条数骤降，都要能被发现
  recordApiHealth({
    key: 'store.search.specials', label: '商店搜索 · 促销列表',
    shape: html ? `html:${/class="discount_pct/.test(html) ? 'rows' : 'norows'}:${/<span class="title">/.test(html) ? 'title' : 'notitle'}` : 'empty',
    ok: items.length > 0, size: items.length
  })
  return items
}

/**
 * 按关键词搜索商店条目（含当前价格与折扣率）。
 *
 * 折扣池是「按折扣力度排的 40 条」，用户想找的往往是**自己那款**在不在打折，
 * 翻列表很慢。搜索接口的 `query` 参数正好干这件事：1 个请求拿到名称 + 中文名 + 现价 + 折扣。
 * 命中结果里 `appId` 会与本地库/愿望单比对，界面据此显示「已拥有 / 已在愿望单」。
 */
export async function storeSearchByKeyword(
  keyword: string, cc = 'cn', l = 'schinese', limit = 12
): Promise<Array<{ appId: number; name: string; finalPriceCents: number; originalPriceCents: number; discountPercent: number }>> {
  const q = keyword.trim()
  if (!q) return []
  const url = `${STORE_ROOT}/search/results/?query&term=${encodeURIComponent(q)}&start=0&count=${Math.min(50, limit * 2)}&cc=${cc}&l=${l}&json=1&infinite=1`
  const html = await requestJson(url, 12000, 1).then((j) => (isObj(j) ? asStr((j as Record<string, unknown>).results_html) : '')).catch(() => '')
  const out: Array<{ appId: number; name: string; finalPriceCents: number; originalPriceCents: number; discountPercent: number }> = []
  const seen = new Set<number>()
  for (const raw of html.split('<a ')) {
    if (out.length >= limit) break
    if (!raw.includes('data-ds-appid=')) continue
    const appId = Number(/data-ds-appid="(\d+)"/.exec(raw)?.[1])
    if (!Number.isFinite(appId) || appId <= 0 || seen.has(appId)) continue
    const finalCents = Number(/data-price-final="(\d+)"/.exec(raw)?.[1])
    if (!Number.isFinite(finalCents)) continue
    let originalCents = parsePriceTextToCents(/class="discount_original_price"[^>]*>([^<]+)</.exec(raw)?.[1] ?? '')
    const pct = Math.abs(Number(/class="discount_pct[^"]*"[^>]*>-?(\d+)%/.exec(raw)?.[1] ?? NaN))
    if (originalCents <= finalCents && pct > 0 && pct < 100) originalCents = Math.round(finalCents / (1 - pct / 100))
    seen.add(appId)
    out.push({
      appId,
      name: /<span class="title">([^<]+)<\/span>/.exec(raw)?.[1]?.trim() || `App ${appId}`,
      finalPriceCents: finalCents,
      // 无折扣时原价=现价（界面显示为「无折扣」）
      originalPriceCents: originalCents > finalCents ? originalCents : finalCents,
      discountPercent: originalCents > finalCents && pct > 0 ? pct : 0
    })
  }
  logInfo('store', '商店搜索完成', { keyword: q, parsed: out.length })
  return out
}

/**
 * 接口健康记录（V5）。
 *
 * 动机全是真实的翻车记录：
 *  - `featuredcategories` 的 specials 恒定只有 10 条（国区/国际区都一样）——
 *    早前以为「在售折扣只有 9 款」是采集失败，其实是源头上限；
 *  - 商店搜索接口改过一次返回形态：`json=1` 不带 `infinite=1` 返回 `{desc, items:[{name,logo}]}`，
 *    带 `infinite=1` 返回 `{results_html}` —— 两种都 200，都"成功"，但字段完全不同；
 *  - `appdetails` 的顶层键不一定等于请求的 appid。
 *
 * 这些都属于「**HTTP 200 但结构变了**」，传统的成功/失败统计完全看不见。
 * 所以这里记录的是**结构指纹**（关键字段名 + 关键数组的条数），一旦和上次不同就记一条警告。
 */
export interface ApiHealthEntry {
  key: string
  label: string
  /** 结构指纹（字段名与条数拼成短串） */
  shape: string
  /** 本次是否成功拿到可用数据 */
  ok: boolean
  /** 观察到的规模（如 specials 条数、results_html 字节数） */
  size: number
  at: number
  note?: string
}

const HEALTH_META_KEY = 'api_health'

/** 结构指纹：只取「判断可用性必需的字段」，字段名变了才算结构变了。 */
export function shapeSignature(value: unknown, pick: string[]): string {
  if (!isObj(value)) return typeof value
  const keys = Object.keys(value as Record<string, unknown>)
  return `${keys.slice(0, 8).join(',')}|${pick.map((p) => `${p}:${isObj((value as Record<string, unknown>)[p]) ? 'obj' : typeof (value as Record<string, unknown>)[p]}`).join(';')}`
}

/** 记一条接口健康观察，并和上一次的指纹比较。 */
export function recordApiHealth(entry: Omit<ApiHealthEntry, 'at'>): { changed: boolean; previous: ApiHealthEntry | null } {
  let previous: ApiHealthEntry | null = null
  const entries: ApiHealthEntry[] = loadApiHealth()
  const found = entries.find((e) => e.key === entry.key)
  if (found) {
    previous = { ...found }
    Object.assign(found, entry, { at: Date.now() })
  } else {
    entries.push({ ...entry, at: Date.now() })
  }
  // 只留最近 20 条观察
  const trimmed = entries.slice(-20)
  repo.setMeta(HEALTH_META_KEY, JSON.stringify(trimmed))
  const changed = previous !== null && previous.shape !== entry.shape
  if (changed) {
    logWarn('net', '接口结构疑似变化', { key: entry.key, before: previous?.shape, after: entry.shape })
  }
  return { changed, previous }
}

export function loadApiHealth(): ApiHealthEntry[] {
  try {
    const raw = repo.getMeta(HEALTH_META_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ApiHealthEntry[]) : []
  } catch {
    return []
  }
}
