/**
 * 主进程 API 层的共享地基：JSON 请求、宽松解析、并发池。
 * 拆出来是为了让 steam-api.ts（Web API，需要 Key）与 steam-store.ts（商店接口，公开）
 * 各自保持在 300 行以内，同时保证两边的解析口径完全一致。
 */
import { fetchText } from './http'
import { logInfo, logWarn } from './logger'

export function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
export function asStr(v: unknown, d = ''): string { return typeof v === 'string' ? v : d }
/**
 * 宽松数字解析。Steam 不同接口会把同一字段返回成 number 或 string
 * （实测 GetGlobalAchievementPercentages 的 percent 是字符串 "63.0"），
 * 只认 number 会静默丢成 0 —— 曾导致 4536 条成就的稀有度全部误判。
 */
export function asNum(v: unknown, d = 0): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : d
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : d }
  return d
}
/**
 * 宽松布尔解析。appdetails 的 is_free 返回的是 boolean true，
 * 早前用「=== 1」判断永远为假，导致「限时免费」分类恒定为空。
 */
export function asBool(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 'true'
}

/** 简易并发池：最多 limit 个任务同时跑。 */
export async function pool<T, R>(items: T[], limit: number, worker: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let idx = 0
  async function next(): Promise<void> {
    while (idx < items.length) {
      const cur = idx++
      out[cur] = await worker(items[cur], cur)
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () => next())
  await Promise.all(runners)
  return out
}

/**
 * 日志用的 URL 脱敏：Web API 的请求 URL 里带 `?key=<32 位密钥>`，
 * 原样写进日志等于把密钥落盘 —— 而日志是会被导出、发给他人的。必须打码。
 */
export function redactUrl(url: string): string {
  return url.replace(/([?&]key=)[^&]*/gi, '$1«REDACTED»')
}

/**
 * GET 一个 JSON，带超时与重试。失败抛 Error。
 * 传输统一走 http.ts（优先 Electron net，走系统代理与系统证书链），
 * 否则在「Steam 域名被解析到本地反代」的机器上会固定报证书链错误。
 *
 * 每次请求都写一行日志（via / status / 耗时 / 失败原因）——
 * 这是「静默失败」最便宜的兜底：出问题时不用再靠截图反推。
 */
/**
 * 带 HTTP 状态语义的请求错误。
 *
 * 为什么要单独一个类型：`status` 让上层能区分「配错了 API Key」和「网络抖动」，
 * 而不是把所有失败都压成一句 `请求失败`。后者正是「同步成功但游戏库是空的」这类
 * 幽灵故障的来源 —— 用户完全没有线索可以自查。
 *
 * `kind` 里的 `permanent` 是后补的第四类：**这个请求本身不成立，重试永远不会成功**。
 */
export type SteamErrorKind = 'unauthorized' | 'rate_limited' | 'permanent' | 'http'

export class SteamHttpError extends Error {
  constructor(
    readonly status: number,
    readonly kind: SteamErrorKind,
    message: string
  ) {
    super(message)
    this.name = 'SteamHttpError'
  }
}

/**
 * 4xx 里除 401/403/429 之外的都算「永久失败」。
 *
 * 最典型的就是 `GetPlayerAchievements` 对**没有成就的游戏固定返回 400**（实测：
 * 同一账号下 CS2 / Dota2 / TF2 / HL2 / 星露谷都是 200，而一批无成就的游戏全是 400，
 * 且响应稳定复现）。早前 400 落进通用 `http` 类，每次同步把这种游戏重试 3 遍 ——
 * 单轮实测 12 款 × 3 次 = 36 个注定失败的请求，还会让 appId 挂进成就重试名单
 * （上限 5 次，即每款白跑最多 15 个请求）。重试对「请求不成立」永远没有意义。
 */
const PERMANENT_STATUS = new Set([400, 404, 410, 422])

/**
 * GET 一个 JSON，带超时与重试。失败抛 Error。
 * 传输统一走 http.ts（优先 Electron net，走系统代理与系统证书链），
 * 否则在「Steam 域名被解析到本地反代」的机器上会固定报证书链错误。
 *
 * 每次请求都写一行日志（via / status / 耗时 / 失败原因）——
 * 这是「静默失败」最便宜的兜底：出问题时不用再靠截图反推。
 */
export async function requestJson(url: string, timeoutMs = 12000, retries = 2): Promise<unknown> {
  // 429 是 Steam 的显式限流：退避必须明显长于其它错误，否则重试只是在继续撞墙
  // （默认 500/1500ms 对被限流的客户端毫无意义，通常要等几十秒）。
  const backoff = [0, 500, 1500]
  const rateLimitBackoff = [0, 3000, 9000]
  let lastError: unknown = new Error('请求失败')
  /** 下一次重试前要等待的毫秒数 —— 由上一次失败的**种类**决定（限流必须退避更久）。 */
  let lastWaitMs = 0
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, lastWaitMs))
    const started = Date.now()
    const res = await fetchText(url, { timeoutMs })
    const ms = Date.now() - started
    const status = res.status

    if (status !== null && status >= 400) {
      // 分四类：认证问题立刻失败、限流长退避重试、4xx 永久失败不重试、其余 4xx/5xx 常规重试。
      const isUnauthorized = status === 401 || status === 403
      const isRateLimited = status === 429
      const isPermanent = PERMANENT_STATUS.has(status)
      const kind: SteamErrorKind = isUnauthorized
        ? 'unauthorized'
        : isRateLimited
          ? 'rate_limited'
          : isPermanent
            ? 'permanent'
            : 'http'
      const err = new SteamHttpError(
        status, kind,
        isUnauthorized
          ? `Steam API Key 无效或无权访问（HTTP ${status}）：请在「设置 → 账号」重新填写 Key，并确认该账号的「游戏详情」已设为公开`
          : isRateLimited
            ? `Steam 接口返回限流（HTTP ${status}）`
            : isPermanent
              ? `HTTP ${status}：该资源不存在或没有数据（重试无意义，已跳过）`
              : `HTTP ${status}`
      )
      // 永久失败不是异常事件，用 INFO 记 —— 否则正常同步里一堆 400 会把 WARN 淹掉，
      // 真正的限流/网络问题反而看不见了。
      const line = { url: redactUrl(url), status, via: res.via ?? '—', ms, attempt, kind }
      if (isPermanent) logInfo('net', 'GET skipped (permanent)', line)
      else logWarn('net', 'GET rejected', { ...line, error: res.error ?? null })
      lastError = err
      lastWaitMs = isRateLimited ? rateLimitBackoff[attempt + 1] ?? 9000 : backoff[attempt + 1] ?? 1500
      // 认证失败与永久失败都不重试：前者是 Key 错了，后者是请求本身不成立，
      // 重试一万次也是一样的结果，只会拖慢用户看到错误提示的时间
      if (isUnauthorized || isPermanent) throw err
      continue
    }

    if (status !== null && status < 400) {
      logInfo('net', 'GET ok', { url: redactUrl(url), status, via: res.via ?? '—', ms, attempt })
      try { return JSON.parse(res.body) } catch { throw new Error(`响应不是合法 JSON（HTTP ${status}）`) }
    }
    lastError = new Error(res.error ?? `HTTP ${status ?? '—'}`)
    lastWaitMs = backoff[attempt + 1] ?? 1500
    logWarn('net', 'GET failed', { url: redactUrl(url), status, via: res.via ?? '—', ms, attempt, error: (lastError as Error).message })
  }
  throw lastError
}
