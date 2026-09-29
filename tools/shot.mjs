/**
 * 定点截图：连上已启动的无头 Chrome，可选先执行一段 JS（交互/展开浮层），再存 PNG。
 * 用法：node tools/shot.mjs <port=9333> <out=png> [eval-expr]
 *   eval-expr 例：dispatch Ctrl+K 打开命令面板
 */
import { connect, evalJS, sleep } from './cdp-lib.mjs'
import fs from 'node:fs'

const PORT = Number(process.argv[2] || 9333)
const OUT = process.argv[3] || 'shot.png'
const EXPR = process.argv[4] || ''

const cdp = await connect(PORT)
await cdp.send('Page.enable').catch(() => {})
if (EXPR) {
  await evalJS(cdp, `(() => { try { ${EXPR} } catch(e){ return String(e) } })()`)
  await sleep(900)
}
await evalJS(cdp, 'window.scrollTo(0,0)')
await sleep(200)
const { data } = await cdp.send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  fromSurface: true
})
fs.writeFileSync(OUT, Buffer.from(data, 'base64'))
console.log('shot -> ' + OUT + '  (' + Math.round(Buffer.from(data, 'base64').length / 1024) + ' KB)')
process.exit(0)
