/**
 * 统一 HTTPS 传输层（仅主进程）。
 *
 * 为什么不能直接用 node:https 直连 Steam：
 * 国内大量环境（Watt Toolkit / Steam++ 这类加速工具）会把 Steam 域名解析到 127.0.0.1 上的本地反代，
 * 其证书无法链接到 Node 内置根证书链，node:https 一律报
 * UNABLE_TO_VERIFY_LEAF_SIGNATURE —— 界面上表现为「网络不可达」的假阴性。
 * Electron 的 net 模块走 Chromium 网络栈：读取系统代理（本机实测 PROXY 127.0.0.1:7897）
 * 并用系统证书链校验，同一台机器、同一个 URL 返回 HTTP 200。
 *
 * 策略固定：优先 net；不成功再退回 node:https（严格校验证书）。
 * 两者都失败时把真实失败原因原样带回，好让界面给出可诊断的提示，而不是一句「不可达」。
 */
import https from 'node:https'
import { app, net, session } from 'electron'
import { getSettings, normalizeProxyText } from './settings'
import { logInfo, logWarn } from './logger'

export interface HttpResult {
  ok: boolean
  status: number | null
  body: string
  error: string | null
  /** 实际生效的传输通道：net = Chromium（走系统代理）；node = node:https 回退 */
  via: 'net' | 'node' | null
  /** 原始字节（二进制资源用，如封面下载 F6）。文本调用方可忽略。 */
  raw?: Buffer
}

export interface HttpOptions {
  method?: 'GET' | 'POST'
  timeoutMs?: number
  headers?: Record<string, string>
  body?: string
}

/** 把异常压成一行可读文本（带 errno 码）。 */
export function reason(e: unknown): string {
  if (e instanceof Error) {
    const code = (e as NodeJS.ErrnoException).code
    return code ? `${code}: ${e.message}` : e.message
  }
  return String(e)
}

/** 经 Electron net 请求一次：走 Chromium 网络栈，自动使用系统代理与系统证书链。 */
function viaNet(url: string, o: HttpOptions): Promise<HttpResult> {
  const timeoutMs = o.timeoutMs ?? 12000
  return new Promise((resolve) => {
    let settled = false
    const done = (r: HttpResult): void => { if (!settled) { settled = true; resolve(r) } }
    let req: ReturnType<typeof net.request>
    try {
      req = net.request({ method: o.method ?? 'GET', url })
    } catch (e) {
      done({ ok: false, status: null, body: '', error: `net 不可用：${reason(e)}`, via: null })
      return
    }
    const timer = setTimeout(() => {
      try { req.abort() } catch { /* 已经结束 */ }
      done({ ok: false, status: null, body: '', error: `超时 ${timeoutMs}ms`, via: 'net' })
    }, timeoutMs)
    const finish = (r: Omit<HttpResult, 'via'>): void => { clearTimeout(timer); done({ ...r, via: 'net' }) }
    for (const [k, v] of Object.entries(o.headers ?? {})) {
      // Content-Length 必须交给 Chromium 自己算。手工设置会让 net 通道当场失败：
      // net::ERR_INVALID_ARGUMENT —— 通道随即降级到 node:https，而 node 在本机
      // （Steam 域名解析到本地反代 / 证书链不匹配）必然 UNABLE_TO_VERIFY_LEAF_SIGNATURE。
      // 结果是一个 POST 两条通道双双阵亡，外部只能看到「校验未通过」这种极具误导性的结论。
      if (/^content-length$/i.test(k)) continue
      req.setHeader(k, v)
    }
    req.on('response', (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c) => chunks.push(Buffer.from(c)))
      res.on('end', () => {
        const status = res.statusCode
        const raw = Buffer.concat(chunks)
        finish({ ok: status < 500, status, body: raw.toString('utf8'), raw, error: null })
      })
      res.on('error', (e) => finish({ ok: false, status: null, body: '', error: reason(e) }))
    })
    req.on('error', (e) => finish({ ok: false, status: null, body: '', error: reason(e) }))
    if (o.body) req.write(o.body)
    req.end()
  })
}

/** 回退通道：node:https，严格校验证书。net 不可用时才走这里。 */
function viaNode(url: string, o: HttpOptions): Promise<HttpResult> {
  const timeoutMs = o.timeoutMs ?? 12000
  return new Promise((resolve) => {
    try {
      // 与 net 通道保持一致的过滤：Content-Length 交给运行时自己确定，调用方传了也忽略。
      const headers: Record<string, string> = {}
      for (const [k, v] of Object.entries(o.headers ?? {})) {
        if (/^content-length$/i.test(k)) continue
        headers[k] = v
      }
      const req = https.request(url, { method: o.method ?? 'GET', headers }, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(Buffer.from(c)))
        res.on('end', () => {
          const status = res.statusCode ?? null
          const raw = Buffer.concat(chunks)
          resolve({ ok: status !== null && status < 500, status, body: raw.toString('utf8'), raw, error: null, via: 'node' })
        })
      })
      req.on('error', (e) => resolve({ ok: false, status: null, body: '', error: reason(e), via: 'node' }))
      req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false, status: null, body: '', error: `超时 ${timeoutMs}ms`, via: 'node' }) })
      // 一次性 end(body)：Node 会自动补上正确的 Content-Length。
      // 改成 write + end 会退化成 Transfer-Encoding: chunked，经本机代理转发更容易出岔子。
      req.end(o.body)
    } catch (e) {
      resolve({ ok: false, status: null, body: '', error: reason(e), via: null })
    }
  })
}

