/**
 * Steam 官方 OpenID 登录。
 * 流程：本地起 http server（127.0.0.1，从 42510 找空闲端口）→ 用 shell.openExternal 打开系统浏览器
 * （避免被 Steam 判为内嵌浏览器）→ 回调后把参数 POST 回 steamcommunity 做 check_authentication 校验 →
 * 从 claimed_id 提取 17 位 SteamID64。严禁读取/要求用户输入密码。
 */
import http from 'node:http'
import { shell } from 'electron'
import { URLSearchParams } from 'node:url'
import type { AuthStartResult } from '@shared/contract'
import { fetchText } from './http'

const OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login'
const IDENTIFIER = 'http://specs.openid.net/auth/2.0/identifier_select'
const NS = 'http://specs.openid.net/auth/2.0'

let activeServer: http.Server | null = null
let activeTimer: NodeJS.Timeout | null = null
let resolveActive: ((r: AuthStartResult) => void) | null = null
let lastAuth: { authenticated: boolean; steamId: string | null } = { authenticated: false, steamId: null }

const SUCCESS_HTML = '<!doctype html><meta charset="utf-8"><title>登录成功</title><body style="font-family:sans-serif;text-align:center;padding:80px"><h2>登录成功</h2><p>请关闭此页面返回 Steam Insight。</p></body>'
const FAIL_HTML = '<!doctype html><meta charset="utf-8"><title>登录失败</title><body style="font-family:sans-serif;text-align:center;padding:80px"><h2>登录失败</h2><p>请关闭此页面重试。</p></body>'

/** 失败页带上诊断行。这条链路一步错就全错，没有诊断信息只能靠猜。 */
function failHtml(detail: string): string {
  const safe = detail.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
  return FAIL_HTML.replace(
    '</body>',
    `<p style="color:#8a8a8a;font-size:13px;line-height:1.6;max-width:680px;margin:24px auto 0;word-break:break-all">诊断：${safe}</p></body>`
  )
}

interface VerifyReply { body: string; diag: string }

/**
 * check_authentication 回验走 http.ts（优先 Electron net）。
 * 直连 node:https 在「Steam 域名被解析到本地反代」的机器上会固定报证书链错误，
 * 结果是校验永远不通过 —— 表现为「OpenID 校验未通过」而不是网络错误，很难查。
 *
 * 这里刻意不设 Content-Length：Chromium 会自己算，手工设置会让 net 通道直接报
 * net::ERR_INVALID_ARGUMENT（http.ts 里也做了兜底过滤）。同时把传输层结论
 * （via / status / error）一并返回，好让失败原因落到页面上而不是被静默吞掉。
 */
async function postForm(url: string, params: Record<string, string>, timeoutMs = 12000): Promise<VerifyReply> {
  const body = new URLSearchParams(params).toString()
  const r = await fetchText(url, {
    method: 'POST',
    timeoutMs,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })
  const diag = `via=${r.via ?? '-'} status=${r.status ?? '-'}${r.error ? ` err=${r.error}` : ''}`
  return { body: r.ok ? r.body : '', diag }
}

function tryListen(port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const srv = http.createServer()
    srv.once('error', (e) => reject(e))
    srv.listen(port, '127.0.0.1', () => resolve(srv))
  })
}

/** 关闭上一个仍在运行的 server，保证重复调用安全。 */
export function cancelOpenId(): void {
  if (activeTimer) { clearTimeout(activeTimer); activeTimer = null }
  if (activeServer) { try { activeServer.close() } catch { /* 忽略 */ } activeServer = null }
  if (resolveActive) { resolveActive({ ok: false, cancelled: true }); resolveActive = null }
}

/** 启动一次 OpenID 登录，返回结果（含提取到的 steamId）。180s 超时自动取消。 */
export async function startOpenId(): Promise<AuthStartResult> {
  cancelOpenId()
  let port = 42510
  let srv: http.Server | undefined
  for (let i = 0; i < 40; i++) {
    try { srv = await tryListen(port); break } catch { port++; }
  }
  if (!srv) return { ok: false, error: '找不到可用端口' }
  activeServer = srv

  const returnTo = `http://127.0.0.1:${port}/auth/steam/return`
  const realm = `http://127.0.0.1:${port}/`

  const result = await new Promise<AuthStartResult>((resolve) => {
    resolveActive = resolve
    srv!.on('request', async (req, res) => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
      if (!url.pathname.startsWith('/auth/steam/return')) { res.writeHead(404); res.end(); return }
      const params = Object.fromEntries(url.searchParams.entries())
      // 用户主动取消
      if (params['openid.mode'] === 'cancel') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(FAIL_HTML)
        finish({ ok: false, cancelled: true })
        return
      }
      // 组装 check_authentication 回验
      const verify: Record<string, string> = { ...params, 'openid.mode': 'check_authentication' }
      const { body: resp, diag } = await postForm(OPENID_ENDPOINT, verify)
      const valid = /is_valid\s*:\s*true/i.test(resp)
      if (!valid) {
        // 区分「压根没问到 Steam」和「Steam 明确说签名无效」——两者修复方向完全不同。
        const why = resp
          ? `Steam 判定签名无效（${diag}）：${resp.trim().replace(/\s+/g, ' ').slice(0, 140)}`
          : `回验请求未送达 Steam（${diag}）`
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(failHtml(why))
        finish({ ok: false, error: why })
        return
      }
      const claimed = params['openid.claimed_id'] ?? ''
      const mt = claimed.match(/\/id\/(\d{17})/)
      const steamId = mt ? mt[1] : null
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(SUCCESS_HTML)
      if (!steamId) { finish({ ok: false, error: '无法从 claimed_id 提取 SteamID' }); return }
      lastAuth = { authenticated: true, steamId }
      finish({ ok: true, steamId })
    })

    activeTimer = setTimeout(() => {
      finish({ ok: false, cancelled: true, error: '登录超时（180s）' })
    }, 180000)
    activeTimer.unref?.()

    // 打开系统默认浏览器（不是 Electron 窗口）
    const loginUrl = `${OPENID_ENDPOINT}?${new URLSearchParams({
      'openid.ns': NS, 'openid.mode': 'checkid_setup', 'openid.return_to': returnTo,
      'openid.realm': realm, 'openid.identity': IDENTIFIER, 'openid.claimed_id': IDENTIFIER
    }).toString()}`
    shell.openExternal(loginUrl).catch(() => {
      finish({ ok: false, error: '无法打开系统浏览器' })
    })
  })
  return result

  function finish(r: AuthStartResult): void {
    if (activeTimer) { clearTimeout(activeTimer); activeTimer = null }
    if (activeServer) { try { activeServer.close() } catch { /* 忽略 */ } activeServer = null }
    if (resolveActive) { resolveActive(r); resolveActive = null }
  }
}

/** 当前登录态（auth:status / auth:restore 用）。 */
export function getAuthStatus(): { authenticated: boolean; steamId: string | null } {
  return { ...lastAuth }
}

/** 由外部（如 settings 已存 steamId）同步登录态。 */
export function setAuthStatus(steamId: string | null): void {
  lastAuth = { authenticated: !!steamId, steamId }
}
