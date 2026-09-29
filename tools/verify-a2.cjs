/**
 * A2 / A3 端到端验证：真实同步两次 + 直读真实数据库 + 读愿望单页按钮状态。
 *
 * 验的是三件事：
 *  1) 首次同步会把「正在打折」的愿望单条目写入 notified_at（A2：该列终于承载语义）；
 *  2) 紧接着再同步一次，notified_at 不变（同一条提醒不会重复弹）；
 *  3) 愿望单页「提醒我」按钮状态来自 notified_at，点过之后（A3）刷新仍是「已提醒」。
 *
 * 跑法：node tools/verify-a2.cjs <port>
 */
const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')

const PORT = Number(process.argv[2] || 9447)
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
const clickByText = (t) => `(() => {
  const n = [...document.querySelectorAll('button, a')];
  const hit = n.find((x) => (x.innerText || '').replace(/\\s+/g, '').includes('${t}'));
  if (!hit) return false; hit.click(); return true;
})()`

/** 直读数据库里愿望单的 notified_at（真实值，不看界面推断）。 */
async function readNotified() {
  const SQL = await initSqlJs()
  const db = new SQL.Database(fs.readFileSync(DB))
  const r = db.exec('SELECT app_id, name, discount_percent, notified_at FROM wishlist ORDER BY discount_percent DESC')
  db.close()
  return r.length ? r[0].values.map((v) => ({ appId: v[0], name: v[1], discount: v[2], notifiedAt: v[3] })) : []
}

/** 读愿望单页每张卡片上「提醒我 / 已提醒」按钮的状态 + 所属游戏名。 */
const READ_CARDS = `(() => {
  const btns = [...document.querySelectorAll('button')].filter((b) => /^(提醒我|已提醒)$/.test((b.innerText || '').trim()));
  return btns.map((b) => {
    let el = b, text = '';
    while (el && el !== document.body) { if ((el.innerText || '').length > 60) { text = el.innerText; break } el = el.parentElement }
    return { label: (b.innerText || '').trim(), card: text.replace(/\\s+/g, ' ').slice(0, 34) }
  });
})()`

async function syncOnce(cdp, tag) {
  await cdp.eval(`(() => { const b = document.querySelector('button[aria-label="立即同步"]'); if (b) b.click(); })()`)
  let label = ''
  for (let i = 0; i < 120; i++) {
    await sleep(2000)
    label = await cdp.eval(`(() => { const b = document.querySelector('button[aria-label="立即同步"]'); const box = b && b.previousElementSibling; return box ? (box.innerText || '').replace(/\\s+/g, ' ').trim() : '' })()`)
    if (/已同步|同步失败/.test(label)) break
  }
  await sleep(1600) // 等落盘（主进程 800ms 防抖）
  console.log(`${tag} indicator ${JSON.stringify(label)}`)
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) { console.log('未找到 page'); return process.exit(1) }
  const cdp = await CDP.connect(page.webSocketDebuggerUrl)
  await cdp.send('Runtime.enable')

  console.log('== 同步前 ==')
  console.log('db ' + JSON.stringify(await readNotified()))

  console.log('\n== 第 1 次同步 ==')
  await syncOnce(cdp, 'sync1')
  const after1 = await readNotified()
  console.log('db ' + JSON.stringify(after1))

  console.log('\n== 第 2 次同步（应不再重复提醒 → notified_at 不变）==')
  await syncOnce(cdp, 'sync2')
  const after2 = await readNotified()
  console.log('db ' + JSON.stringify(after2))
  const same = JSON.stringify(after1) === JSON.stringify(after2)
  console.log('notified_at 未被二次刷新 = ' + same)

  console.log('\n== 愿望单页按钮状态 ==')
  await cdp.eval(clickByText('愿望单'))
  await sleep(1600)
  console.log('before ' + JSON.stringify(await cdp.eval(READ_CARDS)))

  // A3：点还没提醒过的那张卡的「提醒我」，再读一次（不刷新页面，靠 reload 拉库）
  const clicked = await cdp.eval(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.innerText || '').trim() === '提醒我');
    if (!b) return false; b.click(); return true;
  })()`)
  console.log('clicked_remind ' + clicked)
  await sleep(2200)
  console.log('after  ' + JSON.stringify(await cdp.eval(READ_CARDS)))
  console.log('db ' + JSON.stringify(await readNotified()))

  process.exit(0)
}
main().catch((e) => { console.log('FATAL ' + String((e && e.message) || e)); process.exit(1) })
