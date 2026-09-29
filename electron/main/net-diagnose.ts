/**
 * 一键连通性自检（网络诊断）。
 *
 * 要解决的问题：应用完全依赖 5 个外部域名，但界面上没有任何地方能说明「现在到底通不通、不通是为什么」。
 * 而三类故障在界面上长得一模一样，处置方式却完全不同：
 *   | 现象                     | 真实原因                        | 用户会怎么猜        |
 *   | 封面能显示、同步必失败   | hosts 被劫持但加速器退出了      | 接口坏了 / 被封了   |
 *   | 全部失败                 | 系统代理指向已退出的端口        | 软件有 bug          |
 *   | 只能看演示数据           | 没填 API Key / 隐私不是公开     | 拉不到数据          |
 *
 * 判定逻辑来自 `tools/probe-net/`（已实测跑通），这里只是把它搬进主进程并整理成人话结论。
 * 传输统一复用 http.ts：优先 Electron net（走系统代理与系统证书链），失败再退回 node:https。
 */
import net from 'node:net'
import type { DiagnoseCheck, DiagnoseConfig, DiagnoseKind, DiagnoseLevel, NetworkDiagnosis } from '@shared/contract'
import { fetchText, proxyLabel } from './http'
import { getSettings } from './settings'
import { logInfo } from './logger'

export interface DiagnoseTarget {
  label: string
  url: string
  kind: DiagnoseKind
}

/** 与 `tools/probe-net/net-probe.cjs` 保持一致：应用真实会用到的全部域名。 */
export const DIAGNOSE_TARGETS: DiagnoseTarget[] = [
  { label: 'api.steampowered.com', url: 'https://api.steampowered.com/ISteamWebAPIUtil/GetServerInfo/v1/', kind: 'api' },
  { label: 'steamcommunity.com', url: 'https://steamcommunity.com/openid/login', kind: 'community' },
  { label: 'store.steampowered.com', url: 'https://store.steampowered.com/api/appdetails?appids=570&cc=cn&l=schinese', kind: 'store' },
  { label: 'avatars.steamstatic.com', url: 'https://avatars.steamstatic.com/', kind: 'cdn' },
  { label: 'cdn.cloudflare.steamstatic.com', url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg', kind: 'cdn' }
]

export type { DiagnoseCheck, DiagnoseConfig, DiagnoseLevel, NetworkDiagnosis }

/** 探测一个 TCP 端口是否有程序在监听。用于判断「代理配置还在、但客户端已经退出」。 */
export function probeTcp(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const done = (ok: boolean): void => { if (!settled) { settled = true; resolve(ok) } }
    let socket: net.Socket
    try {
      socket = net.connect({ host, port })
    } catch {
      done(false)
      return
    }
    socket.setTimeout(timeoutMs)
    socket.on('connect', () => { socket.destroy(); done(true) })
    socket.on('timeout', () => { socket.destroy(); done(false) })
    socket.on('error', () => { done(false) })
  })
}

/** 从 proxyLabel 的产物里取 host:port。返回 null 表示「不适用 / 无法解析」。 */
export function parseProxyEndpoint(proxy: string): { host: string; port: number } | null {
  const text = proxy.trim()
  if (!text || text === '直连' || text === '未知') return null
  const m = /^\[?([^\][:]+)\]?:(\d{1,5})$/.exec(text)
  if (!m) return null
  const port = Number(m[2])
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return null
  return { host: m[1], port }
}

async function runCheck(target: DiagnoseTarget): Promise<DiagnoseCheck> {
  const started = Date.now()
  const res = await fetchText(target.url, { timeoutMs: 10000 })
  const ms = Date.now() - started
  // 4xx 也算「链路通」：例如 avatars 根路径返回 404，但它证明域名解析、TLS、代理都正常。
  const ok = res.ok && res.status !== null && res.status < 500
  return { label: target.label, kind: target.kind, ok, status: res.status, via: res.via, ms, error: res.error }
}

/** 错误文本是否指向「本机地址无人应答」—— 这是 hosts 劫持残留 / 加速器退出的典型指纹。 */
function looksLikeLocalRefusal(text: string): boolean {
  return /127\.0\.0\.1|ECONNREFUSED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_CLOSED|ECONNRESET/i.test(text)
}

interface Verdict {
  level: DiagnoseLevel
  title: string
  detail: string
  actions: string[]
}

