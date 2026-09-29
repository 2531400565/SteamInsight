/**
 * 极简 CDP 客户端（零依赖，Node 22 用内置 WebSocket + fetch）。
 * 仅供 tools/ 下的验收脚本连上无头 Chrome 用，不进 asar。
 */
export async function listTargets(port) {
  const r = await fetch(`http://127.0.0.1:${port}/json/list`)
  return r.json()
}

export async function connect(port) {
  const list = await listTargets(port)
  const page = list.find((t) => t.type === 'page') || list[0]
  if (!page) throw new Error('no page target on port ' + port)
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = () => rej(new Error('ws open failed for ' + page.webSocketDebuggerUrl))
  })
  let id = 0
  const pending = new Map()
  const handlers = {}
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id)
      pending.delete(m.id)
      if (m.error) rej(new Error(JSON.stringify(m.error)))
      else res(m.result)
    }
    if (m.method && handlers[m.method]) handlers[m.method].forEach((h) => h(m.params))
  }
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const myId = ++id
      pending.set(myId, { res, rej })
      ws.send(JSON.stringify({ id: myId, method, params }))
    })
  const on = (method, cb) => {
    ;(handlers[method] ||= []).push(cb)
  }
  return { ws, send, on, page }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 在页面里求值，awaitPromise + returnByValue。抛错时带上异常描述。 */
export async function evalJS(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: expr,
    awaitPromise: true,
    returnByValue: true
  })
  if (r.exceptionDetails) {
    const d = r.exceptionDetails
    throw new Error((d.text || 'EVAL') + ' :: ' + (d.exception?.description || d.exception?.value || ''))
  }
  return r.result.value
}

/**
 * 按可见 innerText 匹配点击侧边栏 / 按钮。
 * 鲁棒处理：① 去掉所有空白（"Steam Wrapped" ↔ "SteamWrapped"）；
 * ② 允许带数字角标的标签（"成就追猎205"）；③ 用长度上限避免误命中长设置子链接（"设置·通用…"）。
 */
export function clickByTextExpr(label) {
  const target = label.replace(/\s+/g, '')
  return `(() => {
    const nodes = [...document.querySelectorAll('button, a, [role="button"]')];
    const t = ${JSON.stringify(target)};
    const hit = nodes.find((x) => {
      const s = (x.innerText || '').replace(/\\s+/g, '');
      return s === t || s.startsWith(t) || (s.includes(t) && s.length <= t.length + 8);
    });
    if (!hit) return false;
    hit.click();
    return true;
  })()`
}