/** 发起一次请求。优先 net，失败回退 node，两者皆失败时合并两条失败原因。 */
export async function fetchText(url: string, o: HttpOptions = {}): Promise<HttpResult> {
  if (app.isReady()) {
    const primary = await viaNet(url, o)
    if (primary.ok) return primary
    const fallback = await viaNode(url, { ...o, timeoutMs: Math.min(o.timeoutMs ?? 12000, 6000) })
    if (fallback.ok) return fallback
    return { ...fallback, error: `net(${primary.error ?? '未知'}) / node(${fallback.error ?? '未知'})` }
  }
  return viaNode(url, o)
}

/**
 * 二进制版本（V4/F6 封面下载用）：与 fetchText 同一条双通道，只是调用方拿 `raw` 字节。
 * 图片是二进制，走 body（utf8 字符串）会损坏 —— 必须用 raw。
 */
export async function fetchBuffer(url: string, o: HttpOptions = {}): Promise<HttpResult> {
  return fetchText(url, o)
}

/** 当前生效的代理描述，例如 `127.0.0.1:7897` 或 `直连`。用于把网络结论说清楚。 */
export async function proxyLabel(url: string): Promise<string> {
  if (!app.isReady()) return '未知'
  // 优先报「我们自己配置的代理」：系统代理指着一个没人监听的端口是常见坑，
  // 而用户在应用里已经填了可用地址，这时界面就该说我们用的那个。
  const custom = normalizeProxyText(getSettings().customProxy)
  if (custom) return custom
  try {
    const raw = await session.defaultSession.resolveProxy(url)
    const first = raw.split(';')[0].trim()
    if (!first || /^DIRECT$/i.test(first)) return '直连'
    const mt = first.match(/^(PROXY|HTTPS|SOCKS5?|SOCKS4)\s+(\S+)$/i)
    return mt ? mt[2] : first
  } catch {
    return '未知'
  }
}

/**
 * 把设置里的 customProxy 应用到**本应用**的 Chromium 会话。
 *
 * 作用域说明（这是本函数最重要的性质）：`session.defaultSession.setProxy` 只影响本进程的网络栈，
 * 不写系统代理设置、不动注册表，因此同一台机器上的 Nacos / Docker / 浏览器完全不受影响。
 * 传空字符串 = 恢复成「跟随系统」。
 */
export async function applyCustomProxy(proxyText?: string): Promise<{ applied: boolean; label: string; error: string | null }> {
  if (!app.isReady()) return { applied: false, label: '未知', error: '应用尚未就绪' }
  const custom = normalizeProxyText(proxyText ?? getSettings().customProxy)
  try {
    if (!custom) {
      await session.defaultSession.setProxy({ mode: 'system' })
      logInfo('net', '代理已切回跟随系统设置', { customProxy: '' })
      return { applied: true, label: '跟随系统', error: null }
    }
    const isSocks = /^socks/i.test(proxyText ?? '') || /^socks/i.test(custom)
    await session.defaultSession.setProxy({ mode: 'fixed_servers', proxyRules: `${isSocks ? 'SOCKS5' : 'PROXY'} ${custom}` })
    logInfo('net', '已应用自定义代理', { customProxy: custom })
    return { applied: true, label: custom, error: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logWarn('net', '应用自定义代理失败', { customProxy: custom, error: msg })
    return { applied: false, label: '未知', error: msg }
  }
}

/**
 * 代理连通性测试：真的按新代理发一个请求，比「端口能连通」更接近用户的实际体验。
 * 用固定的轻量端点（GetServerInfo，不带 key 也返回 200），失败时把两条通道的原因都带回来。
 */
export async function testProxy(): Promise<{ ok: boolean; via: string | null; ms: number; error: string | null }> {
  const started = Date.now()
  const url = 'https://api.steampowered.com/ISteamWebAPIUtil/GetServerInfo/v1/'
  // 真正按当前生效的代理发一次请求：fetchText 内部就是 net 优先、失败回退 node，
  // 测出来的结论与同步时走的是同一条路。
  const res = await fetchText(url, { timeoutMs: 10000 })
  const ms = Date.now() - started
  const hasPayload = res.body.includes('servertime')
  return {
    ok: res.ok && hasPayload,
    via: res.via,
    ms,
    error: res.ok ? (hasPayload ? null : '响应里没有 servertime（可能被中间设备拦截）') : res.error
  }
}
