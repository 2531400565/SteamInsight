/**
 * Steam 智能检测（PRD 第十二节）。
 * 五件事：是否安装 / 是否运行 / 是否已登录 / 本机已登录账号 / API 与商店网络可达性。
 * 铁律：所有外部调用都带 3~8s 超时，异常全部吞掉并以 false/null 记录，绝不让应用崩溃或卡住。
 *
 * 「是否已登录」必须从注册表判，只看 loginusers.vdf 会永远判「未登录」——
 * 新版 Steam 已不再写 MostRecent 字段（实测本机文件只剩 AccountName / PersonaName /
 * RememberPassword / WantsOfflineMode / SkipOfflineModeWarning / AutoLogin / Timestamp）。
 * 权威来源，按可靠性排序：
 *  1) HKCU\Software\Valve\Steam\ActiveProcess\ActiveUser —— 非 0 即当前在线用户，
 *     值是 SteamID3（32 位账号 ID），SteamID64 = 76561197960265728 + ActiveUser。
 *  2) loginusers.vdf 中对应 SteamID64 块的 AccountName / PersonaName。
 *  3) HKCU\Software\Valve\Steam\AutoLoginUser —— 只是「记住的账号」，不等于在线。
 */
import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { SteamDetection } from '@shared/contract'
import { fetchText, proxyLabel } from './http'

/** SteamID64 基数。Number 装不下这个量级（7.6e16 > 2^53），所以全程用 BigInt。 */
const STEAM_ID64_BASE = 76561197960265728n

const API_INFO = 'https://api.steampowered.com/ISteamWebAPIUtil/GetServerInfo/v1/'
const STORE_APP = 'https://store.steampowered.com/api/appdetails?appids=730&cc=cn'

/** 执行 shell 命令，失败/超时返回空串（不抛出）。 */
function run(cmd: string, timeoutMs = 5000): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { timeout: timeoutMs, windowsHide: true }, (err, stdout) => {
      resolve(err ? '' : stdout.toString())
    })
  })
}

/** 极简 VDF 解析（键值对 + 嵌套 {}），够解析 loginusers.vdf 即可。 */
function parseVdf(text: string): Record<string, unknown> {
  const re = /"([^"]*)"|([{}])/g
  const root: Record<string, unknown> = {}
  const stack: Array<Record<string, unknown>> = [root]
  let key: string | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m[2] === '{') {
      const obj: Record<string, unknown> = {}
      if (key !== null) { stack[stack.length - 1][key] = obj; stack.push(obj); key = null }
    } else if (m[2] === '}') {
      stack.pop(); key = null
    } else {
      const val = m[1]
      if (key === null) key = val
      else { stack[stack.length - 1][key] = val; key = null }
    }
  }
  return root
}

/** 把 reg query 的输出解析成「值名 → 值」。值名与类型都是 ASCII，不受控制台代码页影响。 */
export function parseRegValues(out: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/^\s+(\S.*?)\s+(REG_[A-Z_]+)\s+(.*?)\s*$/)
    if (m) map[m[1].trim()] = m[3]
  }
  return map
}

