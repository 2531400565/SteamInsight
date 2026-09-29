/**
 * 自检探针：本次 ROADMAP 交付物中「可判定」的部分，逐条断言。
 *
 * 为什么要写成探针而不是"我读了一遍代码觉得没问题"：
 * 这个项目已经出过多次「接口 200 但字段名写错」「createEmpty() 不抛错」这类静默失败，
 * 只有把判定逻辑真的跑一遍才算数。
 *
 * 覆盖 10 组断言：
 *   A 连通性自检判定（buildVerdict / parseProxyEndpoint / configWarning）
 *   B 数据包（parseDataPack 的 6 类非法输入 + 真实库往返 + 未知列与缺列防注入）
 *   C 价格阈值提醒（降到阈值下 / 同价去重 / 再降再弹 / 高于阈值不弹 / 来源优先级）
 *   D 成就追猎（每日一次 + 开关 + 「最近的那个」文案）
 *   E 设置归一化（脏 priceAlerts / 非法间隔 / 非法国家码）
 *   F 日志落盘（写 → flush → 读回）
 *   G 库价值口径（N1-1：免费/未知不计入、沉没成本截断后合计、原价缺失不算假折扣）
 *   H 最稀有成就榜 + IPC 瘦身（N1-3 / Tier3：占比未知不冒充 0%、图标往返无损）
 *   I 采样保留策略（N0-1：90 天内不删、史低保留、每款 2 条快照、幂等）
 *   J 笔记 / 追猎清单 / 换账号检测（新表项 + Tier3）
 *
 * 跑法：
 *   1) node node_modules/esbuild/bin/esbuild tools/probe-features/features-entry.ts --bundle \
 *        --platform=node --format=cjs --external:electron --tsconfig=tsconfig.node.json \
 *        --outfile=tools/probe-features/features-bundle.cjs
 *   2) env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS node_modules/electron/dist/electron.exe \
 *        tools/probe-features/features-probe.cjs --no-sandbox
 *
 * ⚠️ 数据库隔离：在 require bundle **之前**把 userData 指到临时目录。
 *    因为 paths.ts 是在模块加载时就执行 `app.getPath('userData')` 的，
 *    晚一步设置就会污染真实库。
 */
const { app } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const TMP = path.join(os.tmpdir(), `si-probe-${Date.now()}`)
fs.mkdirSync(TMP, { recursive: true })
app.setPath('userData', TMP)

// 必须在 setPath 之后才 require —— paths.ts 在加载时就把 userData 读走了
const B = require('./features-bundle.cjs')

let pass = 0
let fail = 0
const failures = []

function ok(name, cond, detail) {
  if (cond) {
    pass++
    console.log(`PASS  ${name}`)
  } else {
    fail++
    failures.push(name)
    console.log(`FAIL  ${name}${detail ? `  → ${detail}` : ''}`)
  }
}
function eq(name, got, want) {
  const a = JSON.stringify(got)
  const b = JSON.stringify(want)
  ok(name, a === b, `got ${a}  want ${b}`)
}
function throws(name, fn) {
  try {
    fn()
    ok(name, false, '未抛异常')
  } catch {
    ok(name, true)
  }
}

