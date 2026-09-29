/**
 * A/B 对照：定位 net::ERR_INVALID_ARGUMENT 到底由哪个请求头引起。
 * A = 现状（Content-Type + 手工 Content-Length）
 * B = 只带 Content-Type
 * C = 完全不带自定义头
 * 三者都走项目自己的 http.ts（fetchText），预期 A 挂、B/C 通。
 */
const { app } = require('electron')
const { fetchText } = require('./http.cjs')

const ENDPOINT = 'https://steamcommunity.com/openid/login'
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

const CT = 'application/x-www-form-urlencoded'

async function one(label, headers) {
  const body = new URLSearchParams(PARAMS).toString()
  const r = await fetchText(ENDPOINT, { method: 'POST', timeoutMs: 12000, headers, body })
  const is_valid = (/is_valid\s*:\s*(\w+)/i.exec(r.body) || [])[1] ?? null
  console.log(
    `CASE ${label} | via=${r.via} status=${r.status} openidReply=${/is_valid\s*:/i.test(r.body)} is_valid=${is_valid} err=${r.error ?? '-'}`
  )
}

async function run() {
  const body = new URLSearchParams(PARAMS).toString()
  await one('A_CT_and_CL', { 'Content-Type': CT, 'Content-Length': String(Buffer.byteLength(body)) })
  await one('B_CT_only  ', { 'Content-Type': CT })
  await one('C_no_header', {})
  app.exit(0)
}

app.whenReady().then(() =>
  run().catch((e) => {
    console.log('FATAL ' + String(e))
    app.exit(1)
  })
)
