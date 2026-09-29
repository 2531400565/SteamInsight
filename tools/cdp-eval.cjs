/**
 * 通用 CDP 求值：给已启动的 Steam Insight 执行一段 JS 并打印结果。
 * 用 Node 22 内置 `fetch` + `WebSocket`，不依赖 ws 包。
 *
 * 用法：node tools/cdp-eval.cjs 9333 "typeof window.steamInsight"
 */
const PORT = Number(process.argv[2] || 9333)
const EXPR = process.argv[3] || '1+1'

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) { console.log('no page target'); process.exit(1) }
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws open failed')) })
  let id = 0
  const send = (method, params) => new Promise((res) => {
    const myId = ++id
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data)
      if (m.id === myId) { ws.removeEventListener('message', onMsg); res(m) }
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id: myId, method, params }))
  })
  const r = await send('Runtime.evaluate', { expression: EXPR, awaitPromise: true, returnByValue: true })
  if (r.result && r.result.exceptionDetails) console.log('EVAL ERR ' + JSON.stringify(r.result.exceptionDetails).slice(0, 400))
  else console.log('EVAL ' + JSON.stringify(r.result && r.result.result ? r.result.result.value : r.result).slice(0, 1500))
  process.exit(0)
}
main().catch((e) => { console.log('FATAL ' + String(e && e.message || e)); process.exit(1) })
