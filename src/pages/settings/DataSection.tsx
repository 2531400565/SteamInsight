import { useState } from 'react'
import { Database, Download, FileJson, LifeBuoy, RefreshCw, Trash, Upload } from 'lucide-react'
import { Badge, Button, Card, SectionHeader, Select } from '@/components/ui'
import { DatabaseHealthPanel } from '@/components/shared/DatabaseHealthPanel'
import { BackupPanel } from '@/components/shared/BackupPanel'
import { CoverCachePanel } from '@/components/shared/CoverCachePanel'
import { useAppStore } from '@/store/useAppStore'
import { useDataStore } from '@/store/useDataStore'
import { bridge } from '@/services/bridge'
import type { TableExportRequest } from '@/types/ipc'
import { formatCount, formatDateTime } from '@/utils/format'

const TABLE_KINDS: Array<{ value: TableExportRequest['kind']; label: string }> = [
  { value: 'games', label: '游戏库（games）' },
  { value: 'sessions', label: '游玩记录（play_sessions）' },
  { value: 'achievements', label: '成就（achievements）' },
  { value: 'wishlist', label: '愿望单（wishlist）' },
  { value: 'discounts', label: '折扣（discounts）' }
]

const COUNT_CELLS: Array<[string, string]> = [
  ['users', '账号'],
  ['games', '游戏'],
  ['play_sessions', '游玩记录'],
  ['achievements', '成就'],
  ['wishlist', '愿望单'],
  ['discounts', '折扣']
]

const IMPORT_MODES: Array<{ value: 'replace' | 'merge'; label: string }> = [
  { value: 'merge', label: '合并导入（保留现有数据，按主键覆盖同一条）' },
  { value: 'replace', label: '覆盖导入（先清空全部业务表，再写入）' }
]

interface DataSectionProps {
  busy: string | null
  run: (key: string, task: () => Promise<void>) => Promise<void>
  setMessage: (message: string | null) => void
}

