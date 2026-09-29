/**
 * B3 验证：成就「增量同步」的判定逻辑（纯函数断言，不碰真实数据库、不发网络请求）。
 *
 * 注意：`achievement-sync.ts` 还 import 了 `./repository`（→ database → paths → electron），
 * 所以必须在 Electron 主进程里跑（与 probe-notify 同一约定）。
 *
 * 跑法：
 *   1) node node_modules/esbuild/bin/esbuild tools/probe-incremental/plan-entry.ts --bundle \
 *        --platform=node --format=cjs --external:electron --tsconfig=tsconfig.node.json \
 *        --outfile=tools/probe-incremental/plan-bundle.cjs
 *   2) env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS node_modules/electron/dist/electron.exe \
 *        tools/probe-incremental/plan-probe.cjs --no-sandbox
 *
 * 验两件事：
 *   A. 该拉谁 —— 只拉「本次玩过」或「库里还没有成就记录」的；
 *   B. 不拉谁 —— 未刷新的游戏必须把库里的旧计数回填，绝不能保持 0（0 是合法值，upsert 拦不住）。
 */
const { app } = require('electron')
const { planAchievementTargets } = require('./plan-bundle.cjs')

let pass = 0
let fail = 0
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`)
}

/** 造一个 OwnedGame：成就计数按 sync.ts 里 games.map 的初始值 —— 都是 0。 */
const game = (appId, playtimeForeverMin = 0) => ({
  appId, name: `G${appId}`, playtimeForeverMin,
  achievementsTotal: 0, achievementsUnlocked: 0, rareAchievements: 0
})
const countsOf = (entries) => new Map(entries)

app.whenReady().then(() => {
  // ---- 1. 首次同步：库里一条成就记录都没有 → 全部都要拉 ----
  {
    const games = [game(1), game(2), game(3)]
    const t = planAchievementTargets(games, new Set(), countsOf([]))
    check('1  首次同步（库里无成就）→ 3 款全部拉取', t.map((g) => g.appId), [1, 2, 3])
  }

  // ---- 2. 已同步过 + 本次没玩 → 一条都不拉，且旧计数被回填（核心：不能写 0）----
  {
    const games = [game(1), game(2)]
    const counts = countsOf([[1, [10, 4, 2]], [2, [20, 20, 3]]])
    const t = planAchievementTargets(games, new Set(), counts)
    check('2a 未玩过 + 有记录 → 0 款拉取', t.length, 0)
    check('2b 旧计数被回填（三个字段都不是 0）', games.map((g) => [g.achievementsTotal, g.achievementsUnlocked, g.rareAchievements]), [[10, 4, 2], [20, 20, 3]])
  }

  // ---- 3. 本次玩过 → 只拉它，其余不拉 ----
  {
    const games = [game(1, 500), game(2, 90), game(3, 30)]
    const counts = countsOf([[1, [10, 4, 2]], [2, [20, 20, 0]], [3, [5, 1, 0]]])
    const t = planAchievementTargets(games, new Set([2]), counts)
    check('3  只有本次玩过的 2 款被拉取', t.map((g) => g.appId), [2])
    check('3b 未拉取的两款保留旧计数', games.filter((g) => g.appId !== 2).map((g) => g.achievementsTotal), [10, 5])
  }

  // ---- 4. 新买的游戏（库里没有它的成就记录）→ 即使没玩过也要拉一次（自愈）----
  {
    const games = [game(1, 500), game(99, 0)]
    const counts = countsOf([[1, [10, 4, 2]]])
    const t = planAchievementTargets(games, new Set(), counts)
    check('4  库里无记录的新游戏 → 拉取', t.map((g) => g.appId), [99])
  }

  // ---- 5. 出库残留：counts 里有、games 里没有的 appId 不影响判定 ----
  {
    const games = [game(1, 500)]
    const counts = countsOf([[1, [10, 4, 2]], [777, [3, 0, 1]]])
    const t = planAchievementTargets(games, new Set(), counts)
    check('5  出库残留不产生幽灵目标', t.map((g) => g.appId), [])
  }

  // ---- 6. 全是「拉过但该游戏无成就」的情况：counts 里没有 → 下次仍会重试（设计如此，自愈）----
  {
    const games = [game(1, 500)]
    check('6  无成就的游戏下次仍重试（用于自愈）', planAchievementTargets(games, new Set(), countsOf([])).map((g) => g.appId), [1])
  }

  // ---- 7. 数量级：69 款里只有 2 款玩过 → 请求量从 69 组降到 2 组 ----
  {
    const games = Array.from({ length: 69 }, (_, i) => game(i + 1, 100))
    const counts = countsOf(games.map((g) => [g.appId, [12, 3, 1]]))
    const t = planAchievementTargets(games, new Set([7, 42]), counts)
    check('7  69 款 → 仅拉 2 款（≈ 6 个请求，原 207 个）', t.map((g) => g.appId), [7, 42])
  }

  console.log(`\n${fail === 0 ? 'ALL PASS' : 'HAS FAILURE'}  pass=${pass} fail=${fail}`)
  app.exit(fail === 0 ? 0 : 1)
})
