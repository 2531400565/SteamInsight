/**
 * UI 验证第二轮：成就中心真实内容 + 在真实应用里点「立即同步」跑通端到端链路。
 * 用法：node tools/ui-verify2.cjs <port>
 */
const PORT = Number(process.argv[2] || 9444)

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

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) { console.log('未找到 page'); return process.exit(1) }
  const cdp = await CDP.connect(page.webSocketDebuggerUrl)
  await cdp.send('Runtime.enable')

  // ---- 1. 成就中心 ----
  console.log('== 成就中心 ==')
  console.log('nav ' + (await cdp.eval(clickByText('成就中心'))))
  await sleep(1600)
  const ach = await cdp.eval(`(() => {
    const imgs = [...document.querySelectorAll('img')].map(i => i.getAttribute('src') || '');
    const steamIcons = imgs.filter(s => /steamcommunity\\/public\\/images\\/apps/.test(s));
    const txt = document.body.innerText.replace(/\\s+/g, ' ').trim();
    return { imgTotal: imgs.length, steamIconCount: steamIcons.length, firstIcons: steamIcons.slice(0, 4), text: txt.slice(0, 700) };
  })()`)
  console.log('icons ' + JSON.stringify({ imgTotal: ach.imgTotal, steamIconCount: ach.steamIconCount }))
  console.log('first4 ' + JSON.stringify(ach.firstIcons))
  console.log('text  ' + JSON.stringify(ach.text))

  // ---- 2. 在真实应用里点「立即同步」 ----
  console.log('\n== 触发真实同步 ==')
  const clicked = await cdp.eval(`(() => {
    const b = document.querySelector('button[aria-label="立即同步"]');
    if (!b) return false; b.click(); return true;
  })()`)
  console.log('click_sync ' + clicked)

  let label = ''
  for (let i = 0; i < 90; i++) {
    await sleep(2000)
    label = await cdp.eval(`(() => {
      const b = document.querySelector('button[aria-label="立即同步"]');
      const box = b && b.previousElementSibling;
      return box ? (box.innerText || '').replace(/\\s+/g, ' ').trim() : '';
    })()`)
    if (/已同步|同步失败/.test(label)) break
  }
  console.log('indicator ' + JSON.stringify(label))

  // ---- 3. 设置页「上次同步」 ----
  console.log('\n== 设置页 ==')
  await cdp.eval(clickByText('设置'))
  await sleep(1200)
  const st = await cdp.eval(`(() => {
    const t = document.body.innerText.replace(/\\s+/g, ' ');
    const m = t.match(/上次同步[^ ]*/);
    const bad = /5870|58705|20\\d{3}-/.test(t);
    return { lastSync: m ? m[0] : null, hasAbsurdYear: bad, text: t.slice(0, 600) };
  })()`)
  console.log('lastSync ' + JSON.stringify(st.lastSync) + '  absurdYear=' + st.hasAbsurdYear)
  console.log('text ' + JSON.stringify(st.text))

  // ---- 4. 首页数字 ----
  console.log('\n== 首页 ==')
  await cdp.eval(clickByText('首页'))
  await sleep(1200)
  const home = await cdp.eval(`(() => {
    const t = document.body.innerText.replace(/\\s+/g, ' ');
    return { absurd: /5870|58705/.test(t), head: t.slice(0, 300) };
  })()`)
  console.log('absurdYear ' + home.absurd)
  console.log('head ' + JSON.stringify(home.head))

  process.exit(0)
}
main().catch((e) => { console.log('FATAL ' + String(e && e.message || e)); process.exit(1) })