/** 设置页「数据」区块：8 张表的行数概览 + 分表导出 + 数据包 + 诊断包 + 重新同步 / 清缓存。 */
export function DataSection({ busy, run, setMessage }: DataSectionProps) {
  const snapshot = useDataStore((s) => s.snapshot)
  const sync = useAppStore((s) => s.sync)
  const runSync = useAppStore((s) => s.runSync)

  const [tableKind, setTableKind] = useState<TableExportRequest['kind']>('games')
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge')
  const counts = snapshot?.counts ?? {}

  const doExport = (format: 'csv' | 'xlsx'): Promise<void> =>
    run(`export-${format}`, async () => {
      const result = await bridge.exporter.table({ kind: tableKind, format })
      if (result.cancelled) setMessage('已取消导出。')
      else if (!result.ok) setMessage(result.error ?? '导出失败')
      else setMessage(`已保存到：${result.filePath}`)
    })

  return (
    <Card padding="md">
      <SectionHeader
        title="数据"
        subtitle="本地 SQLite 共 8 张核心表，所有统计优先读库，避免重复消耗 Steam API 配额"
        icon={<Database size={15} />}
        action={<Badge tone="neutral" size="xs">上次同步 {formatDateTime(sync.lastSyncAt, '从未')}</Badge>}
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {COUNT_CELLS.map(([key, label]) => (
          <div key={key} className="rounded-xl border border-line bg-bg1/45 px-3 py-2.5">
            <p className="text-[11px] text-t3">{label}</p>
            <p className="mt-0.5 text-[17px] font-semibold text-t1">{formatCount(counts[key] ?? 0)}</p>
            <p className="truncate text-[10.5px] text-t3">{key}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <div className="w-[248px]">
          <Select
            label="选择要导出的表"
            value={tableKind}
            options={TABLE_KINDS}
            onChange={(v) => setTableKind(v as TableExportRequest['kind'])}
          />
        </div>
        <Button size="sm" variant="secondary" icon={<Download size={14} />} loading={busy === 'export-csv'} onClick={() => void doExport('csv')}>
          导出 CSV
        </Button>
        <Button size="sm" variant="secondary" icon={<Download size={14} />} loading={busy === 'export-xlsx'} onClick={() => void doExport('xlsx')}>
          导出 Excel
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={<RefreshCw size={14} className={busy === 'resync' ? 'spin' : ''} />}
          loading={busy === 'resync'}
          onClick={() =>
            void run('resync', async () => {
              const ok = await runSync(undefined, true)
              setMessage(ok ? '已重新同步全部数据。' : '同步失败，请查看顶部状态提示。')
              await useDataStore.getState().load()
            })
          }
        >
          重新同步全部数据
        </Button>
        <Button
          size="sm"
          variant="danger"
          icon={<Trash size={14} />}
          loading={busy === 'clear'}
          onClick={() =>
            void run('clear', async () => {
              const result = await bridge.db.clearCache()
              setMessage(`已清除本地缓存（${result.cleared} 条派生记录）。下次同步会重新生成。`)
              await useDataStore.getState().load()
            })
          }
        >
          清除缓存
        </Button>
      </div>

      {/* 数据包：换机迁移 / 重装前备份 / 多台电脑对齐分析结果 */}
      <div className="mt-4 border-t border-line pt-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-[332px]">
            <Select label="导入方式" value={importMode} options={IMPORT_MODES} onChange={(v) => setImportMode(v as 'replace' | 'merge')} />
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<FileJson size={14} />}
            loading={busy === 'pack-export'}
            onClick={() =>
              void run('pack-export', async () => {
                const r = await bridge.datapack.exportPack()
                if (r.cancelled) setMessage('已取消导出。')
                else if (!r.ok) setMessage(r.error ?? '导出数据包失败')
                else setMessage(`数据包已保存到：${r.filePath}（共 ${Object.values(r.counts ?? {}).reduce((a, b) => a + b, 0)} 行）`)
              })
            }
          >
            导出数据包
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<Upload size={14} />}
            loading={busy === 'pack-import'}
            onClick={() =>
              void run('pack-import', async () => {
                const r = await bridge.datapack.importPack(importMode)
                if (r.cancelled) setMessage('已取消导入。')
                else if (!r.ok) setMessage(r.error ?? '导入数据包失败')
                else {
                  setMessage(`已${importMode === 'replace' ? '覆盖' : '合并'}导入 ${r.summary?.totalRows ?? 0} 行数据。`)
                  await useDataStore.getState().load()
                }
              })
            }
          >
            导入数据包
          </Button>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-t3">
          数据包是一个 JSON 文件，含账号、游戏库、游玩记录、成就、愿望单、折扣、价格采样。
          <span className="text-t2">不含 Steam API Key</span>（迁移到新机后重新填一次即可），也不含派生报告（导入后由本地数据重新生成）。
          「合并导入」按主键覆盖同一条记录，适合多台机器之间对齐；「覆盖导入」会先清空全部业务表，适合换机迁移。
        </p>
      </div>

      {/* 诊断包：出问题时给开发者看的东西 */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Button
          size="sm"
          variant="secondary"
          icon={<LifeBuoy size={14} />}
          loading={busy === 'diag'}
          onClick={() =>
            void run('diag', async () => {
              const r = await bridge.diag.exportPack()
              if (r.cancelled) setMessage('已取消导出。')
              else if (!r.ok) setMessage(r.error ?? '导出诊断包失败')
              else setMessage(`诊断包已保存到：${r.filePath}`)
            })
          }
        >
          导出诊断包
        </Button>
        <p className="min-w-[280px] flex-1 text-[11.5px] leading-relaxed text-t3">
          含运行环境、设置（<span className="text-t2">API Key 已打码</span>）、连通性自检结果与最近 600 行日志。
          发给开发者排查问题时用这个，比截图有用得多。
        </p>
      </div>

      {/* V3/F-3：数据库体积、增速、降采样效果与手动 VACUUM */}
      <div className="mt-4 border-t border-line pt-4">
        <DatabaseHealthPanel setMessage={setMessage} />
      </div>

      {/* V3/F-2：本地滚动备份，保住 Steam 拿不回来的那批数据 */}
      <div className="mt-4 border-t border-line pt-4">
        <BackupPanel setMessage={setMessage} />
      </div>

      {/* V5 优化 2：封面缓存占用与手动清理 */}
      <div className="mt-4 border-t border-line pt-4">
        <CoverCachePanel setMessage={setMessage} />
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-t3">
        「清除缓存」只清掉可重新生成的派生数据（价格采样、折扣、报告等），不会删除你的账号信息与设置。
        「重新同步全部数据」会先清空业务表再重新写入，请确认当前没有正在进行的同步任务。
        （「重新同步全部数据」会绕过商店详情的 12 小时缓存强制重拉；后台定时同步则命中缓存，不再每次全量重拉。）
      </p>
    </Card>
  )
}
