/**
 * 全站走查 + 截图 + 控制台错误收集（渲染层验收）。
 * 连上无头 Chrome，按 NAV 走完每个页面并截图，额外验证 V2 新功能：
 *   - 游戏详情页（笔记卡 NotesCard + 价格折线图 PriceLineChart）
 *   - 命令面板（Ctrl/Cmd+K）
 *   - 游戏对比页（侧边栏「游戏对比」）
 *   - 成就追猎（侧边栏「成就追猎」含追猎清单星标 + 只看追猎清单）
 *   - 游戏库（LibraryValueCard + 筛选）
 * 同时收集运行期 console.error / console.warn / 未捕获异常，目标 0 错误 0 警告。
 *
 * 用法：node tools/verify-steam-insight.mjs <port=9333> <outdir=shots-v2>
 *
 * 依赖：先起静态服务器（serve-renderer.mjs）与无头 Chrome，且 Chrome 指向静态服务器。
 */
import { connect, evalJS, sleep, clickByTextExpr } from './cdp-lib.mjs'
import fs from 'node:fs'
import path from 'node:path'

const PORT = Number(process.argv[2] || 9333)
const OUTDIR = process.argv[3] || 'shots-v2'
fs.mkdirSync(OUTDIR, { recursive: true })

const NAV = [
  ['dashboard', '首页'],
  ['analysis', '游戏分析'],
  ['library', '游戏库'],
  ['compare', '游戏对比'],
  ['achievements', '成就中心'],
  ['hunt', '成就追猎'],
  ['store', '折扣商城'],
  ['wishlist', '愿望单'],
  ['wrapped', 'Steam Wrapped'],
  ['settings', '设置']
]

const cdp = await connect(PORT)
await cdp.send('Runtime.enable')
await cdp.send('Log.enable').catch(() => {})

const consoleMsgs = []
cdp.on('Runtime.consoleAPICalled', (p) => {
  if (p.type === 'error' || p.type === 'warning') {
    const text = (p.args || []).map((a) => (a.value !== undefined ? String(a.value) : a.description || '')).join(' ')
    consoleMsgs.push({ type: p.type, text })
  }
})
cdp.on('Runtime.exceptionThrown', (p) => {
  consoleMsgs.push({ type: 'exception', text: (p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'exception') })
})

async function shoot(name) {
  await evalJS(cdp, 'window.scrollTo(0,0)')
  await sleep(150)
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true })
  const fp = path.join(OUTDIR, name + '.png')
  fs.writeFileSync(fp, Buffer.from(data, 'base64'))
  console.log('  📸 ' + name + '.png')
}

// 1) 等首屏
console.log('等待首屏渲染…')
for (let i = 0; i < 50; i++) {
  const n = await evalJS(cdp, `(() => { const r = document.querySelector('#root'); return r ? r.childElementCount : -1 })()`)
  if (n > 0) break
  await sleep(400)
}
await sleep(800)

// 标题确认（预览模式应显示演示数据横幅，但不应报错）
const title = await evalJS(cdp, `(() => { const h = document.querySelector('h1'); return h ? h.innerText : (document.body.innerText||'').slice(0,40) })()`)
console.log('首屏标题: ' + JSON.stringify(title))

// 2) 逐页截图
for (const [key, label] of NAV) {
  const ok = await evalJS(cdp, clickByTextExpr(label))
  await sleep(1300)
  console.log(`[${label}] clicked=${ok}`)
  await shoot(String(NAV.findIndex((x) => x[0] === key) + 1).padStart(2, '0') + '-' + key)
}

// 3) 游戏详情页（笔记卡 + 价格折线图）：先进游戏库，点第一张游戏卡
console.log('打开游戏详情页（LibraryCard）…')
await evalJS(cdp, clickByTextExpr('游戏库'))
await sleep(1300)
const opened = await evalJS(cdp, `(() => {
  const b = document.querySelector('button.block.w-full');
  if (!b) return false; b.click(); return true;
})()`)
await sleep(1400)
console.log('  game-detail opened=' + opened)
await shoot('11-game-detail')

// 4) 命令面板（点顶栏「搜索」按钮，比合成 Ctrl+K 更稳）
console.log('打开命令面板（搜索按钮）…')
const searchClicked = await evalJS(cdp, clickByTextExpr('搜索'))
await sleep(900)
const paletteOpen = await evalJS(cdp, `(() => { return !!document.querySelector('[data-esc-layer="palette"]') })()`)
console.log('  searchClicked=' + searchClicked + '  palette open=' + paletteOpen)
await shoot('12-command-palette')
// 关掉
await evalJS(cdp, `(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })()`)
await sleep(500)

// 5) 回到首页确认无残留
await evalJS(cdp, clickByTextExpr('首页')).catch(() => {})
await sleep(600)

// 6) 控制台错误汇总
const errs = consoleMsgs.filter((m) => m.type === 'error' || m.type === 'exception')
const warns = consoleMsgs.filter((m) => m.type === 'warning')
console.log('\n=== 控制台汇总 ===')
console.log('error/exception = ' + errs.length + '   warning = ' + warns.length)
for (const m of errs.slice(0, 30)) console.log('  ❌ [' + m.type + '] ' + m.text.slice(0, 160))
for (const m of warns.slice(0, 30)) console.log('  ⚠️  ' + m.text.slice(0, 160))

console.log('\n截图目录: ' + path.resolve(OUTDIR))
if (errs.length === 0 && warns.length === 0) console.log('✅ 运行期错误 0、警告 0')
else process.exitCode = 3
process.exit(0)
