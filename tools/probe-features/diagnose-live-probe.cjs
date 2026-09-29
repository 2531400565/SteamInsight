/**
 * 连通性自检的**端到端**验证：在真实 Electron 里调用 diagnoseNetwork()，走应用真实的传输层
 * （http.ts：优先 Electron net、回退 node:https）去打 5 个真实域名，把结论原样打印。
 *
 * 与 features-probe.cjs 的分工：
 *   - features-probe：喂固定输入验**判定函数**（确定性，可断言）
 *   - 本探针：不喂输入，打**真实网络**，验「整条链路真的能跑通并给出人话结论」
 * 两者都需要 —— 前者保证逻辑对，后者保证接线对。
 *
 * 用临时 userData，避免碰真实设置与日志。
 *
 * 跑法：
 *   node node_modules/esbuild/bin/esbuild tools/probe-features/features-entry.ts --bundle \
 *     --platform=node --format=cjs --external:electron --tsconfig=tsconfig.node.json \
 *     --outfile=tools/probe-features/features-bundle.cjs
 *   env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS node_modules/electron/dist/electron.exe \
 *     tools/probe-features/diagnose-live-probe.cjs --no-sandbox
 */
const { app } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const TMP = path.join(os.tmpdir(), `si-diag-${Date.now()}`)
fs.mkdirSync(TMP, { recursive: true })
app.setPath('userData', TMP)

const { diagnoseNetwork } = require('./features-bundle.cjs')

app.whenReady().then(async () => {
  console.log('=== 连通性自检：真实网络端到端 ===\n')
  const t0 = Date.now()
  const d = await diagnoseNetwork()
  const elapsed = Date.now() - t0

  console.log(`代理(实际生效) = ${d.proxy}`)
  console.log(`代理端口可达   = ${d.proxyReachable === null ? '不适用（直连）' : d.proxyReachable}`)
  console.log('')
  console.log('域名'.padEnd(34) + '分组'.padEnd(11) + '结果'.padEnd(7) + 'via'.padEnd(6) + '耗时'.padEnd(9) + '错误/状态')
  for (const c of d.checks) {
    const res = c.ok ? 'PASS' : 'FAIL'
    console.log(
      c.label.padEnd(34) +
        c.kind.padEnd(11) +
        res.padEnd(7) +
        String(c.via ?? '-').padEnd(6) +
        `${c.ms}ms`.padEnd(9) +
        (c.error ?? `HTTP ${c.status ?? '-'}`)
    )
  }
  console.log('')
  console.log(`结论等级 = ${d.level.toUpperCase()}   通过 ${d.okCount}/${d.total}   总耗时 ${elapsed}ms`)
  console.log(`标题     = ${d.title}`)
  console.log(`详情     = ${d.detail}`)
  if (d.actions.length) {
    console.log('处置建议：')
    for (const a of d.actions) console.log(`  - ${a}`)
  }
  console.log(`配置提示 = ${d.configWarning ?? '（无）'}`)
  console.log(`\n配置快照 = ${JSON.stringify(d.config)}`)

  // 结构性断言：不依赖网络通断，只保证「无论连通与否，结论都是完整的」
  let pass = 0
  let fail = 0
  const chk = (n, ok, detail) => {
    if (ok) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n}${detail ? '  → ' + detail : ''}`) }
  }
  console.log('\n--- 结构性断言 ---')
  chk('探测了 5 个域名', d.checks.length === 5, String(d.checks.length))
  chk('每条都有 label/kind/ok/ms', d.checks.every((c) => c.label && c.kind && typeof c.ok === 'boolean' && typeof c.ms === 'number'))
  chk('okCount 与实际一致', d.okCount === d.checks.filter((c) => c.ok).length)
  chk('总数为 5', d.total === 5)
  chk('等级取值合法', ['ok', 'warn', 'error'].includes(d.level), d.level)
  chk('标题非空', typeof d.title === 'string' && d.title.length > 0)
  chk('详情非空', typeof d.detail === 'string' && d.detail.length > 0)
  chk('ok 级不给建议 / 非 ok 级必须给建议', d.level === 'ok' ? d.actions.length === 0 : d.actions.length > 0)
  chk('config 快照字段齐全', ['apiKeySet', 'steamIdSet', 'demoDataEnabled', 'autoSync', 'syncIntervalMin', 'activeSource'].every((k) => k in d.config))
  chk('未触碰真实设置（logs 落在临时目录）', d.config.apiKeySet === false, JSON.stringify(d.config))

  console.log(`\n${fail === 0 ? 'ALL PASS' : 'HAS FAILURE'}  pass=${pass} fail=${fail}`)
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch { /* 忽略 */ }
  app.exit(fail === 0 ? 0 : 1)
})
