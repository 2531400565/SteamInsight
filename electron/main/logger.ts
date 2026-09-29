/**
 * 极简本地日志（仅主进程）。
 *
 * 为什么要有：此前项目**完全没有日志落盘** —— 出问题时用户只能截图，开发侧没有任何可查的东西。
 * 而项目里已经出现过多次「静默失败」：托盘图标 `createEmpty()` 不抛错、成就字段名写错但接口返回 200、
 * 打包产物缺少资源文件…… 全靠另外取证才挖出来。日志是这类问题的最低成本兜底。
 *
 * 设计取舍（都是刻意的）：
 *  1) 每次写盘太碎、纯异步又会在崩溃时丢数据 → 内存缓冲 + 400ms 合并落盘；崩溃钩子里强制 flush。
 *  2) 按天一个文件（`app-YYYY-MM-DD.log`），启动时清理 7 天前的；不做体积切割。
 *  3) 任何写盘失败都吞掉：日志写不进去绝不能反过来把主流程搞崩。
 */
import fs from 'node:fs'
import path from 'node:path'
import { app, dialog } from 'electron'
import { userDataDir } from './paths'

export type LogLevel = 'INFO' | 'WARN' | 'ERROR'

/** 日志保留天数。超期文件在启动时清理。 */
const RETENTION_DAYS = 7
/** 合并落盘间隔（毫秒）。太大则崩溃前丢日志，太小则失去缓冲意义。 */
const FLUSH_DELAY_MS = 400

let dir = ''
let ready = false
const buffer: string[] = []
let flushTimer: NodeJS.Timeout | null = null

/** 日志目录：`%APPDATA%\steam-insight\logs`。 */
export function logsDir(): string {
  return dir || (dir = path.join(userDataDir, 'logs'))
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 今天的日志文件路径（按本地日期切分）。 */
export function currentLogFile(): string {
  return path.join(logsDir(), `app-${ymd(new Date())}.log`)
}

/** 两段式时间戳：`2026-09-26 19:45:50.123`。 */
function stamp(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${ymd(d)} ${hh}:${mm}:${ss}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

function renderExtra(extra?: Record<string, unknown>): string {
  if (!extra) return ''
  const parts: string[] = []
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined) continue
    const text = v === null ? 'null' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    // 值里可能带换行（错误堆栈），压成一行保持「一条日志一行」
    parts.push(`${k}=${text.replace(/\s*\r?\n\s*/g, ' ')}`)
  }
  return parts.length ? ' ' + parts.join(' ') : ''
}

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushLogs()
  }, FLUSH_DELAY_MS)
  flushTimer.unref?.()
}

/** 立即把缓冲写入磁盘。崩溃钩子与退出流程必须显式调用。 */
export function flushLogs(): void {
  if (!buffer.length) return
  const text = buffer.join('')
  buffer.length = 0
  try {
    fs.appendFileSync(currentLogFile(), text, 'utf8')
  } catch {
    /* 日志落盘失败不致命，也绝不向上抛 */
  }
}

/** 写一行日志。缓冲区满 200 行时提前落盘，避免长时间不刷导致内存无上限增长。 */
export function log(level: LogLevel, tag: string, message: string, extra?: Record<string, unknown>): void {
  buffer.push(`${stamp()} [${level.padEnd(5)}] [${tag}] ${message}${renderExtra(extra)}\n`)
  if (buffer.length >= 200) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
    flushLogs()
    return
  }
  scheduleFlush()
}

export const logInfo = (tag: string, message: string, extra?: Record<string, unknown>): void => log('INFO', tag, message, extra)
export const logWarn = (tag: string, message: string, extra?: Record<string, unknown>): void => log('WARN', tag, message, extra)
export const logError = (tag: string, message: string, extra?: Record<string, unknown>): void => log('ERROR', tag, message, extra)

/** 删除超过保留期的日志文件。返回删除个数。 */
function pruneOldLogs(): number {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
  const cutoffKey = ymd(cutoff)
  let removed = 0
  try {
    for (const name of fs.readdirSync(logsDir())) {
      const m = /^app-(\d{4}-\d{2}-\d{2})\.log$/.exec(name)
      if (!m) continue
      // 字符串比较即可：YYYY-MM-DD 是字典序 = 时间序
      if (m[1] < cutoffKey) {
        try { fs.unlinkSync(path.join(logsDir(), name)); removed += 1 } catch { /* 单个文件删不掉就跳过 */ }
      }
    }
  } catch {
    /* 目录不存在 / 无权限：忽略 */
  }
  return removed
}

/**
 * 捕获未处理异常并落盘 —— 这是「应用直接消失」时唯一的线索来源。
 *
 * 行为差异（刻意）：未捕获异常会先记录再按 Electron 默认行为退出；
 * 未处理的 Promise 拒绝只记录、不退出，因为绝大多数是可恢复的网络/解析问题。
 */
function installCrashHandlers(): void {
  process.on('uncaughtException', (err) => {
    logError('crash', 'uncaughtException', { name: err.name, message: err.message, stack: err.stack })
    flushLogs()
    try {
      dialog.showErrorBox('Steam Insight 遇到未处理的错误', `${err.name}: ${err.message}\n\n详细日志：${currentLogFile()}`)
    } catch { /* 对话框在部分环境下不可用 */ }
    app.exit(1)
  })
  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason)
    const stack = reason instanceof Error ? reason.stack : undefined
    logError('crash', 'unhandledRejection', { message, stack })
    flushLogs()
  })
}

/** 启动日志系统。只应在 app ready 之前/之后各调一次（幂等）。 */
export function initLogger(): void {
  if (ready) return
  ready = true
  try { fs.mkdirSync(logsDir(), { recursive: true }) } catch { /* 建不了目录时后续写入也会被吞 */ }
  const removed = pruneOldLogs()
  logInfo('app', '日志系统启动', { dir: logsDir(), retentionDays: RETENTION_DAYS, pruned: removed, version: app.getVersion() })
  installCrashHandlers()
  flushLogs()
}

/** 读日志尾部若干行（诊断包用）。文件不存在时返回空数组。 */
export function readLogTail(maxLines = 400): string[] {
  try {
    const text = fs.readFileSync(currentLogFile(), 'utf8')
    const lines = text.split(/\r?\n/).filter((l) => l !== '')
    return lines.slice(-maxLines)
  } catch {
    return []
  }
}

/** 现有日志文件清单（文件名 + 字节数），诊断包用。 */
export function listLogFiles(): Array<{ name: string; bytes: number }> {
  try {
    return fs
      .readdirSync(logsDir())
      .filter((n) => /^app-\d{4}-\d{2}-\d{2}\.log$/.test(n))
      .sort()
      .map((name) => {
        let bytes = 0
        try { bytes = fs.statSync(path.join(logsDir(), name)).size } catch { /* 读不到就当 0 */ }
        return { name, bytes }
      })
  } catch {
    return []
  }
}
