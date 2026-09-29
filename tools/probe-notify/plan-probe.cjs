/**
 * A2 验证：通知去重的判定逻辑（纯函数断言，不碰真实数据库）。
 *
 * 注意：`notify-plan.ts` 为了写回 notified_at 依赖 `./database`，而 database → paths 会
 * import electron，所以必须在 Electron 主进程里跑（与 sync-run.cjs 同一约定）。
 *
 * 跑法：
 *   1) node node_modules/esbuild/bin/esbuild tools/probe-notify/plan-entry.ts --bundle \
 *        --platform=node --format=cjs --external:electron --tsconfig=tsconfig.node.json \
 *        --outfile=tools/probe-notify/plan-bundle.cjs
 *   2) env -u ELECTRON_RUN_AS_NODE node_modules/electron/dist/electron.exe \
 *        tools/probe-notify/plan-probe.cjs --no-sandbox
 *
 * 重点验的是「同一条提醒不会重复弹」：愿望单跨重启去重（notified_at）、
 * 史低/限时免费运行内去重（seen）。
 */
const { app } = require('electron')
const { planNotifications } = require('./plan-bundle.cjs')

let pass = 0
let fail = 0
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`)
}

const ALL_ON = { notifyWishlistDrop: true, notifyHistoricalLow: true, notifyFreeGame: true }
const wish = (o) => ({ appId: 1, steamId: 'S', discountPercent: 0, finalPriceCents: -1, notifiedAt: null, ...o })
const disc = (o) => ({ appId: 1, category: 'hot', isHistoricalLow: false, finalPriceCents: -1, originalPriceCents: -1, ...o })

app.whenReady().then(() => {
  // ---- 1. 愿望单降价：首次该弹 ----
  {
    const snap = { wishlist: [wish({ appId: 3220060, discountPercent: 25, finalPriceCents: 3150 })], discounts: [] }
    const v = planNotifications(snap, ALL_ON, new Set())
    check('1a 首次打折 → 弹 1 条', v.map((x) => x.title), ['愿望单降价'])
    check('1b 文案含最低到手价', v[0].body, '1 款愿望单游戏正在打折，最低 ¥31.50')
    check('1c 带回去重键与待落库条目', [v[0].keys, v[0].wishlistTargets], [['wishlist:3220060:3150'], [{ appId: 3220060, steamId: 'S' }]])
  }

  // ---- 2. 愿望单降价：已提醒过（notified_at 有值）→ 不再弹（跨重启去重）----
  {
    const snap = { wishlist: [wish({ appId: 3220060, discountPercent: 25, finalPriceCents: 3150, notifiedAt: 1758880000 })], discounts: [] }
    check('2  已提醒过 → 不弹', planNotifications(snap, ALL_ON, new Set()).length, 0)
  }

  // ---- 3. 愿望单降价：还没落库但本次运行已弹过（seen 兜底）→ 不弹 ----
  {
    const snap = { wishlist: [wish({ appId: 3220060, discountPercent: 25, finalPriceCents: 3150 })], discounts: [] }
    check('3  seen 兜底 → 不弹', planNotifications(snap, ALL_ON, new Set(['wishlist:3220060:3150'])).length, 0)
  }

  // ---- 4. 史低：运行内去重，且只统计「新出现」的条目 ----
  {
    const a = disc({ appId: 10, isHistoricalLow: true, finalPriceCents: 100 })
    const b = disc({ appId: 20, isHistoricalLow: true, finalPriceCents: 200 })
    const v = planNotifications({ wishlist: [], discounts: [a, b] }, ALL_ON, new Set(['low:10:100']))
    check('4a 已弹过的条目被剔除，只算新条目', [v.length, v[0].body, v[0].keys], [1, '1 款游戏达到历史最低价', ['low:20:200']])
    check('4b 全部弹过 → 0 条', planNotifications({ wishlist: [], discounts: [a, b] }, ALL_ON, new Set(['low:10:100', 'low:20:200'])).length, 0)
  }

  // ---- 5. 限时免费：F2P 不算，真 100% off 才算 ----
  {
    const f2p = disc({ appId: 30, category: 'free', finalPriceCents: 0, originalPriceCents: 0 })
    const realFree = disc({ appId: 40, category: 'free', finalPriceCents: 0, originalPriceCents: 9900 })
    const v = planNotifications({ wishlist: [], discounts: [f2p, realFree] }, ALL_ON, new Set())
    check('5  只有真限时免费触发（F2P 被排除）', [v.length, v[0].keys], [1, ['free:40']])
  }

  // ---- 6. 开关关闭时不弹 ----
  {
    const snap = {
      wishlist: [wish({ appId: 3220060, discountPercent: 25, finalPriceCents: 3150 })],
      discounts: [
        disc({ appId: 10, isHistoricalLow: true, finalPriceCents: 100 }),
        disc({ appId: 40, category: 'free', finalPriceCents: 0, originalPriceCents: 9900 })
      ]
    }
    const OFF = { notifyWishlistDrop: false, notifyHistoricalLow: false, notifyFreeGame: false }
    check('6  三项开关全关 → 0 条', planNotifications(snap, OFF, new Set()).length, 0)
  }

  // ---- 7. 不打折的愿望单不弹 ----
  {
    const snap = { wishlist: [wish({ appId: 2358720, discountPercent: 0, finalPriceCents: 26800 })], discounts: [] }
    check('7  无折扣 → 不弹', planNotifications(snap, ALL_ON, new Set()).length, 0)
  }

  console.log(`\n${fail === 0 ? 'ALL PASS' : 'HAS FAILURE'}  pass=${pass} fail=${fail}`)
  app.exit(fail === 0 ? 0 : 1)
})
