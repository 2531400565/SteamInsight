/**
 * sql.js 初始化与持久化。关键点：
 * 1) 不用 locateFile（asar 内路径解析会失败），改为 readFileSync 读 wasm 二进制，用 wasmBinary 注入。
 * 2) DB 文件落到 userData/steam-insight.db，是真实 SQLite 文件；启动时存在就载入，否则按 schema 建表。
 * 3) 写操作后防抖落盘（≤800ms 一次），before-quit 强制 flush，避免频繁写磁盘。
 */
import fs from 'node:fs'
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from 'sql.js'
import { MIGRATIONS, SCHEMA_SQL, SCHEMA_VERSION } from '@/database/schema'
import { dbPath } from './paths'

/** sql.js 单例。 */
let SQL: SqlJsStatic | null = null
/** 当前打开的数据库句柄。 */
let db: Database | null = null
/** 落盘防抖定时器。 */
let flushTimer: NodeJS.Timeout | null = null
let dirty = false

/** 行类型：sql.js getAsObject 的结果（我们不用 Blob 列）。 */
export type Row = Record<string, string | number | null>

/** 把调用方传入的参数对象规范成 sql.js 要求的 $ 前缀绑定键。 */
function normalizeParams(params?: Record<string, unknown>): Record<string, SqlValue> | undefined {
  if (!params) return undefined
  const out: Record<string, SqlValue> = {}
  for (const [k, v] of Object.entries(params)) {
    const key = k.startsWith('$') || k.startsWith(':') || k.startsWith('@') ? k : `$${k}`
    out[key] = (v === undefined ? null : (v as SqlValue))
  }
  return out
}

