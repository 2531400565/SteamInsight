/**
 * 探针：确认 featuredcategories 的完整分类结构（尤其「限时免费」到底有没有官方分类），
 * 并顺带实测 appreviews 与官方搜索接口，为修「史低 / 高评分 / 限时免费」取证。
 * 只打印结构，不打印任何密钥。
 */
const { app, net } = require('electron')

function line(tag, obj) { console.log('AUDIT ' + tag + ' ' + JSON.stringify(obj)) }

function raw(url) {
  return new Promise((resolve) => {
    try {
      const req = net.request({ url, method: 'GET' })
      let body = ''
      req.on('response', (res) => {
        res.on('data', (c) => { body += c.toString('utf8') })
        res.on('end', () => resolve({ status: res.statusCode, body }))
      })
      req.on('error', (e) => resolve({ status: null, error: String((e && e.message) || e) }))
      req.end()
    } catch (e) { resolve({ status: null, error: String((e && e.message) || e) }) }
  })
}

app.whenReady().then(async () => {
  // 1) featuredcategories：列出所有分类 + 每个 item 的字段
  const r = await raw('https://store.steampowered.com/api/featuredcategories?cc=cn&l=schinese')
  let j = null
  try { j = JSON.parse(r.body) } catch { line('featured_parse_err', { status: r.status, head: r.body.slice(0, 160) }) }
  if (j) {
    line('featured_keys', { status: r.status, keys: Object.keys(j) })
    for (const k of Object.keys(j)) {
      const v = j[k]
      if (v && Array.isArray(v.items)) {
        const f = v.items[0] || {}
        line('featured_cat', {
          key: k, id: v.id, name: v.name, count: v.items.length,
          firstKeys: Object.keys(f),
          sample: { id: f.id, name: f.name, final: f.final_price, orig: f.original_price, disc: f.discount_percent, cur: f.currency, isFree: f.is_free, isFreeField: typeof f.is_free },
          freeCount: v.items.filter((x) => x && (x.is_free === true || x.discount_percent >= 100)).length
        })
      } else {
        line('featured_other', { key: k, type: typeof v, sample: JSON.stringify(v).slice(0, 200) })
      }
    }
  }

  // 2) 官方搜索接口（免费专区候选数据源）：打印 items[0] 的完整字段
  for (const [tag, url] of [
    ['search_free_specials', 'https://store.steampowered.com/search/results/?query&start=0&count=10&maxprice=free&specials=1&cc=cn&l=schinese&json=1'],
    ['search_free_all', 'https://store.steampowered.com/search/results/?query&start=0&count=10&maxprice=free&cc=cn&l=schinese&json=1'],
    ['search_100off', 'https://store.steampowered.com/search/results/?query&start=0&count=10&specials=1&maxprice=free&discount=100&cc=cn&l=schinese&json=1']
  ]) {
    const s = await raw(url)
    let d = null
    try { d = JSON.parse(s.body) } catch { /* 非 JSON */ }
    line(tag, {
      status: s.status, keys: d ? Object.keys(d) : [],
      total: d ? (d.total_count ?? d.total ?? null) : null,
      count: d && Array.isArray(d.items) ? d.items.length : null,
      first: d && Array.isArray(d.items) && d.items[0] ? d.items[0] : s.body.slice(0, 200)
    })
  }

  // 3) appreviews：好评率数据源
  const s3 = await raw('https://store.steampowered.com/appreviews/2358720?json=1&language=all&purchase_type=all&num_per_page=0')
  line('appreviews', { status: s3.status, head: s3.body.slice(0, 400) })

  app.exit(0)
})
