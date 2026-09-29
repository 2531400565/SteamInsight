/**
 * 托盘图标验证：证明 resolveTrayIcon() 真的能拿到一张「看得见」的图标。
 *
 * 为什么要数不透明像素：原缺陷不是崩溃，而是 nativeImage.createEmpty() ——
 * `new Tray(空图)` 不抛错、托盘里什么都没有，整条链路静默无日志。
 * 而一个「尺寸合法但整张全透明」的 PNG 同样能骗过 isEmpty()，
 * 所以必须落到位图上数 alpha，才算真的验到「看得见」。
 *
 * 跑法：
 *   1) node node_modules/esbuild/bin/esbuild tools/probe-tray/tray-entry.ts --bundle \
 *        --platform=node --format=cjs --external:electron --tsconfig=tsconfig.node.json \
 *        --outfile=tools/probe-tray/tray-bundle.cjs
 *   2) env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS node_modules/electron/dist/electron.exe \
 *        tools/probe-tray/tray-probe.cjs --no-sandbox [--tray-png=<打包产物里的 tray.png>]
 */
const fs = require('node:fs')
const path = require('node:path')
const { app, nativeImage, Tray } = require('electron')

const argPng = ((process.argv.find((a) => a.startsWith('--tray-png=')) ?? '').split('=')[1]) || null

let pass = 0
let fail = 0
function check(name, ok, detail) {
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `\n      ${detail}` : ''}`)
}

/** 数不透明像素：getBitmap() 是 BGRA，第 4 字节是 alpha。 */
function opaqueStats(img) {
  const { width, height } = img.getSize()
  if (!width || !height) return { width, height, opaque: 0, ratio: 0 }
  const buf = img.getBitmap()
  let n = 0
  for (let i = 3; i < buf.length; i += 4) if (buf[i] > 8) n++
  return { width, height, opaque: n, ratio: Number((n / (width * height)).toFixed(3)) }
}

app.whenReady().then(() => {
  const bundle = require('./tray-bundle.cjs')
  const size = bundle.trayIconSize()
  const candidates = bundle.trayIconCandidates()

  console.log(`resourcesPath = ${process.resourcesPath}`)
  console.log(`appPath       = ${app.getAppPath()}`)
  console.log(`candidates    = ${JSON.stringify(candidates, null, 0)}`)
  console.log(`target size   = ${size}px`)
  console.log('')

  // ---- 1. 图标资产确实在源码树里（开发态候选指向它）----
  const asset = path.join(__dirname, '..', '..', 'build', 'tray.png')
  const assetOk = fs.existsSync(asset)
  check('1  build/tray.png 存在于源码树', assetOk,
    `${asset} · ${assetOk ? fs.statSync(asset).size + ' bytes' : '缺失'}`)

  // ---- 2/3. 回归证据：改动前的两个候选路径确实是空图 ----
  const old1 = nativeImage.createFromPath(`${process.resourcesPath}/icon.png`)
  const old2 = nativeImage.createFromPath(`${app.getAppPath()}/public/icon.png`)
  check('2  旧候选 resourcesPath/icon.png 是空图（复现原缺陷）', old1.isEmpty(),
    `${process.resourcesPath}/icon.png → isEmpty=${old1.isEmpty()}`)
  check('3  旧候选 appPath/public/icon.png 是空图（复现原缺陷）', old2.isEmpty(),
    `${app.getAppPath()}/public/icon.png → isEmpty=${old2.isEmpty()}`)

  // ---- 4~7. 真实函数返回一张可见的图标 ----
  const from = bundle.resolveTrayIconPath()
  const img = bundle.resolveTrayIcon()
  const st = opaqueStats(img)
  check('4  resolveTrayIconPath() 命中真实存在的图标文件', !!from && fs.existsSync(from), String(from))
  check('5  resolveTrayIcon() 返回非空图', !img.isEmpty(), `${st.width}×${st.height}`)
  check(`6  图标尺寸 = ${size}×${size}（按屏幕缩放比取整，不交给壳层插值）`,
    st.width === size && st.height === size, `实际 ${st.width}×${st.height}`)
  check('7  位图含不透明像素（不是全透明空壳）', st.opaque > 0 && st.ratio > 0.05,
    `不透明 ${st.opaque}/${st.width * st.height} 像素（${(st.ratio * 100).toFixed(1)}%）`)

  // ---- 8. 拿这张图真的能建出托盘 ----
  let created = false
  let destroyed = null
  let err = ''
  try {
    const t = new Tray(img)
    t.setToolTip('Steam Insight · probe')
    destroyed = t.isDestroyed()
    t.destroy()
    created = true
  } catch (e) {
    err = e && e.message ? e.message : String(e)
  }
  check('8  new Tray(真实图标) 可创建、未销毁、可释放', created && destroyed === false,
    err || `isDestroyed=${destroyed}`)

  // ---- 8b. 反证：空图建 Tray 不报错 —— 这正是原缺陷能长期静默的原因 ----
  try {
    const t2 = new Tray(nativeImage.createEmpty())
    t2.destroy()
    check('8b 空图 new Tray() 不抛错（解释原缺陷为何静默无日志）', true, '未抛异常')
  } catch (e) {
    check('8b 空图 new Tray() 不抛错（解释原缺陷为何静默无日志）', false, String(e))
  }

  // ---- 9/10. 打包产物里的 tray.png（可选，--tray-png 指定）----
  if (argPng) {
    const p = nativeImage.createFromPath(argPng)
    const ps = opaqueStats(p)
    check('9  打包产物 tray.png 可解码且含不透明像素',
      fs.existsSync(argPng) && !p.isEmpty() && ps.opaque > 0 && ps.ratio > 0.05,
      `${argPng} → ${ps.width}×${ps.height} · 不透明 ${(ps.ratio * 100).toFixed(1)}%`)
    const same = fs.existsSync(asset) && Buffer.compare(fs.readFileSync(asset), fs.readFileSync(argPng)) === 0
    check('10 打包产物与源码树图标字节一致', same, same ? '内容完全相同' : '内容不一致')
  }

  console.log(`\n${fail === 0 ? 'ALL PASS' : 'HAS FAILURE'}  pass=${pass} fail=${fail}`)
  app.exit(fail === 0 ? 0 : 1)
})
