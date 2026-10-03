/**
 * hosts 劫持守卫（Steam++ / Watt Toolkit 这类加速器会把 Steam 域名劫持到 127.0.0.1）。
 *
 * ## 要解决的真实故障
 * 加速器开启时会往 hosts 写 `127.0.0.1 store.steampowered.com` 之类��条目，并监听本机 80/443
 * 由本地反代接管。**加速器一关，这些条目还在**，于是所有 Steam 域名指向一个没人应答的本机端口 ——
 * 表现是「不开加速器就同步失败」，而且很容易被误判成软件坏了或被封号。
 *
 * ## 为什么只动 Steam 那几行（这是本模块最重要的约束）
 * 实测这台机器的 `# Steam++ Start/End` 区块里有 47 行生效内容，其中只有 15 行是 Steam 域名，
 * 另外 25 行是 GitHub、还有 hub.docker.com / huggingface.co / img.youtube.com / 油猴。
 * **按区块整段还原等于顺手关掉 GitHub 加速与 Docker Hub 镜像** —— 那比「要开加速器」麻烦得多。
 * 所以这里只对**白名单内的 Steam 域名**做手术，其余行一律原样保留。
 *
 * ## 三条安全底线
 *  1. 只加 `#` 前缀注释掉，**从不删除**任何行 —— 注释是可逆的，删除不是；
 *  2. 动系统文件前必须先备份，并提供「从备份恢复」；
 *  3. 改写逻辑是纯函数（`planHostsRewrite`），不碰磁盘，先在探针里逐条验证再允许执行。
 */
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { userDataDir } from './paths'
import { probeTcp } from './net-diagnose'
import { logInfo, logWarn } from './logger'

/** Windows hosts 文件路径。写它需要管理员权限。 */
export const HOSTS_PATH = 'C:\\Windows\\System32\\drivers\\etc\\hosts'

/**
 * 会被加速器劫持的 Steam 域名白名单。
 *
 * 取自实测（cc=cn 那台机器的 `# Steam++` 区块）+ 官方前端资源域，
 * 只认这几个：写进来的是**我们自己**要注释的域名，不是「所有看起来像 Steam 的域名」，
 * 避免误伤将来 hosts 里出现的其它 127.0.0.1 条目。
 */
export const STEAM_HIJACK_DOMAINS: readonly string[] = [
  'store.steampowered.com', 'api.steampowered.com', 'login.steampowered.com',
  'checkout.steampowered.com', 'help.steampowered.com', 'media.steampowered.com',
  'steamcommunity.com', 'www.steamcommunity.com',
  'cdn.akamai.steamstatic.com', 'community.akamai.steamstatic.com',
  'store.akamai.steamstatic.com', 'avatars.akamai.steamstatic.com',
  'community.steamstatic.com', 'steamcdn-a.akamaihd.net', 'steamuserimages-a.akamaihd.net'
]

/** 一行 hosts 条目的解析结果。 */
interface ParsedLine {
  raw: string
  /** 生效中（非注释） */
  active: boolean
  ip: string
  hosts: string[]
  /** 整行是否匹配「127.0.0.1（或 0.0.0.0）+ Steam 白名单域名」 */
  steamLoopback: boolean
}

