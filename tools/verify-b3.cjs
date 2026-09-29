/**
 * B3 端到端验证：真实同步两次，直读真实数据库，确认「增量」真的生效且不丢数据。
 *
 * 验三件事：
 *  1) 耗时下降 —— 成就请求（69 款 × 3 个接口 = 207 个）被跳过，同步应该明显变快；
 *  2) 数据不丢 —— achievements 行数、games 上的成就计数在同步前后一致（增量不删不洗）；
 *  3) 不被洗成 0 —— games.achievements_total 仍是原来的值（这是增量最大的回归风险）。
 *
 * 跑法：node tools/verify-b3.cjs <port>
 */
const fs = require('fs')
const initSqlJs = require('sql.js')

const PORT = Number(process.argv[2] || 9449)
const DB = 'C:/Users/25314/AppData/Roaming/steam-insight/steam-insight.db'

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

/** 直读真实数据库（不看界面推断）。 */
async function readDb() {
  const SQL = await initSqlJs()
  const db = new SQL.Database(fs.readFileSync(DB))
  const q = (s) => { const r = db.exec(s); return r.length ? r[0].values : [] }
  const out = {
    achievements: q('SELECT COUNT(*) FROM achievements')[0][0],
    gamesWithAch: q('SELECT COUNT(*) FROM games WHERE achievements_total > 0')[0][0],
    sumTotal: q('SELECT SUM(achievements_total) FROM games')[0][0],
    sumUnlocked: q('SELECT SUM(achievements_unlocked) FROM games')[0][0],
    sumRare: q('SELECT SUM(rare_achievements) FROM games')[0][0],
    batches: q('SELECT COUNT(DISTINCT captured_at) FROM snapshots')[0][0],
    // 强不变量：已解锁的稀有成就数不可能超过已解锁总数，更不可能超过成就总数。
    // 增量回填一旦把「稀有成就总数」填进「已解锁的稀有数」，这里立刻会 > 0。
    violations: q('SELECT COUNT(*) FROM games WHERE rare_achievements > achievements_unlocked OR achievements_unlocked > achievements_total')[0][0],
    sample: q('SELECT app_id, achievements_total, achievements_unlocked, rare_achievements FROM games ORDER BY playtime_forever_min DESC LIMIT 4')
      .map((v) => `${v[0]}:${v[1]}/${v[2]}/${v[3]}`)
  }
  db.close()
  return out
}

/** 点「立即同步」并计时到指示器落地。 */
async function syncOnce(cdp) {
  const startedAt = Date.now()
  await cdp.eval(`(() => { const b = document.querySelector('button[aria-label="立即同步"]'); if (b) b.click(); })()`)
  let label = ''
  for (let i = 0; i < 180; i++) {
    await sleep(1000)
    label = await cdp.eval(`(() => { const b = document.querySelector('button[aria-label="立即同步"]'); const box = b && b.previousElementSibling; return box ? (box.innerText || '').replace(/\\s+/g, ' ').trim() : '' })()`)
    if (/已同步|同步失败/.test(label)) break
  }
  const seconds = (Date.now() - startedAt) / 1000
  await sleep(1600) // 等落盘（主进程 800ms 防抖）
  return { label, seconds }
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) { console.log('未找到 page'); return process.exit(1) }
  const cdp = await CDP.connect(page.webSocketDebuggerUrl)
  await cdp.send('Runtime.enable')

  const before = await readDb()
  console.log('== 同步前 ==')
  console.log(JSON.stringify(before, null, 0))

  console.log('\n== 第 1 次同步 ==')
  const s1 = await syncOnce(cdp)
  const mid = await readDb()
  console.log(`耗时 ${s1.seconds}s  指示器 ${JSON.stringify(s1.label)}`)
  console.log(JSON.stringify(mid, null, 0))

  console.log('\n== 第 2 次同步（应跳掉所有已成型的游戏 → 应更快）==')
  const s2 = await syncOnce(cdp)
  const after = await readDb()
  console.log(`耗时 ${s2.seconds}s  指示器 ${JSON.stringify(s2.label)}`)
  console.log(JSON.stringify(after, null, 0))

  const checks = [
    ['1 成就行数未减少（增量不删数据）', mid.achievements >= before.achievements && after.achievements >= before.achievements],
    ['2 有成就的游戏数持平', after.gamesWithAch === before.gamesWithAch],
    ['3 成就计数之和未被洗成 0', after.sumTotal === before.sumTotal && after.sumUnlocked === before.sumUnlocked],
    ['4 稀有计数之和未被洗成 0', after.sumRare === before.sumRare && after.sumRare > 0],
    ['5 成就计数满足不变量（稀有 ≤ 已解锁 ≤ 总数）', after.violations === 0],
    ['6 快照批次递增（差分链路仍在工作）', after.batches > before.batches],
    ['7 第 2 次同步不慢于第 1 次', s2.seconds <= s1.seconds + 1]
  ]
  console.log('')
  let fail = 0
  for (const [name, ok] of checks) { if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`) }
  console.log(`\n${fail === 0 ? 'ALL PASS' : 'HAS FAILURE'}  fail=${fail}  耗时 ${s1.seconds}s → ${s2.seconds}s`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch((e) => { console.log('FATAL ' + String((e && e.message) || e)); process.exit(1) })
