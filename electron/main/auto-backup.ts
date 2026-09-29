/**
 * 定期自动备份（V3 / F-2）。
 *
 * 为什么必须有：`datapack.ts` 的导出很完备，但**只能手点**。而用户攒下来的东西恰恰是
 * Steam 再也拿不回来的那部分：
 *  - `price_history` —— 「本机史低」判定的**唯一**依据， Steam 不提供任何历史价格接口；
 *  - `play_sessions` —— 快照差分采样出来的每天时长，一旦丢失无法回溯；
 *  - `game_notes` / `hunt_picks` —— 用户自己写的评分、笔记、追猎清单，任何接口都不会重建。
 *
 * 一次误删、一次重装、一次覆盖导入旧数据包，这几张表就归零。
 * 这里的方案很朴素：每天最多写一份 JSON 到 `%APPDATA%\steam-insight\backups\`，滚动保留最近 N 份。
 * 成本是几 MB 磁盘和几百毫秒，收益是「最贵的那部分数据永远丢不掉」。
 *
 * 刻意不做云同步：那需要保管用户凭据，与本项目的「零后端」定位冲突（见 ROADMAP-V3 §四）。
 */
import fs from 'node:fs'
import path from 'node:path'
import type { BackupStatus, BackupRunResult } from '@shared/contract'
import { userDataDir } from './paths'
import { get, run } from './database'
import { getSettings } from './settings'
import { buildDataPack } from './datapack'
import { logError, logInfo, logWarn } from './logger'

export const BACKUP_PREFIX = 'steam-insight-backup-'

/** meta 表的键：备份状态存在库里而不是 settings.json —— 它跟着数据走，导出数据包时也一并带上。 */
const K_AT = 'backup_last_at'
const K_PATH = 'backup_last_path'
const K_ERROR = 'backup_last_error'
const K_ROWS = 'backup_last_rows'

function metaGet(key: string): string | null {
  const row = get('SELECT value FROM meta WHERE key = $key', { key })
  return row ? String(row.value) : null
}

function metaSet(key: string, value: string): void {
  run('INSERT OR REPLACE INTO meta (key, value) VALUES ($key,$value)', { key, value })
}

export function backupsDir(): string {
  return path.join(userDataDir, 'backups')
}

function ensureDir(): string {
  const dir = backupsDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** 文件名里的本地时间戳：`YYYYMMDD-HHmm`。排序即时间序，人也能直接读。 */
function stamp(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

/** 「同一天」按本地日期判定 —— UTC 会让晚上 8 点后的备份被算到明天，第二天就不触发了。 */
function localDayKey(seconds: number): string {
  const d = new Date(seconds * 1000)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

interface BackupFile {
  name: string
  bytes: number
  at: number
}

function listFiles(): BackupFile[] {
  const dir = backupsDir()
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((n) => n.startsWith(BACKUP_PREFIX) && n.endsWith('.json'))
    .map((name) => {
      const st = fs.statSync(path.join(dir, name))
      return { name, bytes: st.size, at: Math.floor(st.mtimeMs / 1000) }
    })
    .sort((a, b) => b.at - a.at)
}

/**
 * 滚动删除超限的旧备份。
 *
 * `keep` 至少 1：策略是「保底留一份」，用户把数字拖到 0 时不应该理解成「什么都别留」。
 */
export function pruneBackupFiles(keep: number): number {
  const limit = Math.max(1, Math.floor(keep) || 1)
  const files = listFiles()
  if (files.length <= limit) return 0
  let removed = 0
  for (const f of files.slice(limit)) {
    try {
      fs.unlinkSync(path.join(backupsDir(), f.name))
      removed += 1
    } catch (e) {
      logWarn('backup', '删除旧备份失败', { file: f.name, error: e instanceof Error ? e.message : String(e) })
    }
  }
  return removed
}

/** 写一份备份。失败**返回原因**而不是抛异常：这是后台任务，抛出去只会变成一条没人看的崩溃日志。 */
export function runBackup(reason: 'auto' | 'startup' | 'manual'): BackupRunResult {
  const settings = getSettings()
  try {
    const dir = ensureDir()
    const pack = buildDataPack()
    const rows = Object.values(pack.counts).reduce((a, b) => a + b, 0)
    const file = path.join(dir, `${BACKUP_PREFIX}${stamp()}.json`)
    fs.writeFileSync(file, JSON.stringify(pack), 'utf8')

    const removed = pruneBackupFiles(settings.autoBackupKeep)
    metaSet(K_AT, String(Math.floor(Date.now() / 1000)))
    metaSet(K_PATH, file)
    metaSet(K_ROWS, String(rows))
    metaSet(K_ERROR, '')
    logInfo('backup', '已写入自动备份', { reason, file, rows, removed })
    return { ok: true, filePath: file, rows, removed }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    metaSet(K_ERROR, msg)
    logError('backup', '写入自动备份失败', { error: msg, reason })
    return { ok: false, error: msg }
  }
}

/**
 * 「到点了吗」 → 到点就备份。
 *
 * 每天最多一份：这是备份而不是版本管理，同一天里反复导出只会消耗磁盘、
 * 让「保留最近 N 份」在两天内就全部翻篇。
 */
export function maybeBackup(reason: 'auto' | 'startup'): BackupRunResult | null {
  const settings = getSettings()
  if (!settings.autoBackup) return null
  const lastAt = Number(metaGet(K_AT) ?? 0)
  const nowSec = Math.floor(Date.now() / 1000)
  // 距上次不足 20 小时不重复：跨天即触发，但不会在一天里被反复调用刷屏
  if (lastAt > 0 && localDayKey(lastAt) === localDayKey(nowSec)) return null
  if (lastAt > 0 && nowSec - lastAt < 20 * 3600) return null
  return runBackup(reason)
}

export function backupStatus(): BackupStatus {
  const settings = getSettings()
  const files = listFiles()
  const rawError = metaGet(K_ERROR)
  return {
    enabled: settings.autoBackup,
    keep: settings.autoBackupKeep,
    dir: backupsDir(),
    files,
    totalBytes: files.reduce((n, f) => n + f.bytes, 0),
    lastAt: Number(metaGet(K_AT) ?? 0) || null,
    lastPath: metaGet(K_PATH),
    lastRows: Number(metaGet(K_ROWS) ?? 0) || 0,
    lastError: rawError && rawError.length > 0 ? rawError : null
  }
}
