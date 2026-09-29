/**
 * A4 端到端验证：数据库迁移器 + 同步后清理。
 *
 * 跑法：
 *   1) 关闭应用
 *   2) node tools/verify-a4.cjs seed         打基线，并插入 4 条「幽灵行」（app_id=9999999）
 *   3) 启动应用（启动时会自动执行数据库迁移）
 *   4) node tools/verify-a4.cjs check <port> 触发同步，核对迁移结果与幽灵行是否被清掉
 *
 * 为什么用幽灵行：出库 / 换账号的残留数据在真实库里已经没有了，要验证清理逻辑
 * 就得先人为造出「库里存在、但本次同步结果里没有」的行 —— 这正是残留数据的定义。
 */
const fs = require('fs')
const os = require('node:os')
const path = require('node:path')
const initSqlJs = require('sql.js')

const DB = 'C:/Users/25314/AppData/Roaming/steam-insight/steam-insight.db'
const GHOST = 9999999
/** seed 打下的基线；check 用它判断「迁移 / 清理有没有动到不该动的行」。 */
const BASELINE = path.join(os.tmpdir(), 'si-a4-baseline.json')

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map() }
  static async connect(url) {
    const ws = new WebSocket(url)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws error')) })
    const c = new CDP(ws)
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data)
      if (m.id && c.pending.has(m.id)) {
        const { res, rej } = c.pending.get(m.id); c.pending.delete(m.id)
        if (m.error) rej(new Error(JSON.stringify(m.error))); else res(m.result)
      }
    }
    return c
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params })) })
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.text) + ' ' + String((r.exceptionDetails.exception || {}).description))
    return r.result.value
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const q = (db, sql) => { const r = db.exec(sql); return r.length ? r[0].values : [] }

/** 读库快照（迁移前后、清理前后都用同一把尺子）。 */
function snapshot(db) {
  return {
    userVersion: q(db, 'PRAGMA user_version')[0][0],
    notifiedAtCol: q(db, 'PRAGMA table_info(discounts)').map((r) => r[1]).includes('notified_at'),
    games: q(db, 'SELECT COUNT(*) FROM games')[0][0],
    achievements: q(db, 'SELECT COUNT(*) FROM achievements')[0][0],
    wishlist: q(db, 'SELECT COUNT(*) FROM wishlist')[0][0],
    discounts: q(db, 'SELECT COUNT(*) FROM discounts')[0][0],
    ghosts: q(db, `SELECT (SELECT COUNT(*) FROM games WHERE app_id=${GHOST})
      + (SELECT COUNT(*) FROM achievements WHERE app_id=${GHOST})
      + (SELECT COUNT(*) FROM wishlist WHERE app_id=${GHOST})
      + (SELECT COUNT(*) FROM discounts WHERE app_id=${GHOST})`)[0][0]
  }
}

async function withDb(fn) {
  const SQL = await initSqlJs()
  const db = new SQL.Database(fs.readFileSync(DB))
  try { return fn(db) } finally { db.close() }
}

/** 插入 4 条幽灵行并落盘 —— 「库里存在，但本次同步结果里没有」。 */
async function seed() {
  const SQL = await initSqlJs()
  const db = new SQL.Database(fs.readFileSync(DB))
  // 先把库退回「迁移前」状态，好让每次 check 都真实走一遍迁移，而不是只能验一次。
  // 老 SQLite 不支持 DROP COLUMN 时留着也无妨：启动时那条 duplicate column 容错会兜住。
  try { db.run('ALTER TABLE discounts DROP COLUMN notified_at') } catch { /* 见上 */ }
  db.run('PRAGMA user_version = 0')

  const before = snapshot(db)
  console.log('迁移前基线 ' + JSON.stringify(before))
  fs.writeFileSync(BASELINE, JSON.stringify(before))
  db.run(`INSERT OR REPLACE INTO games (app_id,name,header_image,capsule_image,genres,tags,release_date,developer,publisher)
          VALUES (${GHOST},'幽灵游戏','','','[]','[]','','','')`)
  db.run(`INSERT OR REPLACE INTO achievements (app_id,api_name,display_name,description,icon_url,icon_gray_url)
          VALUES (${GHOST},'GHOST','幽灵成就','','','')`)
  db.run(`INSERT OR REPLACE INTO wishlist (app_id,steam_id,name,header_image,added_at,tags,release_date)
          VALUES (${GHOST},(SELECT steam_id FROM users LIMIT 1),'幽灵愿望','',0,'[]','')`)
  db.run(`INSERT OR REPLACE INTO discounts (app_id,category,name,header_image,tags,release_date,store_url,fetched_at)
          VALUES (${GHOST},'hot','幽灵折扣','','[]','','',0)`)
  fs.writeFileSync(DB, Buffer.from(db.export()))
  db.close()
  console.log(`已插入 4 条幽灵行（app_id=${GHOST}）—— 现在库里存在、但同步结果里不会有它们`)
}

async function check(port) {
  const migrated = await withDb(snapshot)
  console.log('应用启动后（迁移应已执行） ' + JSON.stringify(migrated))

  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) { console.log('未找到 page'); return process.exit(1) }
  const cdp = await CDP.connect(page.webSocketDebuggerUrl)
  await cdp.send('Runtime.enable')

  const started = Date.now()
  await cdp.eval(`(() => { const b = document.querySelector('button[aria-label="立即同步"]'); if (b) b.click(); })()`)
  let label = ''
  for (let i = 0; i < 180; i++) {
    await sleep(1000)
    label = await cdp.eval(`(() => { const b = document.querySelector('button[aria-label="立即同步"]'); const box = b && b.previousElementSibling; return box ? (box.innerText || '').replace(/\\s+/g, ' ').trim() : '' })()`)
    if (/已同步|同步失败/.test(label)) break
  }
  await sleep(1600) // 等落盘
  console.log(`同步完成（${((Date.now() - started) / 1000).toFixed(1)}s，指示器 ${JSON.stringify(label)}）`)

  const after = await withDb(snapshot)
  console.log('同步后 ' + JSON.stringify(after))

  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'))
  const checks = [
    ['1 迁移已执行（user_version 升到 1）', migrated.userVersion === 1],
    ['2 新列 discounts.notified_at 已存在', migrated.notifiedAtCol === true],
    ['3 迁移只是打开库、一行没少（各表 = 基线 + 1 条幽灵）',
      migrated.games === base.games + 1 && migrated.achievements === base.achievements + 1 && migrated.wishlist === base.wishlist + 1],
    ['4 幽灵行在同步后被全部清掉', migrated.ghosts === 4 && after.ghosts === 0],
    ['5 清理只删幽灵行（games / achievements 回到基线）',
      after.games === base.games && after.achievements === base.achievements],
    ['6 愿望单回到基线条数', after.wishlist === base.wishlist]
  ]
  console.log('')
  let fail = 0
  for (const [name, ok] of checks) { if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`) }
  console.log(`\n${fail === 0 ? 'ALL PASS' : 'HAS FAILURE'}  fail=${fail}`)
  process.exit(fail === 0 ? 0 : 1)
}

const mode = process.argv[2]
const run = mode === 'seed' ? seed : mode === 'check' ? () => check(Number(process.argv[3] || 9449)) : null
if (!run) { console.log('用法：node tools/verify-a4.cjs seed | check <port>'); process.exit(1) }
run().catch((e) => { console.log('FATAL ' + String((e && e.message) || e)); process.exit(1) })
