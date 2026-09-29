/**
 * 端到端同步验证：在真实 Electron 里跑**项目自己的 sync.run({source:'api'})**，
 * 把真实 Steam 数据写进应用真实数据库（%APPDATA%\steam-insight\steam-insight.db）。
 *
 * 目的：确认本轮修复后的完整链路不报错，并把此前的坏数据（空开发商 / 空 release_date /
 * 空成就名 / 0 好评率）刷成真实值。写库前请先备份数据库文件。
 *
 * 跑法：
 *   1) node node_modules/esbuild/bin/esbuild tools/probe-data-audit/sync-entry.ts --bundle \
 *        --platform=node --format=cjs --external:electron --tsconfig=tsconfig.node.json \
 *        --outfile=tools/probe-data-audit/sync-bundle.cjs
 *   2) env -u ELECTRON_RUN_AS_NODE node_modules/electron/dist/electron.exe \
 *        tools/probe-data-audit/sync-run.cjs --no-sandbox
 */
const { app } = require('electron')

// 探针进程的 userData 默认指向 Electron 目录，必须指到应用真实目录
app.setPath('userData', 'C:\\Users\\25314\\AppData\\Roaming\\steam-insight')

const { sync, database } = require('./sync-bundle.cjs')

function line(tag, obj) { console.log('SYNC ' + tag + ' ' + JSON.stringify(obj)) }

app.whenReady().then(async () => {
  await database.initDatabase()
  line('db', { file: database.databaseFilePath() })

  sync.setSyncBroadcaster((p) => line('status', { phase: p.phase, message: p.message, progress: p.progress }))

  const t0 = Date.now()
  const r = await sync.run({ source: 'api' })
  line('result', { ok: r.ok, error: r.error || null, counts: r.counts || null, seconds: Math.round((Date.now() - t0) / 1000) })

  // 数据库关键字段的回读用独立 python 脚本做，避免探针里再塞一遍查询
  database.closeDatabase()
  app.exit(r.ok ? 0 : 1)
}).catch((e) => { line('FATAL', { err: String(e) }); app.exit(1) })
