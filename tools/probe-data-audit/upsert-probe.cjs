/**
 * 验证 repository.upsert 的「空值保护」：坏数据不得覆盖好数据。
 *
 * 背景：所有 saveXxx 都是 UPSERT 且原本无条件更新全部列，
 * 于是某次同步拿不到某字段（API 抖动 / appdetails 取键失败）时，
 * 会把上一次的好数据洗成空值，且数据只劣化不自愈。
 *
 * 落地：用**临时 userData 目录**建一个全新 sqlite 文件，绝不动应用真实数据库。
 *
 * 跑法：
 *   1) node node_modules/esbuild/bin/esbuild tools/probe-data-audit/entry.ts --bundle \
 *        --platform=node --format=cjs --external:electron --tsconfig=tsconfig.node.json \
 *        --outfile=tools/probe-data-audit/repo-bundle.cjs
 *   2) env -u ELECTRON_RUN_AS_NODE node_modules/electron/dist/electron.exe \
 *        tools/probe-data-audit/upsert-probe.cjs --no-sandbox
 */
const path = require('node:path')
const fs = require('node:fs')
const { app } = require('electron')

// 独立临时目录，避免污染 %APPDATA%\steam-insight\steam-insight.db
const TMP = 'C:\\Users\\25314\\AppData\\Local\\Temp\\si-upsert-test'
fs.mkdirSync(TMP, { recursive: true })
try { fs.unlinkSync(path.join(TMP, 'steam-insight.db')) } catch { /* 首次运行没有文件 */ }
app.setPath('userData', TMP)

const { repository: repo, database } = require('./repo-bundle.cjs')

function line(tag, obj) { console.log('VERIFY ' + tag + ' ' + JSON.stringify(obj)) }

const APP = 999001

function game(over) {
  return Object.assign({
    appId: APP, name: '', headerImage: '', capsuleImage: '', genres: [], tags: [], releaseDate: '',
    developer: '', publisher: '', priceCents: -1, originalPriceCents: -1, priceCheckedAt: null,
    isHistoricalLow: false, reviewPercent: 0, reviewCount: 0, playtimeForeverMin: 0, playtimeTwoWeeksMin: 0,
    firstPlayedAt: null, lastPlayedAt: null, achievementsTotal: 0, achievementsUnlocked: 0,
    rareAchievements: 0, firstPlayedEstimated: true, source: 'api'
  }, over)
}

const GOOD = game({
  name: 'Good Game', headerImage: 'https://cdn/header.jpg', capsuleImage: 'https://cdn/cap.jpg',
  genres: ['动作', '独立'], tags: ['动作'], releaseDate: '2024 年 1 月 1 日',
  developer: 'Dev A', publisher: 'Pub A', priceCents: 1999, originalPriceCents: 2999,
  priceCheckedAt: 1700000000, isHistoricalLow: true, reviewPercent: 91, reviewCount: 1234,
  playtimeForeverMin: 600, playtimeTwoWeeksMin: 30, firstPlayedAt: 1600000000, lastPlayedAt: 1700000000,
  achievementsTotal: 10, achievementsUnlocked: 5, rareAchievements: 2, firstPlayedEstimated: false
})

app.whenReady().then(async () => {
  await database.initDatabase()
  line('env', { userData: app.getPath('userData'), dbFile: database.databaseFilePath() })

  // 场景 A：好数据 → 拿不到字段的坏数据（应保留好值）
  repo.saveGames([GOOD])
  repo.saveGames([game()])
  const afterA = repo.loadSnapshot().games.find((g) => g.appId === APP)
  line('A_good_then_bad', {
    name: afterA.name, developer: afterA.developer, publisher: afterA.publisher,
    releaseDate: afterA.releaseDate, genres: afterA.genres, tags: afterA.tags,
    priceCents: afterA.priceCents, originalPriceCents: afterA.originalPriceCents,
    headerImage: afterA.headerImage, playtimeForeverMin: afterA.playtimeForeverMin,
    firstPlayedAt: afterA.firstPlayedAt, achievementsTotal: afterA.achievementsTotal,
    reviewPercent: afterA.reviewPercent
  })

  // 场景 B：坏数据 → 好数据（guard 不得阻止正常写入）
  repo.saveGames([game({ name: 'Fresh', developer: 'Dev B', priceCents: 500, genres: ['RPG'] })])
  const afterB = repo.loadSnapshot().games.find((g) => g.appId === APP)
  line('B_bad_then_good', { name: afterB.name, developer: afterB.developer, priceCents: afterB.priceCents, genres: afterB.genres })

  // 场景 C：成就字段保护（displayName / description / icon / unlockedAt 不被空值与 null 覆盖）
  const ach = (over) => Object.assign({
    appId: APP, apiName: 'ACH_1', displayName: '', description: '', iconUrl: '', iconGrayUrl: '',
    unlocked: false, unlockedAt: null, globalPercent: 0, isRare: false, hidden: false
  }, over)
  repo.saveAchievements([ach({ displayName: '成就一', description: '描述文本', iconUrl: 'https://cdn/i.png', iconGrayUrl: 'https://cdn/ig.png', unlocked: true, unlockedAt: 1700000000, globalPercent: 63 })])
  repo.saveAchievements([ach({})])
  const a = repo.loadSnapshot().achievements.find((x) => x.appId === APP && x.apiName === 'ACH_1')
  line('C_achievement', { displayName: a.displayName, description: a.description, iconUrl: a.iconUrl, unlockedAt: a.unlockedAt, unlocked: a.unlocked, globalPercent: a.globalPercent })

  // 场景 D：愿望单名字保护（GetWishlist 原文没有 name，全靠 appdetails 回填，失败时不能洗掉旧名字）
  const wish = (over) => Object.assign({
    appId: APP, steamId: '76561198346667289', name: '', headerImage: '', addedAt: 1700000000, priority: 1, tags: [],
    originalPriceCents: -1, finalPriceCents: -1, discountPercent: 0, currency: 'CNY', isHistoricalLow: false,
    historicalLowCents: -1, historicalLowAt: null, reviewPercent: 0, reviewCount: 0, releaseDate: '', notifiedAt: null
  }, over)
  repo.saveWishlist([wish({ name: '愿望单游戏', finalPriceCents: 2980, originalPriceCents: 4980, discountPercent: 40 })])
  repo.saveWishlist([wish({})])
  const w = repo.loadSnapshot().wishlist.find((x) => x.appId === APP)
  line('D_wishlist', { name: w.name, finalPriceCents: w.finalPriceCents, discountPercent: w.discountPercent })

  database.closeDatabase()
  app.exit(0)
}).catch((e) => { line('FATAL', { err: String(e) }); app.exit(1) })
