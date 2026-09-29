/**
 * A4 验证：「同步后清理」的安全阀。**全程在副本库上跑**，绝不碰真实数据。
 *
 * 要防的是那条最危险的捷径：某次同步恰好拿到空列表（API 抖动、Key 失效、账号隐私设置变更），
 * 如果清理逻辑把「空列表」理解成「什么都不要了」，用户的整个游戏库会被一次网络故障清空。
 * 所以 purgeStale() 在列表为空时必须直接返回 0 —— 这条是本探针的重点。
 *
 * 跑法：
 *   1) node node_modules/esbuild/bin/esbuild tools/probe-purge/purge-entry.ts --bundle \
 *        --platform=node --format=cjs --external:electron --tsconfig=tsconfig.node.json \
 *        --outfile=tools/probe-purge/purge-bundle.cjs
 *   2) env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS node_modules/electron/dist/electron.exe \
 *        tools/probe-purge/purge-probe.cjs --no-sandbox
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { app } = require('electron')

const SRC = 'C:/Users/25314/AppData/Roaming/steam-insight/steam-insight.db'
const DIR = path.join(os.tmpdir(), 'si-purge-probe')

// 顺序很关键：paths.ts 是在**模块顶层**读 app.getPath('userData') 的，
// 所以必须先 setPath、再 require 打包产物 —— 否则打开的是 Electron 自己那份空库。
fs.rmSync(DIR, { recursive: true, force: true })
fs.mkdirSync(DIR, { recursive: true })
fs.copyFileSync(SRC, path.join(DIR, 'steam-insight.db'))
app.setPath('userData', DIR)

const bundle = require('./purge-bundle.cjs')

let pass = 0
let fail = 0
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`)
}

app.whenReady().then(async () => {
  await bundle.initDatabase()
  const tables = ['games', 'achievements', 'wishlist', 'discounts', 'price_history', 'snapshots']
  const snapshot = () => Object.fromEntries(tables.map((t) => [t, bundle.all(`SELECT COUNT(*) AS c FROM ${t}`)[0].c]))

  const before = snapshot()
  console.log('副本库（真实数据的拷贝） ' + JSON.stringify(before))

  // ---- 1. 安全阀：空列表绝不能清库 ----
  const zero = [bundle.purgeGames([]), bundle.purgeAchievements([]), bundle.purgeWishlist([]), bundle.purgeDiscounts([])]
  check('1  空列表 → 四个清理函数都返回 0', zero, [0, 0, 0, 0])
  check('2  空列表 → 六张表一行都没被删', snapshot(), before)

  // ---- 3. 非空列表确实会删（否则清理逻辑形同虚设）----
  const removed = bundle.purgeGames([730])
  check('3  传 [730] → 其余游戏被删干净', [removed, bundle.all('SELECT COUNT(*) AS c FROM games')[0].c], [before.games - 1, 1])

  // ---- 4. 只清目标表，其他表不受牵连 ----
  check('4  只动 games，其他表行数不变',
    ['achievements', 'wishlist', 'discounts'].map((t) => bundle.all(`SELECT COUNT(*) AS c FROM ${t}`)[0].c),
    [before.achievements, before.wishlist, before.discounts])

  console.log(`\n${fail === 0 ? 'ALL PASS' : 'HAS FAILURE'}  pass=${pass} fail=${fail}`)
  bundle.closeDatabase()
  app.exit(fail === 0 ? 0 : 1)
})
