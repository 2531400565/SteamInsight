/**
 * 逐页文本污染扫描：连上无头 Chrome，按 NAV 走完每个页面，
 * 抓「可见文本 + 所有 SVG <text> 节点」，查 NaN / undefined / Infinity / [object / var(--si- / Invalid 等。
 * 用法：node tools/scan-pages.mjs <port=9333>
 *
 * NAV：侧边栏标签（与 ROUTE_LABELS 一致）。首页是入口，不点也先扫一次。
 */
import { connect, evalJS, sleep, clickByTextExpr } from './cdp-lib.mjs'

const PORT = Number(process.argv[2] || 9333)

// 侧边栏标签（与 src/store/useAppStore.ts 的 ROUTE_LABELS 对齐）
const NAV = [
  '首页',
  '游戏分析',
  '游戏库',
  '游戏对比',
  '成就中心',
  '成就追猎',
  '折扣商城',
  '愿望单',
  'Steam Wrapped',
  '设置'
]

// 要在可见文本里找的「污染特征」
const PATTERNS = [
  { re: /(^|[^0-9a-zA-Z])NaN([^0-9a-zA-Z]|$)/, name: 'NaN' },
  { re: /\bundefined\b/, name: 'undefined' },
  { re: /\bInfinity\b/, name: 'Infinity' },
  { re: /\[object(?: Object)?\]/, name: '[object Object]' },
  { re: /var\(--si-/, name: 'var(--si- (CSS 变量未替换)' },
  { re: /\bInvalid\b/i, name: 'Invalid' },
  { re: /\bnull\b/, name: 'null(作为可见文本)' }
]

function scan(text) {
  const hits = []
  for (const p of PATTERNS) {
    const m = text.match(p.re)
    if (m) {
      // 取命中前后 40 字做上下文
      const idx = text.search(p.re)
      const ctx = text.slice(Math.max(0, idx - 40), idx + 60).replace(/\n+/g, ' ').trim()
      hits.push({ name: p.name, ctx })
    }
  }
  return hits
}

const grabText = `(() => {
  const parts = [];
  parts.push(document.body.innerText || '');
  document.querySelectorAll('svg text').forEach((t) => parts.push(t.textContent || ''));
  return parts.join('\\n');
})()`

const cdp = await connect(PORT)
await cdp.send('Runtime.enable')

// 等首屏：#root 有子节点
for (let i = 0; i < 40; i++) {
  const n = await evalJS(cdp, `(() => { const r = document.querySelector('#root'); return r ? r.childElementCount : -1 })()`)
  if (n > 0) break
  await sleep(400)
}

let totalHits = 0
const report = []
for (const label of NAV) {
  // 回到首页再点，保证每次从同一基准出发（避免上一页残留浮层影响）
  await evalJS(cdp, clickByTextExpr('首页')).catch(() => {})
  await sleep(700)
  const ok = await evalJS(cdp, clickByTextExpr(label))
  await sleep(1300)
  const text = await evalJS(cdp, grabText)
  const hits = scan(text)
  totalHits += hits.length
  report.push({ label, clicked: ok, hits })
  console.log(`[${label}] clicked=${ok} hits=${hits.length}` + (hits.length ? '  ' + hits.map((h) => `${h.name} «${h.ctx}»`).join(' | ') : ''))
}

console.log('\n=== 文本污染扫描汇总 ===')
console.log('页面数=' + NAV.length + '  总命中=' + totalHits)
if (totalHits === 0) console.log('✅ 0 污染，全部页面干净')
else {
  console.log('⚠️ 需复核以上命中')
  process.exitCode = 2
}
process.exit(0)