/** 纯函数：把探测结果翻译成人话结论 + 处置建议。便于单独验证。 */
export function buildVerdict(
  checks: DiagnoseCheck[],
  proxy: string,
  proxyReachable: boolean | null
): Verdict {
  const total = checks.length
  const failed = checks.filter((c) => !c.ok)
  const okCount = total - failed.length
  const median = (list: number[]): number => {
    if (!list.length) return 0
    const sorted = [...list].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
  }

  if (okCount === total) {
    const via = proxy === '直连' ? '直连' : `经代理 ${proxy}`
    return {
      level: 'ok',
      title: '网络正常',
      detail: `${total}/${total} 个域名可达 · ${via} · 中位耗时 ${median(checks.map((c) => c.ms))}ms`,
      actions: []
    }
  }

  const failedKinds = new Set(failed.map((c) => c.kind))
  const allErrors = failed.map((c) => c.error ?? `HTTP ${c.status ?? '—'}`).join(' / ')

  if (okCount === 0) {
    if (proxyReachable === false && proxy !== '直连') {
      return {
        level: 'error',
        title: `系统代理指向 ${proxy}，但该端口没有程序在监听`,
        detail: '请求全部卡在一个已经退出的代理上。这也是 Steam 客户端会掉线并转入离线的常见成因。',
        actions: [
          `重新打开代理客户端（VPN / Clash / Watt 等），确认它恢复监听 ${proxy}`,
          '或关闭系统手动代理：Windows 设置 → 网络和 Internet → 代理 → 手动设置代理'
        ]
      }
    }
    if (failed.some((c) => looksLikeLocalRefusal(c.error ?? ''))) {
      return {
        level: 'error',
        title: 'Steam 域名被解析到 127.0.0.1，但那里没有程序应答',
        detail: '这是加速器（Steam++ / Watt Toolkit）退出后残留 hosts 劫持的典型表现：域名指向本机，本地反代却已停止。',
        actions: [
          '打开 Steam++ / Watt Toolkit 并确认加速已开启（它会重新接管 80/443 本地反代）',
          '或在加速器里点「还原 hosts」，之后改用其它方式访问 Steam'
        ]
      }
    }
    return {
      level: 'error',
      title: '无法访问 Steam',
      detail: allErrors,
      actions: ['确认这台机器已联网', '确认没有安全软件 / 防火墙拦截 Steam 域名', '可点「重新检测」重试一次']
    }
  }

  // 部分失败：CDN 通、三个业务域名全挂 —— 这是「加速器没开」最有辨识度的组合。
  const business = ['api', 'community', 'store'] as const
  const businessAllFailed = business.every((k) => failedKinds.has(k))
  const cdnAllOk = checks.filter((c) => c.kind === 'cdn').every((c) => c.ok)

  if (businessAllFailed && cdnAllOk) {
    return {
      level: 'warn',
      title: '加速器似乎没在运行：Steam 域名不可达，但图片 CDN 正常',
      detail: '封面能显示、同步一定失败 —— 因为 CDN 域名不在加速器的 hosts 劫持名单里，业务域名却在。',
      actions: [
        '打开 Steam++ / Watt Toolkit 并确认加速已开启',
        '或在加速器里点「还原 hosts」后重新检测'
      ]
    }
  }

  return {
    level: 'warn',
    title: `部分域名不可达（${okCount}/${total} 通）`,
    detail: `不可达：${failed.map((c) => c.label).join('、')} —— ${allErrors}`,
    actions: ['点「重新检测」重试一次，网络抖动与代理切换都会造成偶发失败']
  }
}

/** 汇总配置侧（与网络无关）的提示。 */
export function configWarning(level: DiagnoseLevel, config: DiagnoseConfig): string | null {
  if (level === 'ok' && !config.apiKeySet && config.activeSource !== 'api') {
    return '网络正常，但尚未填写 Steam Web API Key（也没有登录态）—— 当前只能看内置演示数据。可在「Steam 账号与 API」里填入 Key，并把 Steam 隐私设置中的「游戏详情」设为公开。'
  }
  if (level === 'ok' && !config.steamIdSet) {
    return '尚未确定 SteamID64。可点登录按钮用 OpenID 确认身份，或手动填写。'
  }
  return null
}

/** 执行一次完整自检。任何单个域名失败都不会中断整体。 */
export async function diagnoseNetwork(): Promise<NetworkDiagnosis> {
  const started = Date.now()
  const proxy = await proxyLabel(DIAGNOSE_TARGETS[0].url).catch(() => '未知')
  const endpoint = parseProxyEndpoint(proxy)
  const proxyReachable = endpoint ? await probeTcp(endpoint.host, endpoint.port) : null

  const checks = await Promise.all(DIAGNOSE_TARGETS.map(runCheck))
  const verdict = buildVerdict(checks, proxy, proxyReachable)

  const s = getSettings()
  const config: DiagnoseConfig = {
    apiKeySet: s.steamApiKey.trim().length > 0,
    steamIdSet: s.steamId.trim().length > 0,
    demoDataEnabled: s.enableDemoData,
    autoSync: s.autoSync,
    syncIntervalMin: s.syncIntervalMin,
    activeSource: s.steamId && s.steamApiKey ? 'api' : s.enableDemoData ? 'demo' : 'local'
  }

  const result: NetworkDiagnosis = {
    checkedAt: Date.now(),
    proxy,
    proxyReachable,
    checks,
    okCount: checks.filter((c) => c.ok).length,
    total: checks.length,
    level: verdict.level,
    title: verdict.title,
    detail: verdict.detail,
    actions: verdict.actions,
    config,
    configWarning: configWarning(verdict.level, config)
  }

  logInfo('net', '连通性自检完成', {
    level: result.level,
    ok: `${result.okCount}/${result.total}`,
    proxy,
    proxyReachable,
    elapsedMs: Date.now() - started
  })
  return result
}
