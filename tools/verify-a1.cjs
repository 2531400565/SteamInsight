/**
 * A1 验证：愿望单页「标签分类」是否从空集变成真实标签。
 * 用法：node tools/verify-a1.cjs <port>
 * 流程：进愿望单页读标签行 → 点「立即同步」→ 等完成 → 再读标签行。
 */
const PORT = Number(process.argv[2] || 9447)

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
/** 读「标签分类」那一行：以「全部」按钮为锚点取同级按钮。 */
const READ_TAGS = `(() => {
  const all = [...document.querySelectorAll('button')].filter((b) => (b.innerText || '').trim() === '全部');
  if (!all.length) return { found: false, tags: [] };
  const row = all[0].parentElement;
  return { found: true, tags: [...row.querySelectorAll('button')].map((b) => (b.innerText || '').trim()) };
})()`

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) { console.log('未找到 page'); return process.exit(1) }
  const cdp = await CDP.connect(page.webSocketDebuggerUrl)
  await cdp.send('Runtime.enable')

  // 1. 进愿望单页，读标签行（同步前）
  console.log('nav ' + (await cdp.eval(clickByText('愿望单'))))
  await sleep(1600)
  const before = await cdp.eval(READ_TAGS)
  console.log('BEFORE tags ' + JSON.stringify(before.tags))

  // 2. 触发真实同步
  const clicked = await cdp.eval(`(() => { const b = document.querySelector('button[aria-label="立即同步"]'); if (!b) return false; b.click(); return true; })()`)
  console.log('click_sync ' + clicked)
  let label = ''
  for (let i = 0; i < 120; i++) {
    await sleep(2000)
    label = await cdp.eval(`(() => { const b = document.querySelector('button[aria-label="立即同步"]'); const box = b && b.previousElementSibling; return box ? (box.innerText || '').replace(/\\s+/g, ' ').trim() : ''; })()`)
    if (/已同步|同步失败/.test(label)) break
  }
  console.log('indicator ' + JSON.stringify(label))

  // 3. 回到愿望单页，读标签行（同步后）
  await cdp.eval(clickByText('首页'))
  await sleep(600)
  await cdp.eval(clickByText('愿望单'))
  await sleep(1600)
  const after = await cdp.eval(READ_TAGS)
  console.log('AFTER  tags ' + JSON.stringify(after.tags))
  console.log('tag_button_count ' + after.tags.length)

  // 4. 卡片上的标签 chip（同一份 tags 渲染）
  const chips = await cdp.eval(`(() => {
    const t = document.body.innerText.replace(/\\s+/g, ' ');
    return { text: t.slice(0, 400) };
  })()`)
  console.log('page_text ' + JSON.stringify(chips.text))
  process.exit(0)
}
main().catch((e) => { console.log('FATAL ' + String((e && e.message) || e)); process.exit(1) })
