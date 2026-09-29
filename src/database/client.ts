/**
 * 渲染进程侧数据库门面。只通过 window.steamInsight 与主进程通信，不在渲染层直接碰 SQLite。
 * 暴露 loadSnapshot / query / clearCache / exportTable 四个常用入口。
 */
import type { DbQueryName, TableExportRequest } from '@shared/contract'
import type { Snapshot, SteamInsightApi } from '@/types/ipc'

// 渲染层运行环境（node 类型检查下补充 window 声明，避免 tsc 报找不到 window）
declare const window: { steamInsight?: SteamInsightApi }

function api(): NonNullable<Window['steamInsight']> {
  if (!window.steamInsight) throw new Error('steamInsight 尚未就绪')
  return window.steamInsight
}

export const db = {
  /** 一次性拉取全部表的完整快照（含 counts）。 */
  async loadSnapshot(): Promise<Snapshot> {
    return api().db.loadSnapshot()
  },

  /** 执行一个命名聚合查询，返回领域对象数组。 */
  async query<T = Record<string, unknown>>(name: DbQueryName, params?: Record<string, unknown>): Promise<T[]> {
    return api().db.query<T>(name, params)
  },

  /** 清空派生缓存（演示数据重算时调用）。返回清理掉的条数。 */
  async clearCache(): Promise<{ ok: boolean; cleared: number }> {
    return api().db.clearCache()
  },

  /** 导出单张表为 CSV/XLSX，走系统保存对话框。 */
  async exportTable(kind: TableExportRequest['kind'], format: TableExportRequest['format']) {
    return api().exporter.table({ kind, format })
  }
}
