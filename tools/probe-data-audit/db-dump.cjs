/**
 * 直读应用 SQLite（sql.js）核对关键表计数与非空率。
 * 用法：node tools/probe-data-audit/db-dump.cjs [dbPath]
 */
const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')

const dbPath =
  process.argv[2] || path.join(process.env.APPDATA || '', 'steam-insight', 'steam-insight.db')

;(async () => {
  if (!fs.existsSync(dbPath)) {
    console.log('DB 不存在：' + dbPath)
    process.exit(1)
  }
  const SQL = await initSqlJs()
  const db = new SQL.Database(fs.readFileSync(dbPath))
  const one = (sql) => {
    const r = db.exec(sql)
    return r.length ? r[0].values[0][0] : null
  }
  const rows = (sql) => {
    const r = db.exec(sql)
    return r.length ? r[0].values : []
  }

  console.log('DB  ' + dbPath)
  const tables = rows(
    `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
  ).map((r) => r[0])
  console.log('tables ' + JSON.stringify(tables))

  const counts = {}
  for (const t of tables) counts[t] = one(`SELECT COUNT(*) FROM ${t}`)
  console.log('counts ' + JSON.stringify(counts, null, 2))

  const nonNull = (t, col) =>
    one(`SELECT COUNT(*) FROM ${t} WHERE ${col} IS NOT NULL AND ${col} != '' AND ${col} != '[]' AND ${col} != '{}'`)

  console.log('\n-- 关键非空率 --')
  const checks = [
    ['games', 'name'], ['games', 'developer'], ['games', 'release_date'],
    ['games', 'header_url'], ['games', 'genres'],
    ['achievements', 'display_name'], ['achievements', 'icon_url'],
    ['achievements', 'description'], ['achievements', 'global_percent'],
    ['discounts', 'name'], ['discounts', 'ends_at'], ['discounts', 'discount_percent'],
    ['wishlist', 'name'], ['price_history', 'price_cents'],
  ]
  for (const [t, c] of checks) {
    if (!tables.includes(t)) { console.log(`  ${t}.${c}: <无表>`); continue }
    const has = rows(`PRAGMA table_info(${t})`).map((r) => r[1])
    if (!has.includes(c)) { console.log(`  ${t}.${c}: <无列>`); continue }
    console.log(`  ${t}.${c}: ${nonNull(t, c)} / ${counts[t]}`)
  }

  console.log('\n-- 用户 / 同步元数据 --')
  if (tables.includes('users')) console.log('  users ' + JSON.stringify(rows('SELECT * FROM users')))
  if (tables.includes('meta')) console.log('  meta ' + JSON.stringify(rows('SELECT * FROM meta')))
  if (tables.includes('sync_state')) console.log('  sync_state ' + JSON.stringify(rows('SELECT * FROM sync_state')))

  console.log('\n-- 折扣明细 --')
  if (tables.includes('discounts'))
    console.log(
      '  ' +
        JSON.stringify(
          rows('SELECT app_id, name, discount_percent, price_cents, category, ends_at, is_historical_low FROM discounts')
        )
    )
  console.log('\n-- 愿望单 --')
  if (tables.includes('wishlist'))
    console.log('  ' + JSON.stringify(rows('SELECT * FROM wishlist')))
})()
