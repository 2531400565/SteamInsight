/**
 * 数据包导入 / 导出（换机迁移、重装前备份、多台电脑之间对齐分析结果）。
 *
 * 格式：单个 JSON 文件，带 `format` + `version` 双标识，便于将来演进。
 *   { format: 'steam-insight-datapack', version: 1, schemaVersion, exportedAt, appVersion, data: { 表名: 行[] } }
 *
 * 三个刻意的决定：
 *  1) **不含 API Key**。导出文件是会被随手丢进微信/网盘的，明文密钥写进去风险远大于便利。
 *     迁移到新机后重新填一次 Key 即可（Key 与账号绑定，不随数据走）。
 *  2) **不含 reports 表**。年度报告完全由会话/成就派生，导入后重新生成即可，避免带进陈旧缓存。
 *  3) **列名白名单**。导入的行来自外部文件，只用 `PRAGMA table_info` 里真实存在的列拼 SQL，
 *    杜绝通过伪造列名做 SQL 注入。
 */
import fs from 'node:fs'
import { dialog } from 'electron'
import type { DataPackResult, DataPackSummary } from '@shared/contract'
import { SCHEMA_VERSION } from '@/database/schema'
import { appVersion, userDataDir } from './paths'
import { all, flushNow, run, transaction, type Row } from './database'
import { getSettings } from './settings'
import { logInfo, logWarn } from './logger'

/**
 * 从 Steam 同步下来的表。顺序即导入顺序，无外键约束所以不敏感。
 *
 * 「覆盖导入」只清空这一组 —— 它们的内容由下一次同步完全重建。
 */
const SYNC_TABLES = ['users', 'games', 'play_sessions', 'achievements', 'wishlist', 'discounts', 'price_history', 'snapshots'] as const

/**
 * **用户自己产生的**内容（评分 / 笔记 / 手动追猎清单）。
 *
 * 与同步表的区别：它们无法由任何接口重建，一旦被「清缓存重新同步」或
 * 「覆盖导入一份旧数据包」洗掉就是永久丢失。所以：
 *  - `wipeAll()` 不碰它们；
 *  - 覆盖导入时，**只有数据包里真的带了这张表**才清空重写（带旧包导入不会误删笔记）。
 */
const USER_TABLES = ['game_notes', 'hunt_picks'] as const

const TABLES = [...SYNC_TABLES, ...USER_TABLES] as const
type TableName = (typeof TABLES)[number]

export const DATA_PACK_FORMAT = 'steam-insight-datapack'
export const DATA_PACK_VERSION = 1

interface DataPack {
  format: string
  version: number
  schemaVersion: number
  exportedAt: string
  appVersion: string
  steamId: string | null
  counts: Record<string, number>
  data: Record<string, Row[]>
  note: string
}

/** 该表在数据库里真实存在的列（白名单 + 约束信息）。 */
interface ColumnInfo {
  name: string
  type: string
  notNull: boolean
  /** DDL 里写的默认值（`PRAGMA table_info.dflt_value`），没有则为 null。 */
  dflt: string | null
}

function tableColumns(table: TableName): ColumnInfo[] {
  return all(`PRAGMA table_info(${table})`).map((r) => ({
    name: String(r.name),
    type: String(r.type ?? ''),
    notNull: Number(r.notnull) === 1,
    dflt: r.dflt_value === null || r.dflt_value === undefined ? null : String(r.dflt_value)
  }))
}

/**
 * 为「源文件里缺失的 NOT NULL 列」造一个安全占位值。
 *
 * 为什么需要：数据包允许只带部分列（版本演进 / 手工整理过的包），但建表时若干列是
 * `NOT NULL` 且无默认值。若直接跳过这些列，SQLite 会在事务中途抛 NOT NULL 约束错误 ——
 * 虽然事务会回滚、库不会坏，但报错信息是 `NOT NULL constraint failed: games.header_image`，
 * 用户完全无从下手。这里按列类型补一个空值，让**部分列的数据包也能导入**。
 */
function fallbackValue(col: ColumnInfo): unknown {
  if (col.dflt !== null) return col.dflt
  const t = col.type.toUpperCase()
  if (t.includes('INT') || t.includes('REAL') || t.includes('NUM') || t.includes('DEC') || t.includes('BOOL')) return 0
  return ''
}

/** 写入一张表。返回实际写入行数。 */
function insertRows(table: TableName, rows: Row[], cols: ColumnInfo[]): number {
  let written = 0
  for (const row of rows) {
    const use: string[] = []
    const values: Record<string, unknown> = {}
    let fromSource = false
    for (const col of cols) {
      if (Object.prototype.hasOwnProperty.call(row, col.name)) {
        // 只有源文件里真实存在的列才采信（防注入 + 兼容将来删列）
        use.push(col.name)
        values[col.name] = row[col.name] ?? null
        fromSource = true
      } else if (col.notNull) {
        // 缺失的 NOT NULL 列补占位值，避免整包导入因一列而失败
        use.push(col.name)
        values[col.name] = fallbackValue(col)
      }
    }
    // 整行没有命中任何一个真实列 → 不是本程序的数据，跳过
    if (!fromSource) continue
    const placeholders = use.map((c) => `$${c}`).join(', ')
    run(`INSERT OR REPLACE INTO ${table} (${use.join(', ')}) VALUES (${placeholders})`, values)
    written += 1
  }
  return written
}

function countOf(table: TableName): number {
  const row = all(`SELECT COUNT(*) AS c FROM ${table}`)[0]
  return row ? Number(row.c) || 0 : 0
}