const pad = (n) => String(n).padStart(2, '0')
const d0 = new Date()
const TODAY = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`

/** 构造一条探测结果。 */
const chk = (label, kind, good, error = null) => ({
  label,
  kind,
  ok: good,
  status: good ? 200 : null,
  via: good ? 'net' : null,
  ms: 100,
  error: good ? null : error
})

/** 造一个 OwnedGame。字段按 src/types/steam.ts 的 Game + OwnedGame 补全，缺列会在纯函数里读到 undefined。 */
function mkGame(o = {}) {
  return {
    appId: 1, name: 'g', headerImage: '', capsuleImage: '', genres: [], tags: [],
    releaseDate: '', developer: '', publisher: '',
    priceCents: -1, originalPriceCents: -1, priceCheckedAt: null, isHistoricalLow: false,
    reviewPercent: 0, reviewCount: 0,
    playtimeForeverMin: 0, playtimeTwoWeeksMin: 0, firstPlayedAt: null, lastPlayedAt: null,
    achievementsTotal: 0, achievementsUnlocked: 0, rareAchievements: 0, firstPlayedEstimated: false,
    ...o
  }
}

/** 造一个 Achievement。 */
function mkAchievement(o = {}) {
  return {
    appId: 570, apiName: 'a', displayName: 'A', description: '',
    iconUrl: `${B.ACHIEVEMENT_ICON_BASE}570/a.jpg`, iconGrayUrl: `${B.ACHIEVEMENT_ICON_BASE}570/a_g.jpg`,
    unlocked: false, unlockedAt: null, globalPercent: 0, isRare: false, hidden: false,
    ...o
  }
}

/** games 表有多列 NOT NULL 且无默认值，插入必须补全。 */
function insertGame(appId, name) {
  B.run(
    `INSERT OR REPLACE INTO games
       (app_id, name, header_image, capsule_image, genres, tags, release_date, developer, publisher, price_cents)
     VALUES ($a, $n, '', '', '[]', '[]', '', '', '', -1)`,
    { a: appId, n: name }
  )
}

app.whenReady().then(async () => {
  console.log('=== A 连通性自检判定逻辑 ===')
  {
    const all = B.DIAGNOSE_TARGETS.map((t) => chk(t.label, t.kind, true))
    const v = B.buildVerdict(all, '直连', null)
    eq('A1 5/5 全通 → level=ok', v.level, 'ok')
    ok('A2 全通标题为「网络正常」', v.title === '网络正常', v.title)
    ok('A3 全通无处置建议', v.actions.length === 0)

    // 全部失败 + 代理端口无人监听 → 指向"代理客户端退出了"
    const allFail = B.DIAGNOSE_TARGETS.map((t) => chk(t.label, t.kind, false, 'ERR_PROXY_CONNECTION_FAILED'))
    const v2 = B.buildVerdict(allFail, '127.0.0.1:7897', false)
    eq('A4 全失败+代理端口无监听 → level=error', v2.level, 'error')
    ok('A5 标题点名代理端口', v2.title.includes('没有程序在监听'), v2.title)
    ok('A6 建议里提到重开代理客户端', v2.actions.some((a) => a.includes('代理客户端')), JSON.stringify(v2.actions))

    // 全部失败 + 本机地址拒绝 → 指向 hosts 劫持残留
    const refused = B.DIAGNOSE_TARGETS.map((t) => chk(t.label, t.kind, false, 'net::ERR_CONNECTION_REFUSED'))
    const v3 = B.buildVerdict(refused, '直连', null)
    ok('A7 标题点名 127.0.0.1 劫持', v3.title.includes('127.0.0.1'), v3.title)
    ok('A8 建议里提到加速器', v3.actions.some((a) => a.includes('Steam++')), JSON.stringify(v3.actions))

    // 业务三域名挂 + CDN 通 —— 最典型也最容易被误判的组合
    const mixed = [
      chk('api.steampowered.com', 'api', false, 'ERR_CONNECTION_REFUSED'),
      chk('steamcommunity.com', 'community', false, 'ERR_CONNECTION_REFUSED'),
      chk('store.steampowered.com', 'store', false, 'ERR_CONNECTION_REFUSED'),
      chk('avatars.steamstatic.com', 'cdn', true),
      chk('cdn.cloudflare.steamstatic.com', 'cdn', true)
    ]
    const v4 = B.buildVerdict(mixed, '直连', null)
    eq('A9 业务挂+CDN通 → level=warn', v4.level, 'warn')
    ok('A10 标题给出「加速器没运行」的判定', v4.title.includes('加速器'), v4.title)

    // 部分失败 → 泛化提示
    const partial = B.DIAGNOSE_TARGETS.map((t, i) => chk(t.label, t.kind, i !== 0))
    const v5 = B.buildVerdict(partial, '直连', null)
    eq('A11 部分失败 → level=warn', v5.level, 'warn')
    ok('A12 部分失败标题带计数', v5.title.includes('4/5'), v5.title)

    // 探测目标本身必须是应用真实用到的 5 个域名
    eq('A13 探测目标数为 5', B.DIAGNOSE_TARGETS.length, 5)
    eq('A14 含两个 CDN 目标', B.DIAGNOSE_TARGETS.filter((t) => t.kind === 'cdn').length, 2)
  }
  {
    eq('A15 解析 127.0.0.1:7897', B.parseProxyEndpoint('127.0.0.1:7897'), { host: '127.0.0.1', port: 7897 })
    eq('A16 直连 → null', B.parseProxyEndpoint('直连'), null)
    eq('A17 未知 → null', B.parseProxyEndpoint('未知'), null)
    eq('A18 空串 → null', B.parseProxyEndpoint(''), null)
    eq('A19 非法端口 99999 → null', B.parseProxyEndpoint('127.0.0.1:99999'), null)
  }
  {
    const noKey = { apiKeySet: false, steamIdSet: true, demoDataEnabled: true, autoSync: true, syncIntervalMin: 30, activeSource: 'demo' }
    ok('A20 网络正常但没填 Key → 有配置提示', typeof B.configWarning('ok', noKey) === 'string')
    const full = { ...noKey, apiKeySet: true, activeSource: 'api' }
    eq('A21 配置齐全 → 无提示', B.configWarning('ok', full), null)
    ok('A22 缺 SteamID → 有提示', typeof B.configWarning('ok', { ...full, steamIdSet: false }) === 'string')
  }

  console.log('\n=== B 数据包 ===')
  await B.initDatabase()
  {
    throws('B1 非 JSON → 抛错', () => B.parseDataPack('{not json'))
    throws('B2 format 不匹配 → 抛错', () => B.parseDataPack(JSON.stringify({ format: 'other', version: 1, data: {} })))
    throws('B3 版本高于支持 → 抛错', () => B.parseDataPack(JSON.stringify({ format: B.DATA_PACK_FORMAT, version: 999, data: {} })))
    throws('B4 data 非对象 → 抛错', () => B.parseDataPack(JSON.stringify({ format: B.DATA_PACK_FORMAT, version: 1, data: 5 })))
    throws('B5 表内容非数组 → 抛错', () => B.parseDataPack(JSON.stringify({ format: B.DATA_PACK_FORMAT, version: 1, data: { games: 'x' } })))
    throws('B6 数组里混入非对象 → 抛错', () => B.parseDataPack(JSON.stringify({ format: B.DATA_PACK_FORMAT, version: 1, data: { games: [{ app_id: 1 }, 7] } })))
    eq('B7 合法空包 → totalRows=0', B.parseDataPack(JSON.stringify({ format: B.DATA_PACK_FORMAT, version: 1, data: {} })).totalRows, 0)
    eq('B8 当前格式版本为 1', B.DATA_PACK_VERSION, 1)
  }
  {
    // 真实库往返：写入几行 → build → parse → 覆盖导入 → 行数一致
    insertGame(900001, '探针游戏A')
    insertGame(900002, '探针游戏B')
    const pack = B.buildDataPack()
    ok('B9 buildDataPack 含 games 表', Array.isArray(pack.data.games) && pack.data.games.length >= 2)
    eq('B10 counts.games 与实际行数一致', pack.counts.games, B.all('SELECT COUNT(*) AS c FROM games')[0].c)
    ok('B11 数据包不含 API Key 字段', !JSON.stringify(pack).includes('steamApiKey'))
    eq('B12 数据包 format 标识正确', pack.format, B.DATA_PACK_FORMAT)

    const round = B.parseDataPack(JSON.stringify(pack))
    ok('B13 往返解析成功', round.totalRows > 0)
    const summary = B.applyDataPack(round, 'replace')
    eq('B14 覆盖导入后 games 行数一致', summary.after.games, pack.counts.games)
    eq('B15 两行探针数据仍在库里', B.all('SELECT COUNT(*) AS c FROM games WHERE app_id IN (900001,900002)')[0].c, 2)
  }
  {
    // 防注入：伪造不存在的列名 → 应被白名单丢弃，而不是拼进 SQL
    const evil = {
      format: B.DATA_PACK_FORMAT, version: 1, schemaVersion: 2, exportedAt: '', appVersion: '', steamId: null,
      counts: {}, note: '',
      data: { games: [{ app_id: 900003, name: '带脏列的行', 'name); DROP TABLE games; --': 'x', totally_fake_col: 1 }] }
    }
    const parsed = B.parseDataPack(JSON.stringify(evil))
    let threw = false
    try { B.applyDataPack(parsed, 'merge') } catch { threw = true }
    ok('B16 含未知列的数据包不会抛错', !threw)
    const cols = B.all('PRAGMA table_info(games)').map((r) => r.name)
    ok('B17 伪造列未进入表结构', !cols.includes('totally_fake_col'))
    ok('B18 games 表未被注入破坏', B.all('SELECT COUNT(*) AS c FROM games')[0].c > 0)
    eq('B19 合法列仍写入', B.all('SELECT COUNT(*) AS c FROM games WHERE app_id = 900003')[0].c, 1)
    // 关键：只带 app_id/name 的行也必须能落库（NOT NULL 列补占位值），否则整包导入会失败
    const row = B.all('SELECT header_image, release_date, developer FROM games WHERE app_id = 900003')[0]
    eq('B20 缺失的 NOT NULL 列被补成空串而非报错', [row.header_image, row.release_date, row.developer], ['', '', ''])
  }
  {
    // 完全不认识的表 + 完全不认识的行 → 不计入、不报错
    const alien = {
      format: B.DATA_PACK_FORMAT, version: 1, schemaVersion: 2, exportedAt: '', appVersion: '', steamId: null,
      counts: {}, note: '', data: { not_a_table: [{ x: 1 }], games: [{ bogus: 1 }] }
    }
    const parsed = B.parseDataPack(JSON.stringify(alien))
    const before = B.all('SELECT COUNT(*) AS c FROM games')[0].c
    const s = B.applyDataPack(parsed, 'merge')
    eq('B21 陌生表被忽略且不报错', B.all('SELECT COUNT(*) AS c FROM games')[0].c, before)
    eq('B22 没有可识别列的行不写入', s.totalRows, 0)
  }

  console.log('\n=== C 价格阈值提醒 ===')
  {
    const baseSnap = { wishlist: [], discounts: [], games: [], achievements: [], huntNotifiedOn: null }
    const S = (o) => ({ notifyWishlistDrop: false, notifyHistoricalLow: false, notifyFreeGame: false, notifyAchievementHunt: false, priceAlerts: [], ...o })
    const alert = (o) => ({ appId: 570, thresholdCents: 3000, notifiedAt: null, notifiedPriceCents: null, ...o })
    // 价格来源之一：游戏库的 priceCents
    const g = (appId, priceCents) => ({ appId, name: `Game ${appId}`, priceCents, achievementsTotal: 0, achievementsUnlocked: 0 })
    // 价格来源之二：折扣条目（每次同步都刷新）
    const disc = (appId, finalPriceCents) => ({ appId, category: 'hot', name: `Game ${appId}`, isHistoricalLow: false, finalPriceCents, originalPriceCents: 5000, notifiedAt: null })

    const v1 = B.planNotifications({ ...baseSnap, games: [g(570, 2500)] }, S({ priceAlerts: [alert()] }), new Set())
    eq('C1 现价 25.00 < 阈值 30.00 → 弹 1 条', v1.length, 1)
    eq('C2 标题为「达到你的心理价」', v1[0].title, '达到你的心理价')
    ok('C3 正文含现价与所设阈值', v1[0].body.includes('¥25.00') && v1[0].body.includes('¥30.00'), v1[0].body)
    eq('C4 带回需要落库的价格去重目标', v1[0].alertTargets, [{ appId: 570, priceCents: 2500 }])

    eq('C5 同价已提醒过 → 不弹', B.planNotifications({ ...baseSnap, games: [g(570, 2500)] }, S({ priceAlerts: [alert({ notifiedPriceCents: 2500 })] }), new Set()).length, 0)
    eq('C6 价格再降（曾报过 32.00）→ 再弹', B.planNotifications({ ...baseSnap, games: [g(570, 2500)] }, S({ priceAlerts: [alert({ notifiedPriceCents: 3200 })] }), new Set()).length, 1)
    eq('C7 现价 45.00 > 阈值 30.00 → 不弹', B.planNotifications({ ...baseSnap, games: [g(570, 4500)] }, S({ priceAlerts: [alert()] }), new Set()).length, 0)
    eq('C8 未设阈值 → 不弹', B.planNotifications({ ...baseSnap, games: [g(570, 2500)] }, S({}), new Set()).length, 0)
    eq('C9 该游戏无价格数据 → 不弹', B.planNotifications({ ...baseSnap, games: [g(999, -1)] }, S({ priceAlerts: [alert()] }), new Set()).length, 0)
    // 折扣来源优先级：库价高于阈值，但折扣价低于阈值 → 仍应触发
    eq('C10 折扣价覆盖库价（来源优先级）', B.planNotifications({ ...baseSnap, games: [g(570, 4500)], discounts: [disc(570, 2500)] }, S({ priceAlerts: [alert()] }), new Set()).length, 1)
    // seen 兜底：同价在本次运行内已弹过
    eq('C11 seen 已含该价格 → 不弹', B.planNotifications({ ...baseSnap, games: [g(570, 2500)] }, S({ priceAlerts: [alert()] }), new Set(['alert:570:2500'])).length, 0)
  }

  console.log('\n=== D 成就追猎通知 ===')
  {
    const baseSnap = { wishlist: [], discounts: [], games: [], achievements: [], huntNotifiedOn: null }
    const S = (o) => ({ notifyWishlistDrop: false, notifyHistoricalLow: false, notifyFreeGame: false, notifyAchievementHunt: true, priceAlerts: [], ...o })
    const rar = (appId, unlocked) => ({ appId, apiName: `ACH_${appId}`, displayName: '稀有成就', unlocked, isRare: true })
    // 完成度 5/10 = 50%，用于验证「最近的那个」文案
    const huntSnap = (o) => ({
      ...baseSnap,
      games: [{ appId: 570, name: 'Dota 2', priceCents: -1, achievementsTotal: 10, achievementsUnlocked: 5 }],
      achievements: [rar(570, false), rar(570, false), rar(570, false)],
      ...o
    })

    const v1 = B.planNotifications(huntSnap(), S({}), new Set())
    eq('D1 有稀有未解锁 + 今日未提醒 → 弹 1 条', v1.length, 1)
    eq('D2 标记需要写入「今日已提醒」', v1[0].markHuntNotified, true)
    eq('D3 路由指向 hunt 页', v1[0].route, 'hunt')
    eq('D4 标题为「稀有成就追猎」', v1[0].title, '稀有成就追猎')
    ok('D5 正文含未解锁总数', v1[0].body.includes('3 个'), v1[0].body)
    ok('D6 正文点出「最近的那个」还差几个', v1[0].body.includes('还差 3 个'), v1[0].body)

    eq('D7 今日已提醒过 → 不弹', B.planNotifications(huntSnap({ huntNotifiedOn: TODAY }), S({}), new Set()).length, 0)
    eq('D8 开关关闭 → 不弹', B.planNotifications(huntSnap(), S({ notifyAchievementHunt: false }), new Set()).length, 0)
    eq('D9 没有稀有未解锁 → 不弹', B.planNotifications({ ...huntSnap(), achievements: [rar(570, true)] }, S({}), new Set()).length, 0)
    eq('D10 稀有但已解锁 → 不算未解锁', B.planNotifications({ ...huntSnap(), achievements: [{ appId: 570, apiName: 'A', displayName: 'x', unlocked: true, isRare: true }] }, S({}), new Set()).length, 0)
    // 非稀有未解锁不参与追猎
    eq('D11 非稀有未解锁不计入', B.planNotifications({ ...huntSnap(), achievements: [{ appId: 570, apiName: 'A', displayName: 'x', unlocked: false, isRare: false }] }, S({}), new Set()).length, 0)
  }

  console.log('\n=== E 设置归一化 ===')
  {
    eq('E1 空对象 → priceAlerts 为空数组', B.normalizeSettings({}).priceAlerts, [])
    eq('E2 priceAlerts=null → 归一成空数组（不抛错）', B.normalizeSettings({ priceAlerts: null }).priceAlerts, [])
    eq('E3 priceAlerts=字符串 → 归一成空数组', B.normalizeSettings({ priceAlerts: 'oops' }).priceAlerts, [])

    const mixed = B.normalizeSettings({
      priceAlerts: [
        { appId: 570, thresholdCents: 3000 },
        { appId: -1, thresholdCents: 100 },
        { appId: 1.5, thresholdCents: 100 },
        { appId: 100, thresholdCents: 'abc' },
        { appId: 200, thresholdCents: -5 },
        null
      ]
    })
    eq('E4 脏条目被过滤，只剩 1 条合法', mixed.priceAlerts.length, 1)
    eq('E5 合法条目保留原值且补全去重字段', mixed.priceAlerts[0], { appId: 570, thresholdCents: 3000, notifiedAt: null, notifiedPriceCents: null })

    eq('E6 非法间隔 99 → 回退默认 30', B.normalizeSettings({ syncIntervalMin: 99 }).syncIntervalMin, 30)
    eq('E7 合法间隔 15 保留', B.normalizeSettings({ syncIntervalMin: 15 }).syncIntervalMin, 15)
    eq('E8 非法国家码 CHN → 回退 CN', B.normalizeSettings({ countryCode: 'CHN' }).countryCode, 'CN')
    eq('E9 合法国家码 us → 保留 us', B.normalizeSettings({ countryCode: 'us' }).countryCode, 'us')
    eq('E10 归一化后 priceAlerts 一定是数组（下游 .length 安全）', Array.isArray(B.normalizeSettings({ priceAlerts: 123 }).priceAlerts), true)
  }

  console.log('\n=== F 日志落盘 ===')
  {
    B.initLogger()
    B.logInfo('probe', '自检写入的一行', { n: 1 })
    B.logError('probe', '错误行', { detail: 'x\ny' })
    B.flushLogs()
    const f = B.currentLogFile()
    ok('F1 日志文件已生成', fs.existsSync(f), f)
    const tail = B.readLogTail(50)
    ok('F2 能读回日志行', tail.length >= 2, `tail=${tail.length}`)
    ok('F3 INFO 行内容正确', tail.some((l) => l.includes('[INFO ]') && l.includes('自检写入的一行')), JSON.stringify(tail.slice(-3)))
    ok('F4 ERROR 行存在且换行被压平', tail.some((l) => l.includes('[ERROR]') && l.includes('detail=x y')), JSON.stringify(tail.slice(-3)))
    ok('F5 清单含当日文件且字节数>0', B.listLogFiles().some((x) => x.name === path.basename(f) && x.bytes > 0), JSON.stringify(B.listLogFiles()))
    ok('F6 日志目录落在临时 userData 下（未污染真实库）', B.logsDir().startsWith(TMP), B.logsDir())
  }

  console.log('\n=== G 库价值口径（N1-1）===')
  {
    // 关键口径：现价 5000 分 / 原价 10000 分 = 50 元 / 100 元，玩了 300 分钟（5 小时）
    const g = (appId, priceCents, originalPriceCents, minutes) =>
      mkGame({ appId, priceCents, originalPriceCents, playtimeForeverMin: minutes })
    const v = B.libraryValue([
      g(1, 5000, 10000, 300),   // ¥50 原价 ¥100，玩了 5h → 0.1 h/元
      g(2, 0, 0, 600),          // 免费，玩了 10h
      g(3, -1, -1, 900)         // 价格未知，玩了 15h
    ])

    eq('G1 有标价的只数 1 款（免费与未知各自单独计数）', v.pricedCount, 1)
    eq('G2 免费 1 款', v.freeCount, 1)
    eq('G3 价格未知 1 款', v.unknownCount, 1)
    eq('G4 库价值不含免费/未知游戏', v.currentTotalCents, 5000)
    eq('G5 原价合计', v.originalTotalCents, 10000)
    eq('G6 加权折扣率 = 50%', Math.round(v.weightedDiscountPercent), 50)
    eq('G7 促销条目数 = 1', v.onSaleCount, 1)
    eq('G8 平均降幅 = 50%', Math.round(v.averageSaleDiscountPercent), 50)
    // 只累计「有标价」的游戏的时长：免费/未知的时长混进来会让 h/元 失去意义
    eq('G9 时长只累计有标价的游戏', v.totalMinutes, 300)
    ok('G10 性价比 ≈ 0.1 h/元', Math.abs(v.hoursPerYuanCurrent - 0.1) < 1e-9, String(v.hoursPerYuanCurrent))
    ok('G11 按原价算的性价比是按现价的一半', Math.abs(v.hoursPerYuanOriginal - 0.05) < 1e-9, String(v.hoursPerYuanOriginal))
    eq('G12 已玩过的款数（含免费与未知）', v.playedCount, 3)

    // 沉没成本：有标价 + 时长为 0 才入选；免费领来没玩的不算
    const v2 = B.libraryValue([
      g(11, 10800, 10800, 0),  // ¥108 没玩
      g(12, 5000, 5000, 0),    // ¥50 没玩
      g(13, 0, 0, 0),          // 免费没玩 → 不该入选
      g(14, 7000, 7000, 120)   // 玩过 → 不该入选
    ])
    eq('G13 沉没成本只含有标价且没玩的', v2.sunkCost.map((r) => r.game.appId), [11, 12])
    eq('G14 沉没成本按现价从高到低', v2.sunkCost[0].game.appId, 11)
    eq('G15 沉没成本合计', v2.sunkCostTotalCents, 15800)

    // ⚠️ 这是这次自检揪出的真缺陷：清单被截断后，合计仍按全量计算，
    //    界面上「这些游戏合计 ¥X」就会变成一个看着确定、实则对不上的数字。
    const many = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => g(100 + i, 1000, 1000, 0))
    const v3 = B.libraryValue(many, { sunkLimit: 3 })
    eq('G16 清单被截断到 sunkLimit', v3.sunkCost.length, 3)
    eq('G17 合计只统计已列出的那几行（=3×¥10，不是 10×¥10）', v3.sunkCostTotalCents, 3000)
    eq('G18 全库沉没款数另给（用于「还有 N 款」文案）', v3.sunkCostAllCount, 10)
    eq('G19 全库沉没合计另给', v3.sunkCostAllTotalCents, 10000)

    // 原价缺失（0 或 -1）不能当成「原价 0」而算出假折扣
    const v4 = B.libraryValue([g(21, 5000, -1, 0)])
    eq('G20 原价未知时退化为现价，折扣率 0%（不是假的 100%）', Math.round(v4.weightedDiscountPercent), 0)
    eq('G21 原价未知时不计为促销', v4.onSaleCount, 0)

    // 空输入不应抛错
    const v5 = B.libraryValue([])
    eq('G22 空库不抛错且金额归零', [v5.currentTotalCents, v5.hoursPerYuanCurrent], [0, 0])
  }

  console.log('\n=== H 最稀有成就榜 / IPC 瘦身（N1-3 / Tier3）===')
  {
    const gs = [mkGame({ appId: 570, name: 'Dota 2' }), mkGame({ appId: 730, name: 'CS2' })]
    const ach = (appId, apiName, unlocked, globalPercent, unlockedAt) =>
      mkAchievement({ appId, apiName, unlocked, globalPercent, unlockedAt })

    const r = B.rarestUnlocked(
      [
        ach(570, 'a1', true, 30, 100),
        ach(570, 'a2', true, 1.2, 200),
        ach(730, 'a3', true, 0.4, 300),
        ach(730, 'a4', false, 0.1, null),   // 未解锁 → 不入榜
        ach(730, 'a5', true, 0, 400)        // 占比未知 → 不能当成 0%（最稀有）
      ],
      gs,
      3
    )
    eq('H1 只取已解锁且有占比的', r.map((x) => x.apiName), ['a3', 'a2', 'a1'])
    eq('H2 按稀有度升序（0.4% 在最前）', r[0].globalPercent, 0.4)
    ok('H3 带上了游戏名（榜里要显示是哪款游戏）', r[0].gameName === 'CS2', r[0].gameName)

    // 占比未知的成就不能冒充「0% 玩家拥有」—— 它根本没有稀有度可比，因此整条排除
    const r2 = B.rarestUnlocked([ach(570, 'x', true, 0, 1), ach(570, 'y', true, 5, 2)], gs, 5)
    eq('H4 占比未知的不入榜（不能冒充 0%），只保留已知的', r2.map((x) => x.apiName), ['y'])

    // IPC 瘦身：图标地址只带文件名
    const full = mkAchievement({ appId: 570, apiName: 'k', iconUrl: `${B.ACHIEVEMENT_ICON_BASE}570/abc123.jpg`, iconGrayUrl: `${B.ACHIEVEMENT_ICON_BASE}570/abc123_gray.jpg` })
    const snap = B.toSnapshotAchievement(full)
    ok('H5 紧凑形态不再带 iconUrl/iconGrayUrl', snap.iconUrl === undefined && snap.iconGrayUrl === undefined)
    eq('H6 文件名已去掉公共前缀', snap.iconFile, 'abc123.jpg')
    const back = B.expandAchievement(snap)
    eq('H7 展开后与原始 URL 完全一致（无损）', [back.iconUrl, back.iconGrayUrl], [full.iconUrl, full.iconGrayUrl])
    ok('H8 确实省下了字符', B.achievementSavings(full) > 0, String(B.achievementSavings(full)))
    // 换了 CDN 域名的地址必须原样保留，不能被路径裁剪吞掉
    const other = B.expandAchievement(B.toSnapshotAchievement(mkAchievement({ appId: 570, iconUrl: 'https://cdn.other.com/x.jpg', iconGrayUrl: 'https://cdn.other.com/x_g.jpg' })))
    eq('H9 非 Steam CDN 的图标地址原样保留', other.iconUrl, 'https://cdn.other.com/x.jpg')

    // ⚠️ 库里真实存的是老域名 steamcdn-a.akamaihd.net（4536/4536 条），与 ACHIEVEMENT_ICON_BASE 一条都不匹配。
    //    按固定前缀裁剪会一条都裁不掉（省 0 字节）；必须按路径形态裁。
    const AK = 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/240/'
    const real = mkAchievement({ appId: 240, iconUrl: `${AK}4711.jpg`, iconGrayUrl: `${AK}94f7.jpg` })
    const realSnap = B.toSnapshotAchievement(real)
    eq('H10 真实库里的老域名也能裁出文件名', [realSnap.iconFile, realSnap.iconGrayFile], ['4711.jpg', '94f7.jpg'])
    const realBack = B.expandAchievement(realSnap)
    ok('H11 展开后指向实测可用的 CDN（cloudflare，实测 200）', realBack.iconUrl.startsWith(B.ACHIEVEMENT_ICON_BASE), realBack.iconUrl)
    ok('H12 老域名确实被换掉了（它在实测环境连不上）', !realBack.iconUrl.includes('akamaihd'), realBack.iconUrl)
    eq('H13 重建地址里 appId 只出现一次（早期实现会拼成 570/570/）', (realBack.iconUrl.match(/\/240\//g) || []).length, 1)
    ok('H14 真实数据确实能省下字符（不是 0）', B.achievementSavings(real) > 100, String(B.achievementSavings(real)))
    eq('H15 空图标地址不炸且原样返回', B.expandAchievement(B.toSnapshotAchievement(mkAchievement({ iconUrl: '', iconGrayUrl: '' }))).iconUrl, '')
  }

  console.log('\n=== I 采样保留策略（N0-1）===')
  {
    B.initDatabase()
    const day = 86400
    const now = 2_000_000_000
    B.run('DELETE FROM price_history')
    B.run('DELETE FROM snapshots')
    // app 1：90 天内每天 2 笔（应全留）+ 90 天前每天 4 笔（应降为每天 1 笔收盘 + 史低）
    for (let d = 0; d < 120; d++) {
      const base = now - d * day
      const perDay = d < B.SAMPLE_KEEP_DAYS ? 2 : 4
      for (let k = 0; k < perDay; k++) {
        B.run('INSERT INTO price_history (app_id, price_cents, captured_at) VALUES ($a, $p, $c)', {
          a: 1, p: 5000 + k * 100, c: base + k * 60
        })
      }
      // 120 天前的第 2 天埋一个明显的最低点，用来验证「史低那一笔不会被降采样删掉」
      if (d === 119) B.run('INSERT INTO price_history (app_id, price_cents, captured_at) VALUES (1, 100, $c)', { c: base + 30 })
      B.run('INSERT INTO snapshots (app_id, playtime_minutes, captured_at) VALUES ($a, $m, $c)', { a: d % 3, m: d * 10, c: base })
    }
    const beforeP = Number(B.get('SELECT COUNT(*) AS c FROM price_history').c)
    const beforeS = Number(B.get('SELECT COUNT(*) AS c FROM snapshots').c)
    const cutoff = now - B.SAMPLE_KEEP_DAYS * day
    // 保留窗口内的行数，清理前后比对 —— 比"算出一个预期常数"稳，不受边界日 inclusive 影响
    const withinBefore = Number(B.get('SELECT COUNT(*) AS c FROM price_history WHERE captured_at >= $cut', { cut: cutoff }).c)
    const pruned = B.pruneSamples(now)
    const afterP = Number(B.get('SELECT COUNT(*) AS c FROM price_history').c)
    const afterS = Number(B.get('SELECT COUNT(*) AS c FROM snapshots').c)
    const withinAfter = Number(B.get('SELECT COUNT(*) AS c FROM price_history WHERE captured_at >= $cut', { cut: cutoff }).c)

    ok('I1 price_history 确实被瘦身', pruned.priceHistory > 0 && afterP < beforeP, `before=${beforeP} after=${afterP}`)
    ok('I2 snapshots 确实被瘦身', pruned.snapshots > 0 && afterS < beforeS, `before=${beforeS} after=${afterS}`)

    // 90 天内必须一行不删 —— 这是 isHistoricalLow 判定精度的保证
    ok('I3 保留窗口内的采样一行未删', withinBefore > 0 && withinAfter === withinBefore, `before=${withinBefore} after=${withinAfter}`)
    ok('I3b 窗口外的旧采样确实被降采样', afterP - withinAfter < beforeP - withinBefore, `outside before=${beforeP - withinBefore} after=${afterP - withinAfter}`)

    // 史低那一笔必须活下来，否则史低判定会因清理而失真
    const lowest = B.get('SELECT MIN(price_cents) AS m FROM price_history WHERE app_id = 1')
    eq('I4 历史最低价被保留下来（史低判定不失真）', Number(lowest.m), 100)

    // 每款游戏只留最近 2 条快照
    const perApp = B.all('SELECT app_id AS a, COUNT(*) AS c FROM snapshots GROUP BY app_id')
    ok('I5 每款游戏最多只留 2 条快照', perApp.every((r) => Number(r.c) <= B.SNAPSHOT_KEEP_ROWS), JSON.stringify(perApp))

    // 幂等：再跑一次不应继续删
    const again = B.pruneSamples(now)
    eq('I6 保留策略幂等（再跑一次不删任何行）', [again.priceHistory, again.snapshots], [0, 0])
  }

  console.log('\n=== J 笔记 / 追猎清单 / 换账号（新表项 + Tier3）===')
  {
    // 笔记：写 → 读回 → 清空
    const n1 = B.saveNote(570, { rating: 4, note: '通关三次' })
    ok('J1 保存笔记返回内容', n1 && n1.rating === 4 && n1.note === '通关三次', JSON.stringify(n1))
    ok('J2 笔记出现在列表里', B.listNotes().some((n) => n.appId === 570))
    const n2 = B.saveNote(570, { note: '改一下' })
    eq('J3 部分更新时未传的字段保留', n2.rating, 4)
    eq('J4 传入的字段被更新', n2.note, '改一下')
    eq('J5 评分被夹到 0-5', B.saveNote(570, { rating: 99 }).rating, 5)
    const long = B.saveNote(570, { note: 'x'.repeat(5000) })
    eq('J6 笔记长度被截断到上限', long.note.length, B.NOTE_MAX_LEN)
    B.clearNote(570)
    eq('J7 清空后列表里不再有它', B.listNotes().filter((n) => n.appId === 570).length, 0)
    eq('J8 两个字段都为空时不留空行（返回 null）', B.saveNote(571, { rating: 0, note: '' }), null)
    eq('J9 非法 appId 拒绝写入', B.saveNote(0, { rating: 3 }), null)

    // 追猎清单
    B.togglePick(570, 'ach_a', true)
    ok('J10 加入清单', B.listPicks().some((p) => p.appId === 570 && p.apiName === 'ach_a'))
    B.togglePick(570, 'ach_a', true)
    eq('J11 重复加入不产生重复行', B.listPicks().filter((p) => p.appId === 570 && p.apiName === 'ach_a').length, 1)
    B.togglePick(570, 'ach_a', false)
    eq('J12 移出清单', B.listPicks().filter((p) => p.appId === 570 && p.apiName === 'ach_a').length, 0)
    eq('J13 pickKey 与表主键同构', B.pickKey(570, 'ach_a'), '570:ach_a')

    // 已解锁的追猎条目必须被清掉 —— 否则清单计数会高于列表实际显示条数，用户无法解释
    B.run('DELETE FROM hunt_picks')
    B.run('DELETE FROM achievements')
    B.run('DELETE FROM games')
    insertGame(570, 'Dota 2')
    B.run(`INSERT OR REPLACE INTO achievements (app_id, api_name, display_name, description, icon_url, icon_gray_url, unlocked, unlocked_at, global_percent, is_rare, hidden)
           VALUES (570, 'got_it', '已解锁', '', '', '', 1, 100, 1.0, 1, 0)`)
    B.run(`INSERT OR REPLACE INTO achievements (app_id, api_name, display_name, description, icon_url, icon_gray_url, unlocked, unlocked_at, global_percent, is_rare, hidden)
           VALUES (570, 'not_yet', '未解锁', '', '', '', 0, NULL, 2.0, 1, 0)`)
    B.togglePick(570, 'got_it', true)
    B.togglePick(570, 'not_yet', true)
    eq('J14 清理前两条都在', B.listPicks().length, 2)
    const dropped = B.prunePickedUnlocked()
    eq('J15 只清掉已解锁的那一条', dropped, 1)
    eq('J16 未解锁的条目保留', B.listPicks().map((p) => p.apiName), ['not_yet'])

    // 换账号检测
    B.run('DELETE FROM games')
    insertGame(1, 'a'); insertGame(2, 'b')
    B.stampGameOwners('76561190000000001')
    eq('J17 同账号不报换账号', B.detectAccountSwitch('76561190000000001'), null)
    const sw = B.detectAccountSwitch('76561190000000002')
    ok('J18 换账号能检测出来', sw !== null, JSON.stringify(sw))
    eq('J19 报出上一个账号与它的游戏数', [sw && sw.previousSteamId, sw && sw.previousGames], ['76561190000000001', 2])
    eq('J20 未打过标记的库不算换账号', (B.run('UPDATE games SET steam_id = \'\''), B.detectAccountSwitch('76561190000000003')), null)

    // 迁移版本号必须覆盖到当前 schema
    ok('J21 SCHEMA_VERSION 有对应迁移（或版本为初始）', B.SCHEMA_VERSION >= 1 && typeof B.MIGRATIONS === 'object')
    ok('J22 每个 >0 的版本号都有迁移语句', Array.from({ length: B.SCHEMA_VERSION }, (_, i) => i + 1).every((v) => v === 1 ? true : typeof B.MIGRATIONS[v] === 'string'), JSON.stringify(B.MIGRATIONS))
  }

  console.log('\n=== K 回归：命名参数绑定（静默失败类）===')
  {
    const SID_K = '76561190000000570'
    // 这类 bug 的特征是「不抛错、不报错，只是永远查不到」—— 只有真的比对返回值才抓得到。
    B.run('DELETE FROM snapshots')
    B.run('DELETE FROM price_history')
    B.saveSnapshot(570, 1000, 100, SID_K)
    B.saveSnapshot(570, 2000, 250, SID_K)

    eq('K1 lastSnapshot 取到最近一次快照（曾因参数名笔误恒为 null）', B.lastSnapshot(570, SID_K), 250)
    eq('K2 不存在的游戏返回 null 而不是 0', B.lastSnapshot(999999, SID_K), null)

    B.run('INSERT INTO price_history (app_id, captured_at, price_cents) VALUES (570, 1000, 5000)')
    B.run('INSERT INTO price_history (app_id, captured_at, price_cents) VALUES (570, 2000, 3000)')
    B.run('INSERT INTO price_history (app_id, captured_at, price_cents) VALUES (570, 3000, 8000)')
    eq('K3 priceLowest 取到历史最低价（曾因参数名笔误恒为 null）', B.priceLowest(570), 3000)
    eq('K4 无价格记录时返回 null', B.priceLowest(999999), null)

    // 差分链路：有了上一次快照，才可能算出「这次玩了多久」
    const prev = B.lastSnapshot(570, SID_K)
    ok('K5 差分基线可用（旧实现拿不到它 → play_sessions 永远为 0）', prev !== null && prev === 250)
  }

  console.log('\n=== L ROADMAP-V3 回归 ===')
  {
    // BUG-9：reports 表从建库起从无人写入，v4 迁移已 DROP 掉
    eq('L1 SCHEMA_VERSION 已升到 7（V5 snapshots.steam_id 迁移）', B.SCHEMA_VERSION, 7)
    ok('L2 v4 迁移会 DROP reports 表', typeof B.MIGRATIONS[4] === 'string' && B.MIGRATIONS[4].toUpperCase().includes('DROP TABLE IF EXISTS REPORTS'), B.MIGRATIONS[4])
    ok('L3 v5 迁移给用户表加等级/徽章列', typeof B.MIGRATIONS[5] === 'string' && ['level', 'badge_count', 'xp_to_next'].every((c) => B.MIGRATIONS[5].includes(c)), B.MIGRATIONS[5])
    // 实时库里确实没有 reports 表（建库即应用 v4 迁移）
    eq('L4 实时库不存在 reports 表', B.all("SELECT name FROM sqlite_master WHERE type='table' AND name='reports'").length, 0)
    // users 表确实多了 5 个列（F-6 数据落地）
    const userCols = B.all('PRAGMA table_info(users)').map((r) => r.name)
    ok('L5 users 表含等级/徽章 5 列', ['level', 'badge_count', 'badge_xp', 'player_xp', 'xp_to_next'].every((c) => userCols.includes(c)), JSON.stringify(userCols))
  }

  console.log('\n=== L2 priceTrend（F-5 降价趋势）===')
  {
    // 采样点不足 2 个 → null（一次采样推不出「多久降一次」）
    eq('L6 单点 → null', B.priceTrend([{ capturedAt: 1000, priceCents: 5000, discountPercent: 0 }]), null)
    const pts = [
      { capturedAt: 1000, priceCents: 8000, discountPercent: 0 },   // 上市原价
      { capturedAt: 2000, priceCents: 5600, discountPercent: 30 },  // 打 7 折
      { capturedAt: 3000, priceCents: 4200, discountPercent: 47 },  // 打 5.3 折
      { capturedAt: 4000, priceCents: 4200, discountPercent: 47 },  // 延续打折
      { capturedAt: 5000, priceCents: 5800, discountPercent: 0 }    // 回原价
    ]
    const t = B.priceTrend(pts, 90, 5000)
    ok('L7 足够采样点 → 有结构', t !== null)
    if (t) {
      eq('L8 最低到手价取最小', t.lowestCents, 4200)
      eq('L9 当前价取最后一次采样', t.currentCents, 5800)
      eq('L10 距最低价差额 = 当前 - 最低', t.gapToLowestCents, 1600)
      ok('L11 出现过至少一段连续降价', t.discountRuns >= 1, String(t.discountRuns))
      ok('L12 平均折扣百分比 > 0', t.avgDiscountPercent > 0, String(t.avgDiscountPercent))
      ok('L13 打折天数占比在 0-100', t.discountDaysPercent >= 0 && t.discountDaysPercent <= 100, String(t.discountDaysPercent))
      eq('L14 windowDays 透传', t.windowDays, 90)
    }
    // 窗口外的老采样不计入（避免「一年前降过一次」污染当下判断）
    // now=1.7e9，90 天窗口起点 ≈ 1.692e9；A(1.6e9) 远在窗口外应被排除，B(1.699e9) 在窗口内。
    const old = B.priceTrend(
      [{ capturedAt: 1_600_000_000, priceCents: 1000, discountPercent: 80 },
       { capturedAt: 1_699_000_000, priceCents: 5000, discountPercent: 0 }],
      90, 1_700_000_000
    )
    eq('L15 窗口外采样被排除 → 只剩 1 个窗口内点 → null（不拿旧降价当结论）', old, null)
  }

  console.log('\n=== L3 手动补录校验（F-1）===')
  {
    insertGame(770, 'ManualTest')
    const sid = '76561190000000999'
    // 合法：今天玩 60 分钟 → ok
    const good = B.addManualSession(sid, { appId: 770, playDate: TODAY, minutes: 60 })
    ok('L16 合法补录 → ok', good.ok === true, JSON.stringify(good))
    if (good.ok) {
      const rows = B.listAppSessions(770)
      ok('L17 补录会话写入且 source=manual', rows.length === 1 && rows[0].source === 'manual', JSON.stringify(rows))
      // 删掉它（只允许删 manual）
      const rm = B.removeManualSession(good.id)
      eq('L18 删除手动会话 → removed=1', rm.removed, 1)
      eq('L19 删除后列表清空', B.listAppSessions(770).length, 0)
    }
    // 时长 0 越界 → 拒绝
    eq('L20 时长 < 下限 → 拒绝', B.addManualSession(sid, { appId: 770, playDate: TODAY, minutes: 0 }).ok, false)
    eq('L21 时长 > 上限 → 拒绝', B.addManualSession(sid, { appId: 770, playDate: TODAY, minutes: B.MANUAL_MAX_MINUTES + 1 }).ok, false)
    // 给未来补录 → 拒绝
    const future = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate() + 1)}`
    eq('L22 未来日期 → 拒绝', B.addManualSession(sid, { appId: 770, playDate: future, minutes: 30 }).ok, false)
    // 库里没有的游戏 → 拒绝（避免孤儿会话）
    eq('L23 非库内游戏 → 拒绝', B.addManualSession(sid, { appId: 999999, playDate: TODAY, minutes: 30 }).ok, false)
    // 常量边界
    eq('L24 MANUAL_MIN_MINUTES=1', B.MANUAL_MIN_MINUTES, 1)
    eq('L25 MANUAL_MAX_MINUTES=1440', B.MANUAL_MAX_MINUTES, 1440)
  }

  console.log('\n=== L4 备份保留策略（F-2）===')
  {
    const dir = B.backupsDir()
    fs.mkdirSync(dir, { recursive: true })
    // 造 5 个假备份
    for (let i = 0; i < 5; i++) fs.writeFileSync(path.join(dir, `${B.BACKUP_PREFIX}2026-0${i}-000${i}.json`), '{}')
    eq('L26 造了 5 个备份', B.backupStatus().files.length, 5)
    const removed = B.pruneBackupFiles(2)
    eq('L27 保留 2 份 → 删掉 3 份', removed, 3)
    eq('L28 删后只剩 2 份', B.backupStatus().files.length, 2)
    // 下限：keep=0 也至少留 1 份（不能把备份清空）
    const removed2 = B.pruneBackupFiles(0)
    eq('L29 keep 下限为 1（不清空备份）', removed2, 1)
    eq('L30 清到只剩 1 份', B.backupStatus().files.length, 1)
    // 清理测试残留
    for (const f of B.backupStatus().files) fs.unlinkSync(path.join(dir, f.name))
  }

  console.log('\n=== L5 HTTP 错误分类（BUG-5）===')
  {
    const e401 = new B.SteamHttpError(401, 'unauthorized', 'no key')
    ok('L31 SteamHttpError 是 Error 子类（可 try/catch）', e401 instanceof Error)
    eq('L32 401 → unauthorized', e401.kind, 'unauthorized')
    eq('L33 403 也归 unauthorized（立即失败不再重试）', new B.SteamHttpError(403, 'unauthorized', 'forbidden').kind, 'unauthorized')
    eq('L34 429 → rate_limited（长退避）', new B.SteamHttpError(429, 'rate_limited', 'slow down').kind, 'rate_limited')
    eq('L35 其它状态码 → http', new B.SteamHttpError(500, 'http', 'server').kind, 'http')
  }

  console.log('\n=== L6 成就抓取重试账本（BUG-4）===')
  {
    // planAchievementTargets：回填计数 + 圈定真正需要拉取的目标
    const games = [
      { appId: 1, name: 'played', priceCents: -1, achievementsTotal: 0, achievementsUnlocked: 0, rareAchievements: 0 },
      { appId: 2, name: 'stale', priceCents: -1, achievementsTotal: 0, achievementsUnlocked: 0, rareAchievements: 0 },
      { appId: 3, name: 'never', priceCents: -1, achievementsTotal: 0, achievementsUnlocked: 0, rareAchievements: 0 },
      { appId: 4, name: 'retry', priceCents: -1, achievementsTotal: 0, achievementsUnlocked: 0, rareAchievements: 0 }
    ]
    const counts = new Map([[1, [10, 5, 2]], [2, [20, 10, 1]]]) // 1、2 已有计数；3 没有
    const played = new Set([1])
    const retry = new Set([4])
    const targets = B.planAchievementTargets(games, played, counts, retry)
    eq('L36 回填：玩过的游戏计数被写入', games[0].achievementsUnlocked, 5)
    // 目标 = 玩过的(1) + 库里还没有计数记录的(3) + 待重试的(4)；stale(2) 排除
    eq('L37 目标集合 = 玩过 ∪ 无计数 ∪ 待重试', targets.map((g) => g.appId).sort((a, b) => a - b), [1, 3, 4])
    // 上限常量
    ok('L38 重试上限常量存在且为 5', B.ACH_MAX_RETRY === 5)
    ok('L39 失败名单 meta key 存在', typeof B.ACH_FAILED_META_KEY === 'string' && B.ACH_FAILED_META_KEY.length > 0)
  }

  console.log('\n=== L7 数据库健康面板（F-3/O-1）===')
  {
    const h = B.getDatabaseHealth()
    ok('L40 返回 tables 数组', Array.isArray(h.tables) && h.tables.length > 0)
    ok('L41 growth.projectedYearBytes 是数字', typeof h.growth.projectedYearBytes === 'number')
    ok('L42 hasEnoughHistory 是布尔', typeof h.hasEnoughHistory === 'boolean')
    ok('L43 fileBytes 是数字', typeof h.fileBytes === 'number')
    // VACUUM：整理后文件不会变大（碎片回收），before/after 都是数字
    const v = B.vacuum()
    ok('L44 VACUUM 返回 before/after 数字', typeof v.before === 'number' && typeof v.after === 'number')
    ok('L45 VACUUM 后文件未变大', v.after <= v.before, `before=${v.before} after=${v.after}`)
  }

  console.log('\n=== M ROADMAP-V4（F4 备注增强 / O6 仪表盘布局 / F6 封面 URL 换算）===')
  {
    // ---- F4：笔记的状态与标签 ----
    ok('M1 SCHEMA_VERSION = 7（v6 笔记列 + v7 快照账号列迁移就位）', B.SCHEMA_VERSION === 7, String(B.SCHEMA_VERSION))
    ok('M2 v6 迁移给 game_notes 加 status/tags 列', typeof B.MIGRATIONS[6] === 'string' && ['status', 'tags'].every((c) => B.MIGRATIONS[6].includes(c)), B.MIGRATIONS[6])
    const n1 = B.saveNote(9001, { rating: 3, note: '吃灰中', status: 'abandoned', tags: ['肉鸽', '困难', '肉鸽'] })
    ok('M3 status/tags 写入并读回（tags 原样数组）', !!n1 && n1.status === 'abandoned' && Array.isArray(n1.tags) && n1.tags.join(',') === '肉鸽,困难,肉鸽', JSON.stringify(n1))
    const n2 = B.saveNote(9001, { status: 'playing' })
    ok('M4 部分更新：只改 status，rating/note/tags 保留', !!n2 && n2.rating === 3 && n2.note === '吃灰中' && n2.status === 'playing' && n2.tags.length === 3, JSON.stringify(n2))
    const n3 = B.saveNote(9001, { tags: [] })
    ok('M5 清空 tags（其余保留）不删行', !!n3 && n3.rating === 3 && n3.status === 'playing' && n3.tags.length === 0, JSON.stringify(n3))
    B.saveNote(9001, { tags: ['x', 'y'] })
    const gone = B.saveNote(9001, { rating: 0, note: '', status: '', tags: [] })
    eq('M6 四字段全空 → 删行（返回 null 且列表无此行）', [gone === null, B.listNotes().some((n) => n.appId === 9001)], [true, false])
    // ---- O6：仪表盘区块布局 ----
    const defaults = B.DASHBOARD_CARDS.map((c) => c.key)
    eq('M7 默认全部可见且顺序 = 定义顺序', B.visibleCards({ order: defaults, hidden: [] }), defaults)
    eq('M8 隐藏区块不再出现在渲染序列里', B.visibleCards({ order: defaults, hidden: ['today'] }), defaults.filter((k) => k !== 'today'))
    const reordered = ['recent', 'stats', 'today', 'chart-week', 'chart-trend']
    eq('M9 用户调序生效', B.visibleCards({ order: reordered, hidden: [] }), reordered)
    eq('M10 未知 key 被丢弃 + 新增卡片补到末尾', B.visibleCards({ order: ['recent', 'unknown', 'stats'], hidden: [] }), ['recent', 'stats', 'today', 'chart-week', 'chart-trend'])
    eq('M11 隐藏全部 → 渲染序列为空（UI 层另有拦截）', B.visibleCards({ order: defaults, hidden: defaults }), [])
    // ---- F6：封面 URL 换算 ----
    const cdn = 'https://cdn.cloudflare.steamstatic.com/steam/apps/3220060/header.jpg'
    const mapped = B.toCoverCacheUrl(cdn)
    ok('M12 封面 URL 换成 si-cover 协议且 appid 入路径', mapped.startsWith('si-cover://cover/3220060.jpg?u='), `got ${mapped}`)
    ok('M13 原始 URL 被完整编码在 u 参数里', decodeURIComponent(mapped.split('u=')[1] ?? '') === cdn)
    eq('M14 非封面形态（成就图标）原样放行', B.toCoverCacheUrl('https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/570/abc.jpg'), 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/570/abc.jpg')
  }

  console.log('\n=== N V5 优化（snapshots.steam_id 账号隔离 / 封面缓存清理）===')
  {
    // ---- 优化 1：snapshots 补 steam_id ----
    ok('N1 SCHEMA_VERSION = 7（snapshots 加 steam_id）', B.SCHEMA_VERSION === 7, String(B.SCHEMA_VERSION))
    ok('N2 v7 迁移给 snapshots 加 steam_id 列', typeof B.MIGRATIONS[7] === 'string' && B.MIGRATIONS[7].includes('snapshots') && B.MIGRATIONS[7].includes('steam_id'), B.MIGRATIONS[7])
    // DDL 防线（V4 BUG-V4-1 的教训：迁移器防老库缺列，DDL 防新库缺列 —— 新库直接置最新版本号跳过迁移）
    const snapCols = B.all('PRAGMA table_info(snapshots)').map((r) => r.name)
    ok('N3 实时库（新库直建 v7）snapshots 已含 steam_id 列', snapCols.includes('steam_id'), JSON.stringify(snapCols))

    B.run('DELETE FROM snapshots')
    const SID_A = '76561190000000001'
    const SID_B = '76561190000000002'
    B.saveSnapshot(8801, 1000, 100, SID_A)
    B.saveSnapshot(8801, 2000, 250, SID_A)
    B.saveSnapshot(8801, 3000, 9900, SID_B) // 换账号且策略为 keep 时可能残留的旧账号行
    eq('N4 差分基准只读当前账号的行', B.lastSnapshot(8801, SID_A), 250)
    eq('N5 其它账号的行互不干扰', B.lastSnapshot(8801, SID_B), 9900)
    // 空串 = v7 之前写入的历史行：升级后没有带账号的新行时用它兜底，不丢差分（与 sessions 读取口径一致）
    B.run(`INSERT INTO snapshots (app_id, captured_at, playtime_minutes, steam_id) VALUES (8802, 1000, 500, '')`)
    eq('N6 历史空串行对任意账号可见（升级兼容）', B.lastSnapshot(8802, SID_A), 500)

    // 换账号清理：从「整表 DELETE」升级为按账号精确删；空串行必属旧账号，一并删除
    B.run('DELETE FROM play_sessions')
    B.run(`INSERT INTO play_sessions (steam_id, app_id, play_date, minutes, started_at, ended_at, source) VALUES ($s, 8801, '2026-09-27', 10, 1, 2, 'api')`, { s: SID_B })
    B.run(`INSERT INTO play_sessions (steam_id, app_id, play_date, minutes, started_at, ended_at, source) VALUES ($s, 8801, '2026-09-27', 20, 1, 2, 'api')`, { s: SID_A })
    const purged = B.purgePreviousAccount(SID_A)
    eq('N7 purge 返回值：删 1 条旧会话 + 2 条快照（旧账号 1 条 + 空串 1 条）', [purged.sessions, purged.snapshots], [1, 2])
    eq('N8 当前账号的会话与快照完整保留',
      [B.get(`SELECT COUNT(*) AS c FROM play_sessions WHERE steam_id = $s`, { s: SID_A })?.c,
       B.get(`SELECT COUNT(*) AS c FROM snapshots WHERE steam_id = $s`, { s: SID_A })?.c].map(Number),
      [1, 2])
    eq('N9 旧账号与空串快照全部清掉',
      [B.get(`SELECT COUNT(*) AS c FROM snapshots WHERE steam_id = $s`, { s: SID_B })?.c,
       B.get(`SELECT COUNT(*) AS c FROM snapshots WHERE steam_id = ''`)?.c].map(Number),
      [0, 0])

    // ---- 优化 2：封面缓存统计与清理（探针 userData 指向临时目录，fs 操作真实可验证）----
    const coversDir = path.join(TMP, 'covers')
    fs.mkdirSync(coversDir, { recursive: true })
    fs.writeFileSync(path.join(coversDir, '570.jpg'), Buffer.alloc(2048, 1))
    fs.writeFileSync(path.join(coversDir, '770.jpg'), Buffer.alloc(1024, 1))
    const st0 = B.coverCacheStats()
    ok('N10 统计到 2 张缓存封面（共 3 KB）', st0.count === 2 && st0.totalBytes === 3072, JSON.stringify(st0))
    const cl = B.clearCoverCache()
    ok('N11 清理删除全部文件', cl.ok && cl.cleared === 2, JSON.stringify(cl))
    eq('N12 清理后统计归零', B.coverCacheStats().count, 0)
    // 目录不存在（从未缓存过）时统计与清理都不报错
    fs.rmSync(coversDir, { recursive: true, force: true })
    eq('N13 目录不存在 → 统计 0/0、清理安全', [B.coverCacheStats().count, B.coverCacheStats().totalBytes, B.clearCoverCache().ok], [0, 0, true])
  }

  console.log(`\n${fail === 0 ? 'ALL PASS' : 'HAS FAILURE'}  pass=${pass} fail=${fail}`)
  if (failures.length) console.log('失败项：\n  - ' + failures.join('\n  - '))
  console.log(`临时 userData: ${TMP}`)

  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch { /* 占用时忽略 */ }
  app.exit(fail === 0 ? 0 : 1)
}).catch((err) => {
  // 没有这一句，组内的异常会变成一个「输出停在某个标题下、什么都不说」的静默退出 ——
  // 排障时极易误判成"卡住了"。
  console.log('PROBE ERROR:', err && err.stack ? err.stack : String(err))
  console.log(`已执行 pass=${pass} fail=${fail}`)
  app.exit(1)
})
