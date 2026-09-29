/**
 * Steam Web API 巡查：确认成就名 / 全球百分比到底能不能拿到。
 *
 * 背景：DB 里 4536 条成就的 display_name 全为空、global_percent 全为 0，
 * 但界面截图里却显示了「热诚试炼」这类中文成就名 —— 二者矛盾，必须用接口原文判定。
 * 另有嫌疑：getGlobalAchievementPercentagesForApp 若返回字符串型 percent，
 * asNum() 会把它丢掉变成 0（asNum 只认 number）。
 *
 * 注意：本探针读取本机 settings.json 里的 API Key，但**绝不打印 Key 本身**。
 *
 * 跑法：env -u ELECTRON_RUN_AS_NODE node_modules/electron/dist/electron.exe \
 *         tools/probe-data-audit/api-audit.cjs --no-sandbox
 */
const fs = require('node:fs')
const path = require('node:path')
const { app } = require('electron')
const { fetchText } = require('../probe-openid/http.cjs')

// 探针里 app.getName() 是 "Electron"，userData 就指向 Electron 默认目录；
// 且本机 APPDATA 环境变量为空，所以按候选列表逐个试，最后硬编码兜底。
function readSettings() {
  const cands = [
    process.env.SI_SETTINGS,
    process.env.APPDATA ? path.join(process.env.APPDATA, 'steam-insight', 'settings.json') : null,
    path.join(app.getPath('appData'), 'steam-insight', 'settings.json'),
    'C:\\Users\\25314\\AppData\\Roaming\\steam-insight\\settings.json'
  ].filter(Boolean)
  for (const p of cands) {
    try { return { path: p, data: JSON.parse(fs.readFileSync(p, 'utf8')) } } catch { /* 试下一个 */ }
  }
  return { path: null, data: {} }
}

function line(tag, obj) { console.log('AUDIT ' + tag + ' ' + JSON.stringify(obj)) }

async function j(url) {
  const r = await fetchText(url, { timeoutMs: 15000 })
  try { return { _status: r.status, _via: r.via, _json: JSON.parse(r.body) } } catch {
    return { _status: r.status, _via: r.via, _json: null, _notJson: r.body.slice(0, 150) }
  }
}

async function main() {
  const st = readSettings()
  const key = st.data.steamApiKey || ''
  const sid = st.data.steamId || ''
  line('settings', { path: st.path, hasKey: !!key, keyLen: key.length, steamId: sid, enableDemoData: st.data.enableDemoData })

  if (!key || !sid) { line('settings', { note: '缺 Key 或 steamId，跳过 API 测试' }); return app.exit(0) }

  // 1) GetPlayerAchievements：name/description 是否存在，以及 l 参数的影响
  //    （代码里没传 l，怀疑这正是 DB 里 display_name 全空的根因）
  for (const appid of [240, 1172470]) {
    for (const l of ['', '&l=schinese']) {
      const r = await j(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${key}&steamid=${sid}&appid=${appid}${l}`)
      const ps = r._json && r._json.playerstats
      const list = (ps && Array.isArray(ps.achievements)) ? ps.achievements : []
      line('playerAchievements', {
        appid, l: l || '(不传 l)',
        status: r._status, success: ps && ps.success, gameName: ps && ps.gameName,
        count: list.length,
        firstRaw: list[0] ?? null,
        nonEmptyName: list.filter((a) => a && typeof a.name === 'string' && a.name !== '').length,
        nonEmptyDesc: list.filter((a) => a && typeof a.description === 'string' && a.description !== '').length,
        hasDescField: list[0] ? ('desc' in list[0]) : null
      })
    }
  }

  // 2) 全球百分比：percent 到底是 number 还是 string
  for (const appid of [240, 1172470]) {
    const r = await j(`https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appid}`)
    const list = (((r._json || {}).achievementpercentages || {}).achievements) || []
    line('globalPct', {
      appid, status: r._status, count: list.length,
      first: list[0] ?? null,
      typeofPercent: list[0] ? typeof list[0].percent : null,
      err: r._notJson || null
    })
  }

  // 3) 愿望单接口原文：确认它本身是否带 name（代码里用 w.name 兜底）
  const rw = await j(`https://api.steampowered.com/IWishlistService/GetWishlist/v1/?key=${key}&steamid=${sid}`)
  const items = (((rw._json || {}).response || {}).items) || []
  line('wishlist', { status: rw._status, count: items.length, firstRaw: items[0] ?? null, keys: items[0] ? Object.keys(items[0]) : [] })

  app.exit(0)
}

app.whenReady().then(() => main().catch((e) => { line('FATAL', { err: String(e) }); app.exit(1) }))