/** 组装数据包（不落盘，便于单独验证）。 */
export function buildDataPack(): DataPack {
  const data: Record<string, Row[]> = {}
  const counts: Record<string, number> = {}
  for (const t of TABLES) {
    data[t] = all(`SELECT * FROM ${t}`) as Row[]
    counts[t] = data[t].length
  }
  return {
    format: DATA_PACK_FORMAT,
    version: DATA_PACK_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    steamId: getSettings().steamId || null,
    counts,
    data,
    note: '不含 Steam API Key（迁移后请在新机重新填写）。不含派生报告，导入后由本地数据重新生成。含你自己的评分 / 笔记 / 追猎清单（game_notes / hunt_picks）。'
  }
}

export interface ParsedPack {
  pack: DataPack
  totalRows: number
}

/** 校验并解析数据包。任何不合格都抛出可读错误。 */
export function parseDataPack(text: string): ParsedPack {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('不是合法的 JSON 文件')
  }
  if (typeof raw !== 'object' || raw === null) throw new Error('数据包内容不是对象')
  const obj = raw as Partial<DataPack>
  if (obj.format !== DATA_PACK_FORMAT) throw new Error('不是 Steam Insight 数据包（format 字段不匹配）')
  const version = Number(obj.version)
  if (!Number.isInteger(version) || version < 1) throw new Error('数据包版本号缺失或非法')
  if (version > DATA_PACK_VERSION) {
    throw new Error(`数据包版本 ${version} 高于当前程序支持的 ${DATA_PACK_VERSION}，请先升级 Steam Insight`)
  }
  const src = obj.data
  if (typeof src !== 'object' || src === null) throw new Error('数据包里没有 data 字段')
  const data: Record<string, Row[]> = {}
  let totalRows = 0
  for (const t of TABLES) {
    const rows = (src as Record<string, unknown>)[t]
    if (rows === undefined) continue
    if (!Array.isArray(rows)) throw new Error(`表 ${t} 的内容不是数组`)
    const clean: Row[] = rows.filter((r): r is Row => typeof r === 'object' && r !== null && !Array.isArray(r))
    if (clean.length !== rows.length) throw new Error(`表 ${t} 里有 ${rows.length - clean.length} 行不是对象`)
    data[t] = clean
    totalRows += clean.length
  }
  return { pack: { ...(obj as DataPack), version, data }, totalRows }
}

/** 删除全部「同步表」（覆盖导入用）。用户内容（笔记 / 追猎清单）不在此列。 */
function wipeAll(): void {
  for (const t of SYNC_TABLES) run(`DELETE FROM ${t}`)
}

/** 把一个已解析的数据包写进数据库。mode = replace 会先清空同步表。 */
export function applyDataPack(parsed: ParsedPack, mode: 'replace' | 'merge'): DataPackSummary {
  const written: Record<string, number> = {}
  const before: Record<string, number> = {}
  for (const t of TABLES) before[t] = countOf(t)

  transaction(() => {
    if (mode === 'replace') {
      wipeAll()
      // 用户内容只在「包里确实带了」时才覆盖，避免用一份老包把本地笔记抹掉
      for (const t of USER_TABLES) if (parsed.pack.data[t]) run(`DELETE FROM ${t}`)
    }
    for (const t of TABLES) {
      const rows = parsed.pack.data[t]
      if (!rows || !rows.length) continue
      written[t] = insertRows(t, rows, tableColumns(t))
    }
  })
  flushNow()

  const after: Record<string, number> = {}
  for (const t of TABLES) after[t] = countOf(t)
  return { mode, totalRows: Object.values(written).reduce((a, b) => a + b, 0), written, before, after }
}

function stampName(d = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

/** 导出数据包到用户选择的位置。 */
export async function exportDataPack(): Promise<DataPackResult> {
  const res = await dialog.showSaveDialog({
    title: '导出数据包',
    defaultPath: `steam-insight-datapack-${stampName()}.json`,
    filters: [{ name: 'Steam Insight 数据包', extensions: ['json'] }]
  })
  if (res.canceled || !res.filePath) return { ok: false, cancelled: true }
  try {
    const pack = buildDataPack()
    fs.writeFileSync(res.filePath, JSON.stringify(pack), 'utf8')
    logInfo('datapack', '已导出数据包', { file: res.filePath, rows: pack.counts })
    return { ok: true, filePath: res.filePath, counts: pack.counts }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logWarn('datapack', '导出失败', { error: msg })
    return { ok: false, error: msg }
  }
}

/** 从用户选择的文件导入数据包。 */
export async function importDataPack(mode: 'replace' | 'merge'): Promise<DataPackResult> {
  const res = await dialog.showOpenDialog({
    title: '选择数据包',
    properties: ['openFile'],
    filters: [{ name: 'Steam Insight 数据包', extensions: ['json'] }]
  })
  if (res.canceled || !res.filePaths.length) return { ok: false, cancelled: true }
  const file = res.filePaths[0]
  try {
    const text = fs.readFileSync(file, 'utf8')
    const parsed = parseDataPack(text)
    const summary = applyDataPack(parsed, mode)
    logInfo('datapack', '已导入数据包', { file, mode, rows: summary.totalRows })
    return { ok: true, filePath: file, counts: summary.after, summary }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logWarn('datapack', '导入失败', { file, error: msg })
    return { ok: false, error: msg }
  }
}

/** 数据包默认存放目录（「打开配置目录」用）。 */
export function dataPackHint(): string {
  return userDataDir
}
