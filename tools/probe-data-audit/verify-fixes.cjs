/**
 * 修复验证探针：在真实 Electron 里跑**项目自己的** steam-api.ts（esbuild 打包产物），
 * 逐条验证本轮修复：
 *   1. appdetails 顶层键错位（请求 3220060 曾返回键 5166020）
 *   2. 成就 l=schinese / description 字段名 / percent 字符串
 *   3. GetSchemaForGame 提供成就图标
 *   4. appreviews 提供真实好评率
 *   5. featuredcategories + 官方搜索接口（限时免费）
 *
 * 跑法：
 *   1) node node_modules/esbuild/bin/esbuild electron/main/steam-api.ts --bundle \
 *        --platform=node --format=cjs --external:electron --tsconfig=tsconfig.node.json \
 *        --outfile=tools/probe-data-audit/steam-api.cjs
 *   2) env -u ELECTRON_RUN_AS_NODE node_modules/electron/dist/electron.exe \
 *        tools/probe-data-audit/verify-fixes.cjs --no-sandbox
 *
 * 只打印结论，绝不打印 API Key。
 */
const path = require('node:path')
const fs = require('node:fs')
const { app } = require('electron')

// 探针进程的 app.getName() 是 "Electron"，userData 会指向 Electron 默认目录；
// 必须在 require 业务模块之前把路径指到应用真实目录，paths.ts 才会算对。
const REAL_USER_DATA = 'C:\\Users\\25314\\AppData\\Roaming\\steam-insight'
app.setPath('userData', REAL_USER_DATA)

const api = require('./steam-api.cjs')
const store = require('./steam-store.cjs')

function line(tag, obj) { console.log('VERIFY ' + tag + ' ' + JSON.stringify(obj)) }
function readSettings() {
  try { return JSON.parse(fs.readFileSync(path.join(REAL_USER_DATA, 'settings.json'), 'utf8')) } catch { return {} }
}

app.whenReady().then(async () => {
  const st = readSettings()
  line('env', { userData: app.getPath('userData'), hasKey: !!st.steamApiKey, steamId: st.steamId || null })

  // 1) appdetails 取键修复（3220060 曾返回顶层键 5166020；2358720 曾返回 3288260）
  for (const id of [3220060, 2358720, 1057090]) {
    const s = await store.storeAppDetails(id).catch((e) => ({ _err: String(e) }))
    if (s && s._err) { line('appdetails', { id, err: s._err }); continue }
    line('appdetails', {
      id, name: s && s.name, developer: s && s.developer, releaseDate: s && s.releaseDate,
      priceCents: s && s.priceCents, originalPriceCents: s && s.originalPriceCents,
      reviewPercent: s && s.reviewPercent, reviewCount: s && s.reviewCount,
      isFree: s && s.isFree, endsAt: s && s.endsAt, genres: s && s.genres.slice(0, 3)
    })
  }

  // 2) 成就名字 / 描述（修复前 nonEmptyName = 0）
  const pa = await api.getPlayerAchievements(st.steamId, 240).catch((e) => ({ _err: String(e) }))
  if (pa && Array.isArray(pa.achievements)) {
    line('achievements', {
      appId: 240, count: pa.achievements.length,
      nonEmptyName: pa.achievements.filter((a) => a.displayName).length,
      nonEmptyDesc: pa.achievements.filter((a) => a.description).length,
      first: pa.achievements[0]
    })
  } else { line('achievements', { err: pa && pa._err }) }

  // 3) 全球占比（percent 曾是字符串 "63.0"）
  const gp = await api.getGlobalAchievementPercentagesForApp(240).catch((e) => ({ _err: String(e) }))
  const gpEntries = Object.entries(gp || {})
  line('globalPercent', {
    total: gpEntries.length,
    nonZero: gpEntries.filter(([, v]) => v > 0).length,
    first3: gpEntries.slice(0, 3)
  })

  // 4) 成就图标 / hidden（来自 GetSchemaForGame）
  const sch = await api.getAchievementSchema(240).catch((e) => ({ _err: String(e) }))
  if (sch instanceof Map) {
    const first = [...sch.entries()][0]
    line('schema', {
      size: sch.size,
      firstKey: first ? first[0] : null,
      iconUrl: first ? first[1].iconUrl : null,
      iconGrayUrl: first ? first[1].iconGrayUrl : null,
      displayName: first ? first[1].displayName : null,
      hidden: first ? first[1].hidden : null
    })
  } else { line('schema', { err: sch && sch._err }) }

  // 5) 折扣来源：featuredcategories 的 specials + 官方搜索接口的限时免费 appid
  const f = await store.storeFeaturedCategories().catch((e) => ({ _err: String(e) }))
  if (f && f._err) { line('featured', { err: f._err }) } else {
    line('featured', {
      specialsCount: f.specials.length,
      specialsSample: f.specials.slice(0, 3),
      freeAppIds: f.freeAppIds
    })
    // 对免费候选逐个确认价格（限时免费 = 原价 > 0 且现价 0）
    for (const id of f.freeAppIds.slice(0, 5)) {
      const s = await store.storeAppDetails(id).catch(() => null)
      line('freeCandidate', { id, name: s && s.name, priceCents: s && s.priceCents, originalPriceCents: s && s.originalPriceCents, isFree: s && s.isFree })
    }
  }

  app.exit(0)
}).catch((e) => { line('FATAL', { err: String(e) }); app.exit(1) })
