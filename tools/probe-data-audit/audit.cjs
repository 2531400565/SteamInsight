/**
 * 数据链路巡查探针：直接打 Steam 商店接口，看「空分类」到底是接口没数据还是代码没解析。
 *
 * 背景：折扣商城的「高评分折扣 / 限时免费 / 史低专区」在真实模式下恒为空。
 * 代码里 reviewPercent 被硬编码成 0、featuredcategories 只解析 specials ——
 * 这个探针用来确认接口真实返回了什么（尤其 featuredcategories 是否本来就带 free 分类）。
 *
 * 跑法：
 *   node node_modules/esbuild/bin/esbuild electron/main/http.ts --bundle --platform=node \
 *     --format=cjs --external:electron --outfile=tools/probe-openid/http.cjs
 *   env -u ELECTRON_RUN_AS_NODE node_modules/electron/dist/electron.exe \
 *     tools/probe-data-audit/audit.cjs --no-sandbox
 */
const { app } = require('electron')
const { fetchText } = require('../probe-openid/http.cjs')

const STORE_API = 'https://store.steampowered.com/api'
const STORE = 'https://store.steampowered.com'

function line(tag, obj) { console.log('AUDIT ' + tag + ' ' + JSON.stringify(obj)) }

async function rawJson(url) {
  const r = await fetchText(url, { timeoutMs: 15000 })
  if (r.status === null) return { _err: r.error, _via: r.via }
  try { return JSON.parse(r.body) } catch { return { _notJson: r.body.slice(0, 160), _status: r.status } }
}

async function main() {
  // A. appdetails：愿望单「名字为空、价格为 —」的直接原因就在这一跳，必须看原始响应体
  //    246420 是成功对照组（它在 discounts 表里有名字）
  for (const id of [3220060, 2358720, 246420]) {
    for (const q of ['cc=cn&l=schinese', 'cc=cn', 'cc=us&l=en']) {
      const r = await fetchText(`${STORE_API}/appdetails?appids=${id}&${q}`, { timeoutMs: 15000 })
      let e = null
      try { e = JSON.parse(r.body)[String(id)] } catch { /* 非 JSON */ }
      line('appdetails_raw', {
        id, q, status: r.status, via: r.via,
        success: e ? e.success : 'JSON解析失败',
        name: e && e.data ? e.data.name : null,
        is_free: e && e.data ? e.data.is_free : null,
        bodyStart: r.body.slice(0, 170)
      })
    }
  }

  // B. 好评率：appdetails 不含百分比，需单独的 appreviews 接口 —— 验证它是否可用
  for (const id of [2358720, 246420, 2531310]) {
    const j = await rawJson(`${STORE}/appreviews/${id}?json=1&language=all&purchase_type=all&num_per_page=0`)
    const q = j.query_summary || {}
    const pct = q.total_reviews ? Math.round((q.total_positive / q.total_reviews) * 100) : null
    line('appreviews', {
      id, ok: !!j.query_summary, success: j.success,
      total_positive: q.total_positive, total_reviews: q.total_reviews,
      review_score: q.review_score, desc: q.review_score_desc, computedPct: pct,
      err: j._err || j._notJson || null
    })
  }

  // C. featuredcategories 的真实结构：看它是不是本来就带 free / top_sellers 等分类
  const fc = await rawJson(`${STORE_API}/featuredcategories?cc=cn&l=schinese`)
  line('featuredcategories_keys', { keys: Object.keys(fc), err: fc._err || fc._notJson || null })
  for (const k of Object.keys(fc)) {
    if (k.startsWith('_')) continue
    const node = fc[k]
    const items = node && node.items
    if (!Array.isArray(items)) continue
    line('featuredcategories', {
      key: k, count: items.length,
      sample: items.slice(0, 3).map((x) => ({
        id: x.id, name: x.name,
        final: x.final_price, original: x.original_price,
        discount: x.discount_percent, currency: x.currency, is_free: x.is_free
      }))
    })
  }

  app.exit(0)
}

app.whenReady().then(() => main().catch((e) => { console.log('AUDIT FATAL ' + String(e)); app.exit(1) }))
