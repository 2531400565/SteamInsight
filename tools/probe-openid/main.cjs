/**
 * 真实 Electron 探针：验证 OpenID check_authentication 这一跳。
 *
 * 为什么要它：steam-openid.ts 的 postForm 用 `r.ok ? r.body : ''` 吞掉了失败原因，
 * 结果「网络失败」和「Steam 判定签名无效」在界面上长得一模一样（都是 FAIL_HTML）。
 * 这个探针直接调项目自己的传输层 http.ts，把 via / status / body / error 全打出来，
 * 用来区分这两种根因。用的是假签名，预期 Steam 回 is_valid:false —— 只要能看到
 * 这行文本，就证明「通道 + 请求构造」没问题，锅在参数；反之则锅在通道。
 *
 * 跑法：node node_modules/esbuild/bin/esbuild electron/main/http.ts \
 *        --bundle --platform=node --format=cjs --external:electron \
 *        --outfile=tools/probe-openid/http.cjs
 *      env -u ELECTRON_RUN_AS_NODE node_modules/electron/dist/electron.exe tools/probe-openid/main.cjs
 */
const { app } = require('electron')
const { fetchText, proxyLabel } = require('./http.cjs')

const ENDPOINT = 'https://steamcommunity.com/openid/login'

// 与 steam-openid.ts 回验时组装的结构完全一致，只是签名是假的。
const PARAMS = {
  'openid.ns': 'http://specs.openid.net/auth/2.0',
  'openid.mode': 'check_authentication',
  'openid.op_endpoint': ENDPOINT,
  'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198346667289',
  'openid.identity': 'https://steamcommunity.com/openid/id/76561198346667289',
  'openid.return_to': 'http://127.0.0.1:42510/auth/steam/return',
  'openid.response_nonce': '2026-09-26T07:06:00Zabc',
  'openid.assoc_handle': '1234567890',
  'openid.signed': 'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
  'openid.sig': 'AAAA'
}

async function run() {
  const body = new URLSearchParams(PARAMS).toString()
  const out = await fetchText(ENDPOINT, {
    method: 'POST',
    timeoutMs: 12000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': String(Buffer.byteLength(body))
    },
    body
  })
  const report = {
    proxy: await proxyLabel(ENDPOINT),
    via: out.via,
    ok: out.ok,
    status: out.status,
    error: out.error,
    bodyLength: out.body.length,
    body: out.body.slice(0, 400),
    // 关键判定：Steam 是否给出了 OpenID 协议级应答
    looksLikeOpenIdReply: /is_valid\s*:/i.test(out.body),
    is_valid: (/is_valid\s*:\s*(\w+)/i.exec(out.body) || [])[1] ?? null
  }
  console.log('PROBE_RESULT ' + JSON.stringify(report, null, 2))
  app.exit(0)
}

app.whenReady().then(() =>
  run().catch((e) => {
    console.log('PROBE_RESULT ' + JSON.stringify({ fatal: String(e) }))
    app.exit(1)
  })
)
