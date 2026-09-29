/**
 * 真实 UI 验证：连接已启动的 Steam Insight（带 --remote-debugging-port），
 * 切到「折扣商城」并读取 4 个 Tab 的条目数，再读首页/成就页的关键数字。
 *
 * 用 Node 22 内置的 `fetch` + `WebSocket`，**不依赖 ws 包**。
 *
 * 用法：
 *   1) 启动（后台任务，别用 nohup）：
 *      cd dist/win-unpacked && ./"Steam Insight.exe" --no-sandbox --disable-gpu \
 *        --disable-gpu-compositing --disable-software-rasterizer --in-process-gpu \
 *        --disable-dev-shm-usage --remote-debugging-port=9333
 *   2) node tools/ui-verify.cjs 9333
 */
const PORT = Number(process.argv[2] || 9333)

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map() }
  static async connect(url) {
    const ws = new WebSocket(url)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = (e) => rej(new Error('ws error ' + (e && e.message))) })
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

/** 按可见文本点一个按钮，返回是否点到。 */
const clickByText = (text) => `(() => {
  const nodes = [...document.querySelectorAll('button, a')];
  const hit = nodes.find((n) => (n.innerText || '').replace(/\\s+/g, '').includes('${text}'));
  if (!hit) return false;
  hit.click();
  return true;
})()`

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) { console.log('UI 未找到 page 目标：', JSON.stringify(list).slice(0, 300)); return process.exit(1) }
  const cdp = await CDP.connect(page.webSocketDebuggerUrl)
  await cdp.send('Runtime.enable')
  console.log('UI title  ' + JSON.stringify(page.title))

  // 侧边栏按钮清单（便于定位导航项）
  const nav = await cdp.eval(`[...document.querySelectorAll('button, a')].map(n => (n.innerText||'').replace(/\\s+/g,'')).filter(Boolean).slice(0, 40)`)
  console.log('UI nav    ' + JSON.stringify(nav))

  // 切到折扣商城
  const ok = await cdp.eval(clickByText('折扣商城'))
  console.log('UI click_store ' + ok)
  await sleep(1500)

  // 读 4 个 Tab 的文本（形如「今日热门 10」）
  const tabs = await cdp.eval(`(() => {
    const btns = [...document.querySelectorAll('button')];
    return btns.map(b => (b.innerText||'').replace(/\\s+/g,' ').trim())
      .filter(t => /^(今日热门|史低专区|高评分折扣|限时免费)/.test(t));
  })()`)
  console.log('UI tabs   ' + JSON.stringify(tabs))

  // 逐 Tab 点击并读「N 条结果」与卡片数
  for (const key of ['史低专区', '高评分折扣', '限时免费', '今日热门']) {
    const clicked = await cdp.eval(clickByText(key))
    await sleep(900)
    const info = await cdp.eval(`(() => {
      const txt = document.body.innerText.replace(/\\s+/g,' ');
      const m = txt.match(/(\\d+) 条结果/);
      const cards = document.querySelectorAll('button[title], .rounded-2xl').length;
      const empty = /这个分类下暂时没有数据|需要至少两次|没有对应促销/.test(txt);
      return { results: m ? Number(m[1]) : null, cards, empty };
    })()`)
    console.log('UI tab    ' + JSON.stringify({ key, clicked, ...info }))
  }

  // 首页关键数字
  await cdp.eval(clickByText('概览')).catch(() => {})
  await sleep(300)
  const home = await cdp.eval(`(() => {
    const t = document.body.innerText.replace(/\\s+/g,' ');
    return t.slice(0, 420);
  })()`)
  console.log('UI home   ' + JSON.stringify(home))

  process.exit(0)
}

main().catch((e) => { console.log('UI FATAL  ' + String(e && e.message || e)); process.exit(1) })