function parseLine(raw: string): ParsedLine {
  const active = !/^\s*#/.test(raw)
  const body = raw.replace(/^\s*#\s*/, '')
  const parts = body.trim().split(/\s+/).filter(Boolean)
  const ip = parts[0] ?? ''
  const hosts = parts.slice(1).map((h) => h.toLowerCase())
  const loopbackIp = ip === '127.0.0.1' || ip === '0.0.0.0'
  const steamLoopback = loopbackIp && hosts.some((h) => STEAM_HIJACK_DOMAINS.includes(h))
  return { raw, active, ip, hosts, steamLoopback }
}

/** hosts 现状快照（只读）。 */
export interface HostsStatus {
  path: string
  /** 生效中的 Steam 劫持行原文 */
  hijacked: string[]
  /** 生效中的其它行（GitHub / Docker Hub / 其它服务……一律不碰） */
  kept: string[]
  /** 已被注释掉的 Steam 行（说明之前还原过） */
  disabled: string[]
  /** 本机 80/443 是否有程序应答（加速器是否接管中） */
  localProxyListening: boolean
  checkedAt: number
}

/** 一次改写计划：只做决策，不落盘。 */
export interface HostsPlan {
  /** 会被注释掉的行 */
  disable: string[]
  /** 保持原样的其它生效行（用于在界面上让用户看清「不会动这些」） */
  kept: string[]
  /** 改写后的完整文件内容 */
  next: string
  changed: boolean
}

/**
 * 纯函数：算出「只注释 Steam 白名单行」之后的 hosts 内容。
 *
 * 关键约束：
 * - 只处理**单个 IP 后跟白名单域名**的整行，不做子串替换（`grep -v` 式整行匹配最安全）；
 * - 已经注释过的行原样保留（幂等：跑两次结果一致）；
 * - 其它行（GitHub/Docker Hub/HF/本机自定义条目）一个字节都不改；
 * - 保留原始换行风格与行尾空白。
 */
export function planHostsRewrite(content: string): HostsPlan {
  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const rawLines = content.split(/\r?\n/)
  const disable: string[] = []
  const kept: string[] = []
  let changed = false

  const nextLines = rawLines.map((raw) => {
    const p = parseLine(raw)
    if (!p.steamLoopback) {
      if (p.active && p.ip) kept.push(raw.trim())
      return raw
    }
    if (!p.active) return raw // 已注释 → 不动
    disable.push(raw.trim())
    changed = true
    return `# ${raw.trim()}（Steam Insight 已停用此条：加速器未运行时会导致 Steam 域名无法访问）`
  })

  return { disable, kept, next: nextLines.join(eol), changed }
}

/** 读 hosts 并解析现状。只读，不改任何东西。`withLocalProbe` 会额外探一次本机 80/443（异步）。 */
export async function readHostsStatus(opts?: { withLocalProbe?: boolean }): Promise<HostsStatus> {
  let content = ''
  try {
    content = fs.readFileSync(HOSTS_PATH, 'utf8')
  } catch (e) {
    logWarn('net', 'hosts 读取失败', { path: HOSTS_PATH, error: e instanceof Error ? e.message : String(e) })
  }
  const hijacked: string[] = []
  const kept: string[] = []
  const disabled: string[] = []
  for (const raw of content.split(/\r?\n/)) {
    const p = parseLine(raw)
    if (p.steamLoopback) (p.active ? hijacked : disabled).push(raw.trim())
    else if (p.active && p.ip) kept.push(raw.trim())
  }
  // 本机 80/443 是否有人应答 —— 这是区分「加速器接管中」与「hosts 残留指向死端口」的关键指纹。
  // 只探 TCP 连通性，不发任何请求；两个端口都试，任一应答即视为接管中。
  const localProxyListening = opts?.withLocalProbe === false
    ? false
    : (await probeTcp('127.0.0.1', 443, 1200)) || (await probeTcp('127.0.0.1', 80, 1200))
  return {
    path: HOSTS_PATH, hijacked, kept, disabled,
    localProxyListening, checkedAt: Date.now()
  }
}

/** 备份目录（与应用自身备份分开，避免和「数据库备份」混在一起）。 */
export function hostsBackupDir(): string {
  return path.join(userDataDir, 'backups', 'system')
}

export interface HostsBackup {
  file: string
  createdAt: number
  bytes: number
}

function stamp(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/** 备份当前 hosts，返回备份文件路径。 */
export function backupHosts(): HostsBackup {
  const dir = hostsBackupDir()
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `hosts-${stamp()}.txt`)
  fs.copyFileSync(HOSTS_PATH, file)
  const bytes = fs.statSync(file).size
  logInfo('net', 'hosts 已备份', { file, bytes })
  return { file, createdAt: Date.now(), bytes }
}

/** 列出可用备份（新的在前）。 */
export function listHostsBackups(): HostsBackup[] {
  try {
    return fs.readdirSync(hostsBackupDir())
      .filter((f) => /^hosts-\d{8}-\d{6}\.txt$/.test(f))
      .map((f) => {
        const full = path.join(hostsBackupDir(), f)
        const st = fs.statSync(full)
        return { file: full, createdAt: st.mtimeMs, bytes: st.size }
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

export interface HostsApplyResult {
  ok: boolean
  /** 实际被注释的行数 */
  disabledCount: number
  backupFile: string | null
  error: string | null
  /** 结果回读文件（提权脚本写的），用于确认真的生效了 */
  verified: boolean
}

/**
 * 提权执行：把改写后的 hosts 写回系统文件。
 *
 * 写 hosts 必须管理员权限，而 Electron 没有 UAC API，所以走这条路：
 *   1. 先在普通权限下备份 hosts（备份不需要 admin，文件本身可读）；
 *   2. 把「改写后的完整内容」写成一个临时文件；
 *   3. `Start-Process powershell -Verb RunAs` 弹 UAC，让管理员身份的 PowerShell
 *      用 `Copy-Item` 覆盖 hosts（PowerShell 会自动申请 SEBackupPrivilege 写锁定文件，
 *      比 `Set-Content` 直接写更稳），并写一个 result.json 回传成败；
 *   4. 主进程轮询 result.json 确认结果，而不是猜。
 */
export function applyHostsPlan(plan: HostsPlan, opts?: { skipBackup?: boolean }): Promise<HostsApplyResult> {
  const backup = opts?.skipBackup ? null : backupHosts()
  const dir = hostsBackupDir()
  fs.mkdirSync(dir, { recursive: true })
  const tag = stamp()
  const newFile = path.join(dir, `hosts-new-${tag}.txt`)
  const resultFile = path.join(dir, `hosts-result-${tag}.json`)
  fs.writeFileSync(newFile, plan.next, 'utf8')

  // 提权脚本必须「无论成败都写结果文件」：否则权限不足之类的问题会被误报成 UAC 超时。
  const script = [
    '$ErrorActionPreference = "Stop"',
    'try {',
    `  Copy-Item -LiteralPath '${newFile}' -Destination '${HOSTS_PATH}' -Force`,
    `  Set-Content -LiteralPath '${resultFile}' -Value (@{ ok = $true; at = [DateTimeOffset]::Now.ToUnixTimeMilliseconds() } | ConvertTo-Json -Compress) -Encoding UTF8`,
    '} catch {',
    `  Set-Content -LiteralPath '${resultFile}' -Value (@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress) -Encoding UTF8`,
    '}'
  ].join('; ')
  const scriptFile = path.join(dir, `hosts-apply-${tag}.ps1`)
  fs.writeFileSync(scriptFile, script, 'utf8')

  return new Promise((resolve) => {
    // 提权执行（UAC 弹窗由系统负责，用户取消会走 error 分支）
    const child = execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
        `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${scriptFile}'`],
      { windowsHide: true },
      (err) => {
        if (err) {
          logWarn('net', 'hosts 提权启动失败', { error: err.message })
          resolve({ ok: false, disabledCount: 0, backupFile: backup?.file ?? null, error: `无法启动提权进程：${err.message}`, verified: false })
        }
      }
    )
    child.on('error', (e) => {
      resolve({ ok: false, disabledCount: 0, backupFile: backup?.file ?? null, error: `无法启动提权进程：${String(e.message)}`, verified: false })
    })

    // 轮询结果文件：UAC 确认后管理员脚本才会写它
    const deadline = Date.now() + 90_000
    const timer = setInterval(() => {
      let raw = ''
      try { raw = fs.readFileSync(resultFile, 'utf8') } catch { /* 还没写出来，继续等 */ }
      if (!raw) {
        if (Date.now() > deadline) {
          clearInterval(timer)
          resolve({
            ok: false, disabledCount: 0, backupFile: backup?.file ?? null,
            error: '提权窗口未在 90 秒内完成（可能取消了 UAC 弹窗）', verified: false
          })
        }
        return
      }
      clearInterval(timer)
      let ok = false
      let scriptError: string | null = null
      try { ok = Boolean((JSON.parse(raw) as { ok?: boolean }).ok) } catch { /* 结果文件损坏 */ }
      try { scriptError = (JSON.parse(raw) as { error?: string }).error ?? null } catch { /* 同上 */ }
      if (!ok) {
        resolve({ ok: false, disabledCount: 0, backupFile: backup?.file ?? null, error: `写入 hosts 失败：${scriptError ?? '未知原因'}`, verified: false })
        return
      }
      // 不靠脚本自称成功宣告结果 —— 重新读一遍 hosts，用事实复核
      void readHostsStatus().then((status) => {
        const verified = status.hijacked.length === 0 && status.disabled.length >= plan.disable.length
        logInfo('net', 'hosts 改写完成', { disabled: plan.disable.length, verified, hijackedLeft: status.hijacked.length })
        resolve({
          ok: verified, disabledCount: plan.disable.length, backupFile: backup?.file ?? null,
          error: verified ? null : '已写入但复核未通过，建议从备份恢复', verified
        })
      })
    }, 700)
  })
}

/**
 * 从备份恢复 hosts（整文件覆盖）。
 * 与「反向编辑当前文件」相比，覆盖才是真正的回滚：不会因为中间状态误把别的行启用。
 */
export function restoreHostsFromBackup(backupFile: string): Promise<HostsApplyResult> {
  if (!fs.existsSync(backupFile)) {
    return Promise.resolve({ ok: false, disabledCount: 0, backupFile: null, error: '备份文件不存在', verified: false })
  }
  const content = fs.readFileSync(backupFile, 'utf8')
  // 备份里「生效中的 Steam 行数」= 恢复后应该重新出现的条数，用它做事实比对
  const expected = content.split(/\r?\n/).filter((l) => parseLine(l).steamLoopback && parseLine(l).active).length
  if (expected === 0) {
    return Promise.resolve({ ok: false, disabledCount: 0, backupFile, error: '这份备份里没有生效的 Steam 条目，恢复它没有意义', verified: false })
  }

  const dir = hostsBackupDir()
  const tag = stamp()
  const restoreFile = path.join(dir, `hosts-restore-${tag}.txt`)
  const resultFile = path.join(dir, `hosts-restore-${tag}.json`)
  const scriptFile = path.join(dir, `hosts-restore-${tag}.ps1`)
  fs.writeFileSync(restoreFile, content, 'utf8')
  fs.writeFileSync(scriptFile, [
    '$ErrorActionPreference = "Stop"',
    'try {',
    `  Copy-Item -LiteralPath '${restoreFile}' -Destination '${HOSTS_PATH}' -Force`,
    `  Set-Content -LiteralPath '${resultFile}' -Value (@{ ok = $true } | ConvertTo-Json -Compress) -Encoding UTF8`,
    '} catch {',
    `  Set-Content -LiteralPath '${resultFile}' -Value (@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress) -Encoding UTF8`,
    '}'
  ].join('; '), 'utf8')

  return new Promise((resolve) => {
    const child = execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
      `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${scriptFile}'`],
      { windowsHide: true },
      (err) => { if (err) resolve({ ok: false, disabledCount: 0, backupFile, error: `无法启动提权进程：${err.message}`, verified: false }) })
    child.on('error', (e) => resolve({ ok: false, disabledCount: 0, backupFile, error: `无法启动提权进程：${String(e.message)}`, verified: false }))

    const deadline = Date.now() + 90_000
    const timer = setInterval(() => {
      let raw = ''
      try { raw = fs.readFileSync(resultFile, 'utf8') } catch { /* 等 */ }
      if (!raw) {
        if (Date.now() > deadline) {
          clearInterval(timer)
          resolve({ ok: false, disabledCount: 0, backupFile, error: '提权窗口未在 90 秒内完成', verified: false })
        }
        return
      }
      clearInterval(timer)
      let ok = false
      try { ok = Boolean((JSON.parse(raw) as { ok?: boolean }).ok) } catch { /* 损坏 */ }
      if (!ok) {
        resolve({ ok: false, disabledCount: 0, backupFile, error: '写入 hosts 失败，请查看日志', verified: false })
        return
      }
      void readHostsStatus({ withLocalProbe: false }).then((after) => {
        const verified = after.hijacked.length === expected
        logInfo('net', 'hosts 已从备份恢复', { expected, actual: after.hijacked.length, verified })
        resolve({
          ok: verified, disabledCount: 0, backupFile,
          error: verified ? null : `恢复后条目数与备份不一致（期望 ${expected}，实际 ${after.hijacked.length}）`,
          verified
        })
      })
    }, 700)
  })
}
