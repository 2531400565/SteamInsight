/** 只确认一件事：featuredcategories 的 specials item 里 discount_expiration 是否真的有值。 */
const { app, net } = require('electron')

function raw(url) {
  return new Promise((resolve) => {
    const req = net.request({ url, method: 'GET' })
    let body = ''
    req.on('response', (res) => {
      res.on('data', (c) => { body += c.toString('utf8') })
      res.on('end', () => resolve({ status: res.statusCode, body }))
    })
    req.on('error', (e) => resolve({ status: null, error: String((e && e.message) || e) }))
    req.end()
  })
}

app.whenReady().then(async () => {
  const r = await raw('https://store.steampowered.com/api/featuredcategories?cc=cn&l=schinese')
  let j = null
  try { j = JSON.parse(r.body) } catch { console.log('EXP parse_err ' + r.status + ' ' + r.body.slice(0, 120)); app.exit(1); return }
  for (const i of (j.specials.items || []).slice(0, 6)) {
    console.log('EXP ' + JSON.stringify({
      id: i.id, name: i.name, disc: i.discount_percent,
      exp: i.discount_expiration ?? null,
      when: i.discount_expiration ? new Date(i.discount_expiration * 1000).toISOString() : null,
      hasField: 'discount_expiration' in i
    }))
  }
  app.exit(0)
})