/** REG_DWORD 是 0x 前缀十六进制，其余按十进制解析。 */
export function hexOrNum(v: string | undefined): number | null {
  if (!v) return null
  const n = /^0x/i.test(v) ? Number.parseInt(v.slice(2), 16) : Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

export interface RegView {
  steamPath: string | null
  autoLoginUser: string | null
  activeUser: number | null
  activePid: number | null
  steamExe: string | null
}

export const EMPTY_REG: RegView = { steamPath: null, autoLoginUser: null, activeUser: null, activePid: null, steamExe: null }

/** 读注册表：HKCU 优先，SteamPath 缺失时回退 HKLM(WOW6432) 的 InstallPath。 */
async function readRegistry(): Promise<RegView> {
  const out: RegView = { ...EMPTY_REG }
  const base = parseRegValues(await run('reg query "HKCU\\Software\\Valve\\Steam"'))
  out.steamPath = base.SteamPath ?? null
  out.autoLoginUser = base.AutoLoginUser ?? null
  out.steamExe = base.SteamExe ?? null
  const active = parseRegValues(await run('reg query "HKCU\\Software\\Valve\\Steam\\ActiveProcess"'))
  out.activeUser = hexOrNum(active.ActiveUser)
  out.activePid = hexOrNum(active.pid)
  if (!out.steamPath) {
    out.steamPath = parseRegValues(await run('reg query "HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath')).InstallPath ?? null
  }
  return out
}

/** SteamID3（32 位账号 ID）→ SteamID64。 */
export function steamId3To64(accountId: number | null): string | null {
  if (accountId === null || !Number.isInteger(accountId) || accountId <= 0) return null
  return (STEAM_ID64_BASE + BigInt(accountId)).toString()
}

/** 解析 libraryfolders.vdf 里的全部库目录。 */
function parseLibraryFolders(steamPath: string): string[] {
  const file = path.join(steamPath, 'steamapps', 'libraryfolders.vdf')
  if (!fs.existsSync(file)) return []
  try {
    const text = fs.readFileSync(file, 'utf8')
    const paths = [...text.matchAll(/"path"\s*"([^"]+)"/g)].map((x) => x[1].replace(/\\\\/g, '\\'))
    return Array.from(new Set(paths))
  } catch { return [] }
}

/** 是否运行：tasklist 取 steam.exe 的 PID。 */
async function findPid(): Promise<number | null> {
  const out = await run('tasklist /FI "IMAGENAME eq steam.exe" /FO CSV /NH', 5000)
  const mt = out.match(/"steam\.exe","(\d+)"/i)
  return mt ? Number(mt[1]) : null
}

export interface LocalAccount {
  steamId: string
  account: string | null
  persona: string | null
  autoLogin: boolean
  timestamp: number
  mostRecent: boolean
}

/** 读 loginusers.vdf 的全部本机账号（Steam 会把昵称写在这里，是本地唯一能拿到 PersonaName 的地方）。 */
export function readLoginUsers(steamPath: string): LocalAccount[] {
  const file = path.join(steamPath, 'config', 'loginusers.vdf')
  if (!fs.existsSync(file)) return []
  try {
    const root = parseVdf(fs.readFileSync(file, 'utf8'))
    const users = (root.users ?? root.Users ?? {}) as Record<string, Record<string, string> | string>
    const out: LocalAccount[] = []
    for (const [steamId, block] of Object.entries(users)) {
      if (!block || typeof block !== 'object' || !/^\d{17}$/.test(steamId)) continue
      out.push({
        steamId,
        account: block.AccountName ?? null,
        persona: block.PersonaName ?? null,
        autoLogin: block.AutoLogin === '1',
        timestamp: Number(block.Timestamp ?? 0) || 0,
        mostRecent: block.MostRecent === '1'
      })
    }
    return out
  } catch { return [] }
}

/**
 * 由「注册表视图 + 本机账号列表 + 正在运行的 PID」推导当前登录账号。纯函数，不碰 I/O，便于验证。
 * loggedIn 只认 ActiveUser（真正在线），其余情况最多只算「本机记住的账号」。
 */
export function resolveLocalAccount(
  reg: RegView,
  users: LocalAccount[],
  steamPid: number | null
): { loggedIn: boolean; who: LocalAccount | null } {
  // ActiveProcess 可能残留上一次会话的 PID；与 tasklist 的 PID 对不上就视为过期，不采信 ActiveUser
  const activeFresh = reg.activePid === null || steamPid === null || reg.activePid === steamPid
  const activeId = steamPid !== null && activeFresh ? steamId3To64(reg.activeUser) : null
  const byActive = activeId ? (users.find((u) => u.steamId === activeId) ?? null) : null
  // 不在线时的兜底：AutoLoginUser 指向的账号，否则取最近使用（MostRecent 优先，其次 Timestamp 最大）
  const sorted = [...users].sort((a, b) => Number(b.mostRecent) - Number(a.mostRecent) || b.timestamp - a.timestamp)
  const who = byActive ?? users.find((u) => u.account === reg.autoLoginUser) ?? sorted[0] ?? null
  return { loggedIn: !!byActive, who }
}

interface Probe { ok: boolean; ms: number; detail: string }

/** 探测 Web API：必须真的拿到 servertime，只看状态码会被本地反代的错误页骗过去。 */
async function probeApi(): Promise<Probe> {
  const started = Date.now()
  const r = await fetchText(API_INFO, { timeoutMs: 8000 })
  const ms = Date.now() - started
  if (r.ok && r.status === 200 && r.body.includes('servertime')) return { ok: true, ms, detail: `HTTP 200 · ${ms}ms` }
  return { ok: false, ms, detail: r.error ?? `HTTP ${r.status ?? '—'}（响应里没有 servertime）` }
}

/** 探测商店：要求返回的是真正的 appdetails JSON。 */
async function probeStore(): Promise<Probe> {
  const started = Date.now()
  const r = await fetchText(STORE_APP, { timeoutMs: 8000 })
  const ms = Date.now() - started
  if (r.ok && r.status === 200 && /"?success"?\s*:\s*true/.test(r.body)) return { ok: true, ms, detail: `HTTP 200 · ${ms}ms` }
  return { ok: false, ms, detail: r.error ?? `HTTP ${r.status ?? '—'}（响应不是 appdetails）` }
}

/** 执行一次完整检测，组装 SteamDetection。任何步骤失败都不影响整体返回。 */
export async function detectSteam(): Promise<SteamDetection> {
  const notes: string[] = []
  const reg = await readRegistry().catch((): RegView => ({ ...EMPTY_REG }))

  const installPath = reg.steamPath
  const installed = !!installPath
  notes.push(installed ? `已安装 Steam：${installPath}` : '未检测到 Steam 安装（注册表无 SteamPath / InstallPath）')

  const libraryPaths = installed && installPath ? parseLibraryFolders(installPath) : []
  if (installed) notes.push(libraryPaths.length ? `发现 ${libraryPaths.length} 个游戏库目录` : '未解析到游戏库目录')

  const steamPid = await findPid().catch(() => null)
  const running = steamPid !== null
  notes.push(running ? `Steam 正在运行（PID ${steamPid}）` : 'Steam 当前未运行')

  // ---- 本机账号：注册表 ActiveUser 是唯一权威的「当前在线」依据 ----
  const users = installed && installPath ? readLoginUsers(installPath) : []
  const recentAccounts = users.map((u) => u.account).filter((a): a is string => !!a)
  const { loggedIn, who } = resolveLocalAccount(reg, users, steamPid)
  const lastLoginSteamId = who?.steamId ?? null
  const lastLoginAccount = who?.account ?? reg.autoLoginUser ?? null
  const lastLoginPersona = who?.persona ?? null

  if (loggedIn) notes.push(`已登录账号：${lastLoginPersona ?? lastLoginAccount}（${lastLoginAccount}）`)
  else if (running) notes.push('Steam 正在运行，但当前停在登录界面（注册表 ActiveUser 为 0）')
  else if (who) notes.push(`Steam 未运行；本机记住的账号：${lastLoginAccount ?? who.steamId}`)
  else notes.push('未检测到已登录账号')

  // ---- 网络：统一走 http.ts（Electron net 优先，读系统代理），失败原因原样上报 ----
  const [api, store, proxy] = await Promise.all([probeApi(), probeStore(), proxyLabel(API_INFO)])
  const via = proxy === '直连' ? '直连' : `经代理 ${proxy}`
  notes.push(api.ok ? `Steam Web API 可达（${api.detail}，${via}）` : `Steam Web API 不可达：${api.detail}`)
  notes.push(store.ok ? `Steam 商店可达（${store.detail}，${via}）` : `Steam 商店不可达：${store.detail}`)

  const networkDetail = api.ok
    ? `API ${api.detail} · 商店 ${store.detail} · ${via}`
    : `API 不可达：${api.detail} · 商店${store.ok ? '可达' : '不可达'} · ${via}`

  return {
    installed, installPath, libraryPaths, running, steamPid,
    loggedIn, lastLoginAccount, lastLoginPersona, lastLoginSteamId, recentAccounts,
    apiReachable: api.ok, storeReachable: store.ok, apiLatencyMs: api.ok ? api.ms : null,
    networkDetail, checkedAt: Date.now(), notes
  }
}

/** 启动 Steam 客户端（仅当已安装时）。 */
export async function launchSteam(installPath: string | null): Promise<{ ok: boolean; error?: string }> {
  if (!installPath) return { ok: false, error: '未检测到 Steam 安装路径' }
  const exe = path.join(installPath, 'steam.exe')
  if (!fs.existsSync(exe)) return { ok: false, error: 'steam.exe 不存在' }
  await run(`"${exe}"`, 3000).catch(() => {})
  return { ok: true }
}
