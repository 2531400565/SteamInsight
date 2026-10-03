/**
 * 诊断包导出：把「朋友出问题时报错截图之外能拿到的全部信息」打成一个文件。
 *
 * ⚠️ 脱敏是硬要求：`settings.json` 里有明文的 Steam API Key，日志里也可能残留带 Key 的 URL。
 * 这里做两层防护：
 *   1) 写日志时就已经把 URL 里的 `key=` 参数打码（见 api-base.ts 的 redactUrl）；
 *   2) 导出前再按当前 Key 的明文全量替换一次，兜住「以前的日志文件里留有旧 Key」。
 */
import fs from 'node:fs'
import { dialog } from 'electron'
import type { AppInfo, ExportResult } from '@shared/contract'
import { appVersion, dbPath, userDataDir } from './paths'
import { getSettings } from './settings'
import { flushLogs, listLogFiles, logsDir, readLogTail } from './logger'
import { diagnoseNetwork, type NetworkDiagnosis } from './net-diagnose'
import * as repo from './repository'

/** 只保留首尾各 4 位，便于判断「填的是哪个 Key」而不泄露 Key 本身。 */
export function maskSecret(secret: string): string {
  const s = secret.trim()
  if (!s) return ''
  if (s.length <= 10) return `${s.slice(0, 1)}***（长度 ${s.length}）`
  return `${s.slice(0, 4)}…${s.slice(-4)}（长度 ${s.length}）`
}

/** 把文本里出现的明文密钥全部替换掉。空密钥时原样返回。 */
/**
 * SteamID 脱敏：**本地日志保持原样**（排障时需要知道是哪个账号），
 * 只在**导出诊断包**时打码 —— 因为诊断包是会被发出去的。
 *
 * 保留前 4 位与末 4 位：足够在「是不是同一个账号」这类排障问题上做判断，
 * 又不能反查出一个真实的 Steam 主页。
 */
export function redactSteamId(text: string): string {
  return text.replace(/\b(7656\d{12,16})\b/g, (m) => `${m.slice(0, 4)}…${m.slice(-4)}`)
}

export function redactSecret(text: string, secret: string): string {
  const s = secret.trim()
  if (!s || s.length < 6) return text
  return text.split(s).join('«REDACTED»')
}

/** 供导出与关于页共用的应用信息。 */
export function appInfo(): AppInfo {
  return {
    version: appVersion,
    electron: process.versions.electron ?? '',
    chrome: process.versions.chrome ?? '',
    node: process.versions.node ?? '',
    platform: process.platform,
    userDataPath: userDataDir,
    dbPath,
    logsPath: logsDir(),
    demoMode: getSettings().enableDemoData
  }
}

interface DiagnosticsPack {
  format: 'steam-insight-diagnostics'
  version: 1
  generatedAt: string
  app: AppInfo
  settings: Record<string, unknown>
  counts: Record<string, number>
  network: NetworkDiagnosis
  logs: { files: Array<{ name: string; bytes: number }>; tail: string[]; redacted: boolean }
  note: string
}

/** 生成诊断包内容（不落盘，便于单独验证）。 */
export async function buildDiagnostics(): Promise<DiagnosticsPack> {
  flushLogs()
  const s = getSettings()
  const counts = repo.loadSnapshot().counts
  const network = await diagnoseNetwork().catch(() => null)

  return {
    format: 'steam-insight-diagnostics',
    version: 1,
    generatedAt: new Date().toISOString(),
    app: appInfo(),
    settings: {
      autoLaunch: s.autoLaunch,
      minimizeToTray: s.minimizeToTray,
      autoSync: s.autoSync,
      syncIntervalMin: s.syncIntervalMin,
      notifyWishlistDrop: s.notifyWishlistDrop,
      notifyHistoricalLow: s.notifyHistoricalLow,
      notifyFreeGame: s.notifyFreeGame,
      notifyAchievementHunt: s.notifyAchievementHunt,
      theme: s.theme,
      countryCode: s.countryCode,
      enableDemoData: s.enableDemoData,
      steamId: s.steamId,
      personaName: s.personaName,
      steamIdMasked: s.steamId ? redactSteamId(s.steamId) : '',
      priceAlertCount: s.priceAlerts.length,
      // Key 本身绝不进包
      steamApiKey: maskSecret(s.steamApiKey)
    },
    counts,
    network: network as NetworkDiagnosis,
    logs: {
      files: listLogFiles(),
      tail: readLogTail(600).map((line) => redactSteamId(redactSecret(line, s.steamApiKey))),
      redacted: true
    },
    note: '此文件用于排查问题：包含运行环境、设置（API Key 已打码、SteamID 已部分隐藏）、连通性自检结果与最近 600 行日志。不含任何 Steam 账号密码。'
  }
}

/** 文件名里的时间戳：`20260926-1945`。 */
function stampName(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

/** 弹保存对话框并写出诊断包。 */
export async function exportDiagnostics(): Promise<ExportResult> {
  const res = await dialog.showSaveDialog({
    title: '导出诊断包',
    defaultPath: `steam-insight-diagnostics-${stampName()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (res.canceled || !res.filePath) return { ok: false, cancelled: true }
  try {
    const pack = await buildDiagnostics()
    // settings.json 单独再剔一次兜底：确保任何路径都不会把明文 Key 写出去
    const text = redactSecret(JSON.stringify(pack, null, 2), getSettings().steamApiKey)
    fs.writeFileSync(res.filePath, text, 'utf8')
    return { ok: true, filePath: res.filePath }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
