/**
 * 数据库健康度查询（V3 / F-3）。
 *
 * 为什么需要：V2 加了 `pruneSamples` 降采样、`DataSection` 支持「清缓存 / 覆盖导入」，
 * 但用户完全看不见效果 —— 唯一能观察到的只有磁盘上一个不透明的文件。
 * 更有甚者：删行只是留下空闲页，文件大小**纹丝不动**，用户会以为「数据没删掉」。
 *
 * 这里把三件事算清楚给人看：
 *  1. 现在多大（真实文件字节数 + 各表行数）；
 *  2. 近 7 天涨了多少、每条大约占多少字节；
 *  3. 按当前速度一年后会多大的**估算**。
 *
 * 第 3 条是估算而不是预测：它用「过去 N 天的平均速率 × 365」线性外推，
 * 采样频率会随游戏库规模和用户习惯变化，所以界面必须标注「按当前速度线性估算」。
 */
import { get, databaseFileSize } from './database'
import { num } from './mappers'

const DAY = 86400

/** 每张业务表用什么时间戳列代表「这一行是什么时候产生的」。没有时间维度的表（meta）不入册。 */
const TABLES: Array<{ table: string; label: string; timeColumn: string }> = [
  { table: 'users', label: '账号', timeColumn: 'synced_at' },
  { table: 'games', label: '游戏库', timeColumn: 'price_checked_at' },
  { table: 'play_sessions', label: '游玩记录', timeColumn: 'started_at' },
  { table: 'achievements', label: '成就', timeColumn: 'unlocked_at' },
  { table: 'wishlist', label: '愿望单', timeColumn: 'added_at' },
  { table: 'discounts', label: '折扣', timeColumn: 'fetched_at' },
  { table: 'price_history', label: '价格采样', timeColumn: 'captured_at' },
  { table: 'snapshots', label: '差分快照', timeColumn: 'captured_at' },
  { table: 'game_notes', label: '我的笔记', timeColumn: 'updated_at' },
  { table: 'hunt_picks', label: '追猎清单', timeColumn: 'added_at' }
]

export interface TableHealthRow {
  table: string
  label: string
  rows: number
  last7: number
}

export interface DatabaseHealth {
  /** 磁盘上的真实字节数 */
  fileBytes: number
  /** 全部册表行数之和 */
  totalRows: number
  tables: TableHealthRow[]
  growth: {
    /** 近 7 天新增行数 */
    last7Rows: number
    /** 实际观测到的采样跨度（天），最少 1 天 */
    observedDays: number
    /** 平均每天新增行数 */
    perDay: number
    /** 按当前速度线性外推的一年新增行数 */
    projectedYearRows: number
    /** 按「当前每行平均字节数」折算的一年后体积增量（字节） */
    projectedYearBytes: number
    /** 当前每行平均字节数 */
    bytesPerRow: number
  }
  /** 库里最早的一行距今是否超过 2 天 —— 不足则「按当前速度估算一年」的置信度很低，界面要说明 */
  hasEnoughHistory: boolean
}

/**
 * 算一次健康快照。只读，**不修改任何数据**。
 *
 * `unlocked_at` 在成就表里可为 NULL（没解锁的成就没有时间）—— `WHERE unlocked_at >= n` 天然跳过它们，
 * 这正是我们要的：只有「这段时间里真正解锁」的成就才算增长。
 */
export function getDatabaseHealth(): DatabaseHealth {
  const now = Math.floor(Date.now() / 1000)
  const since = now - 7 * DAY

  let earliest: number | null = null
  const tables: TableHealthRow[] = TABLES.map((t) => {
    const total = num(get(`SELECT COUNT(*) AS c FROM ${t.table}`)?.c ?? 0)
    const last7 = num(get(`SELECT COUNT(*) AS c FROM ${t.table} WHERE ${t.timeColumn} >= $since`, { since })?.c ?? 0)
    const first = get(`SELECT MIN(${t.timeColumn}) AS m FROM ${t.table} WHERE ${t.timeColumn} IS NOT NULL AND ${t.timeColumn} > 0`)
    const firstTs = first ? num(first.m) : 0
    if (firstTs > 0 && (earliest === null || firstTs < earliest)) earliest = firstTs
    return { table: t.table, label: t.label, rows: total, last7 }
  })

  const totalRows = tables.reduce((n, t) => n + t.rows, 0)
  const last7Rows = tables.reduce((n, t) => n + t.last7, 0)
  const fileBytes = databaseFileSize()

  // 观测跨度：从「库里最早的一行」到现在，最多按 7 天算。
  // 装了才两天的用户不能按 7 天平均，否则会低估速率一半以上。
  const observedDays = earliest === null ? 1 : Math.min(7, Math.max(1, Math.ceil((now - earliest) / DAY)))
  const perDay = last7Rows / observedDays

  // 用「总体积 ÷ 总行数」估每行字节数：比逐表 `pgsize` 粗糙，但足够给出数量级，
  // 而且导出给界面时能明说它是平均值 —— 索引、空闲页都摊在里面。
  const bytesPerRow = totalRows > 0 ? fileBytes / totalRows : 0
  const projectedYearRows = Math.round(perDay * 365)

  return {
    fileBytes,
    totalRows,
    tables,
    growth: {
      last7Rows,
      observedDays,
      perDay: Math.round(perDay * 10) / 10,
      projectedYearRows,
      projectedYearBytes: Math.round(projectedYearRows * bytesPerRow),
      bytesPerRow: Math.round(bytesPerRow * 10) / 10
    },
    hasEnoughHistory: earliest !== null && now - earliest >= 2 * DAY
  }
}