/** 初始化数据库：载入 wasm、打开或新建文件、建表。只应在 app ready 后调用一次。 */
export async function initDatabase(): Promise<void> {
  if (db) return
  const wasmBinary = fs.readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm'))
  SQL = await initSqlJs({ wasmBinary: wasmBinary as unknown as ArrayBuffer })
  if (fs.existsSync(dbPath)) {
    const bytes = fs.readFileSync(dbPath)
    db = new SQL.Database(bytes)
    migrate()
  } else {
    db = new SQL.Database()
    db.run(SCHEMA_SQL)
    db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`)
    markDirty()
    flushNow()
  }
}

/** 读库里的 schema 版本号（0 = 建库于引入版本号之前）。 */
function schemaVersion(): number {
  const row = get('PRAGMA user_version')
  return row ? Number(row.user_version) || 0 : 0
}

/**
 * 把老库升到 SCHEMA_VERSION。
 *
 * 这是唯一的升级入口：老库是用户机器上**已经存在的文件**，只会被
 * `CREATE TABLE IF NOT EXISTS` 建过一次，此后任何 DDL 变更都不会自动生效。
 */
function migrate(): void {
  const from = schemaVersion()
  if (from >= SCHEMA_VERSION) return
  for (let v = from + 1; v <= SCHEMA_VERSION; v++) {
    const sql = MIGRATIONS[v]
    if (!sql) continue
    try {
      // 一个版本一个事务：中途失败整体回滚，不会留下「加了一半列」的库。
      // （v3 起一个版本里可能有多条语句，这个保证才真正有意义。）
      exec('BEGIN')
      try {
        exec(sql)
        exec(`PRAGMA user_version = ${v}`)
        exec('COMMIT')
      } catch (err) {
        try { exec('ROLLBACK') } catch { /* 已回滚时忽略 */ }
        throw err
      }
    } catch (err) {
      // 「列已存在 / 表已存在」说明该版本其实已经生效过（上次迁移后进程被杀，版本号没来得及写）。
      // 这时补写版本号继续往下走，否则用户会永久卡在启动失败上。
      const msg = err instanceof Error ? err.message : String(err)
      if (/duplicate column|already exists/i.test(msg)) exec(`PRAGMA user_version = ${v}`)
      else throw err
    }
  }
}

function ensure(): Database {
  if (!db) throw new Error('数据库未初始化')
  return db
}

function markDirty(): void {
  dirty = true
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushNow()
  }, 800)
  // 不阻塞调用方，unref 让进程在无其他任务时仍能退出
  flushTimer.unref?.()
}

/** 执行无返回的多语句 SQL（建表用）。 */
export function exec(sql: string): void {
  ensure().run(sql)
  markDirty()
}

/** 参数化写操作（INSERT/UPDATE/DELETE）。 */
export function run(sql: string, params?: Record<string, unknown>): void {
  ensure().run(sql, normalizeParams(params))
  markDirty()
}

/**
 * 参数化查询，返回全部行（snake_case 原样，映射交给 repository）。
 *
 * `stmt.free()` 必须放在 finally 里：sql.js 的语句句柄是**不受 GC 管理的**，
 * 而 `prepare` 成功之后 `bind` / `step` / `getAsObject` 都可能抛错（参数类型不对、
 * 磁盘上的库损坏、协程被中断）。原先只在成功路径 free，连续出错会累积泄漏句柄，
 * 而且泄漏本身没有任何日志，最后表现为「越用越慢」却查不到原因。
 */
export function all(sql: string, params?: Record<string, unknown>): Row[] {
  const stmt = ensure().prepare(sql)
  try {
    const bind = normalizeParams(params)
    if (bind) stmt.bind(bind)
    const rows: Row[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as Row)
    }
    return rows
  } finally {
    stmt.free()
  }
}

/** 查询第一行，无结果返回 null。同样在 finally 里释放句柄（理由见 all()）。 */
export function get(sql: string, params?: Record<string, unknown>): Row | null {
  const stmt = ensure().prepare(sql)
  try {
    const bind = normalizeParams(params)
    if (bind) stmt.bind(bind)
    const row = stmt.step() ? (stmt.getAsObject() as Row) : null
    return row
  } finally {
    stmt.free()
  }
}

/** 在一个事务里执行一组写操作，失败整体回滚。 */
export function transaction(fn: () => void): void {
  const d = ensure()
  d.run('BEGIN')
  try {
    fn()
    d.run('COMMIT')
    markDirty()
  } catch (err) {
    d.run('ROLLBACK')
    throw err
  }
}

/** 立即把内存数据库落盘（防抖到点或 before-quit 时调用）。 */
export function flushNow(): void {
  if (!db || !dirty) return
  const bytes = db.export()
  fs.writeFileSync(dbPath, Buffer.from(bytes))
  dirty = false
}

/** 清空全部表（演示数据重算 / 重置用）。 */
export function clearAll(): void {
  // 注：这里**不含** `reports` —— 该表已在 v4 迁移里被 DROP（BUG-9），再清一次会 `no such table`
  const names = ['users', 'games', 'play_sessions', 'achievements', 'wishlist', 'discounts', 'price_history', 'snapshots']
  transaction(() => {
    for (const n of names) run(`DELETE FROM ${n}`)
  })
  flushNow()
}

/** 仅清空派生/缓存表（保留 users / games），用于「清空缓存后重新同步」。返回清理条数。 */
export function clearCache(): number {
  const derived = ['play_sessions', 'achievements', 'wishlist', 'discounts', 'price_history', 'snapshots']
  let cleared = 0
  transaction(() => {
    for (const n of derived) {
      const row = get(`SELECT COUNT(*) AS c FROM ${n}`)
      cleared += typeof row?.c === 'number' ? row.c : 0
      run(`DELETE FROM ${n}`)
    }
  })
  flushNow()
  return cleared
}

/**
 * 整理数据库文件，回收被删除行占用的页面。在有这条之前项目里从未执行过 VACUUM，
 * sql.js 每次落盘都是 `db.export()` 导出**整个数据库**，删行只会在文件里留下空闲页
 * （可被后续 INSERT 复用，但文件本身永远不会缩小）。所以降采样 / 清缓存 / 覆盖导入之后
 * 磁盘占用会停在历史最高点上，用户看得误会以为「数据没删掉」。
 *
 * 返回 { before, after }，方便界面直接告诉用户省了多少。
 */
export function vacuum(): { before: number; after: number } {
  const before = databaseFileSize()
  ensure().run('VACUUM')
  markDirty()
  flushNow()
  return { before, after: databaseFileSize() }
}

/** 数据库文件当前占用的磁盘字节数（文件不存在返回 0）。健康面板用它展示真实体积。 */
export function databaseFileSize(): number {
  try {
    return fs.statSync(dbPath).size
  } catch {
    return 0
  }
}

/** 应用退出前调用：关掉定时器并释放句柄。 */
export function closeDatabase(): void {
  flushNow()
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  db?.close()
  db = null
  SQL = null
}

/** 返回当前数据库文件路径（AppInfo 用）。 */
export function databaseFilePath(): string {
  return dbPath
}
