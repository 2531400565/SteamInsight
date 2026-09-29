/**
 * 端到端探针：在真实 Electron 里跑完整的 startOpenId() 回调链路。
 *
 * 验证三件事：
 *  1) valid   —— 拦截 steamcommunity 的回验请求并回 is_valid:true
 *                 → 期望 startOpenId 返回 { ok:true, steamId:'76561198346667289' }，页面是「登录成功」
 *  2) invalid —— 回 is_valid:false
 *                 → 期望页面出现诊断行「Steam 判定签名无效：...」
 *  3) real    —— 不拦截，拿假签名真打一次 Steam
 *                 → 期望诊断行同样是「Steam 判定签名无效」，而不是「回验请求未送达 Steam」
 *
 * 第 3 条是本次修复的决定性前后对照：修复前这里一定报
 * "回验请求未送达 Steam：via=node status=- err=net(net::ERR_INVALID_ARGUMENT)..."，
 * 修复后变成「Steam 判定签名无效」——说明请求真正到达了 Steam。
 *
 * 跑法：见本目录 README 里的两行命令。
 */
const { app, session, shell } = require('electron')
const http = require('node:http')
const { startOpenId } = require('./openid.cjs')

const CLAIMED = 'https://steamcommunity.com/openid/id/76561198346667289'
const EXPECT_ID = '76561198346667289'

// 先尝试替换 shell.openExternal，避免探针真的弹出浏览器；顺便从 loginUrl 里解析出实际端口。
const origOpen = shell.openExternal
let loginUrl = null
try {
  shell.openExternal = async (u) => { loginUrl = u; return true }
} catch { /* 只读属性，忽略 */ }
const canPatch = shell.openExternal !== origOpen
if (!canPatch) shell.openExternal = origOpen

function fakeCallbackQuery(port) {
  return new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'id_res',
    'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
    'openid.claimed_id': CLAIMED,
    'openid.identity': CLAIMED,
    'openid.return_to': `http://127.0.0.1:${port}/auth/steam/return`,
    'openid.response_nonce': `2026-09-26T07:06:00Zprobe${Date.now()}`,
    'openid.assoc_handle': '1234567890',
    'openid.signed': 'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
    'openid.sig': 'PROBE_FAKE_SIG'
  }).toString()
}

/** 猜端口：优先用从 loginUrl 解析出的，拿不到就扫 42510-42514。 */
function guessPort() {
  if (loginUrl) {
    try {
      const rt = new URL(loginUrl).searchParams.get('openid.return_to')
      if (rt) return Promise.resolve(Number(new URL(rt).port))
    } catch { /* 落到扫描 */ }
  }
  const probe = (p) => new Promise((res) => {
    const s = http.get({ host: '127.0.0.1', port: p, path: '/__probe__' }, () => { res(p); s.destroy() })
    s.on('error', () => res(null))
    s.setTimeout(400, () => { s.destroy(); res(null) })
  })
  return (async () => {
    for (let p = 42510; p <= 42514; p++) { const hit = await probe(p); if (hit) return hit }
    return null
  })()
}

function get(port, qs) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/auth/steam/return?${qs}`, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(Buffer.from(c)))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', (e) => resolve({ status: null, body: '', error: String(e) }))
  })
}

function extractDiag(html) {
  const m = /诊断：([^<]+)</.exec(html)
  return m ? m[1] : null
}
function verdict(html) {
  if (/登录成功/.test(html)) return 'SUCCESS_PAGE'
  if (/登录失败/.test(html)) return 'FAIL_PAGE'
  return 'UNKNOWN_PAGE'
}

async function scenario(mode) {
  // 每轮开始前先注销上一轮注册的 https 拦截器，否则第二次 handle 会抛
  // "Failed to register protocol: https"。
  try { session.defaultSession.protocol.unhandle('https') } catch { /* 本轮之前没注册过 */ }
  if (mode !== 'real') {
    session.defaultSession.protocol.handle('https', async (req) => {
      if (req.url.startsWith('https://steamcommunity.com/openid/login')) {
        const text = mode === 'valid'
          ? 'ns:http://specs.openid.net/auth/2.0\nis_valid:true\n'
          : 'ns:http://specs.openid.net/auth/2.0\nis_valid:false\n'
        return new Response(text, { status: 200, headers: { 'content-type': 'text/plain' } })
      }
      return new Response('probe: other https blocked', { status: 502 })
    })
  }

  loginUrl = null
  const promise = startOpenId()
  await new Promise((r) => setTimeout(r, 350))
  const port = await guessPort()
  if (!port) return console.log(`E2E ${mode} | 找不到本地回调端口`)

  const resp = await get(port, fakeCallbackQuery(port))
  const result = await promise
  console.log(
    `E2E ${mode} | page=${verdict(resp.body)} | result=${JSON.stringify(result)} | steamIdOk=${result.steamId === EXPECT_ID} | diag=${extractDiag(resp.body) ?? '-'}`
  )
}

app.whenReady().then(async () => {
  console.log(`E2E setup | shell.openExternal patched=${canPatch}`)
  try {
    await scenario('valid')
    await scenario('invalid')
    await scenario('real')
  } catch (e) {
    console.log('E2E FATAL ' + String(e))
  }
  app.exit(0)
})
