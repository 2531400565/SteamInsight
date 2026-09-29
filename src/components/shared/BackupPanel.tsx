import { useCallback, useEffect, useState } from 'react'
import { FolderOpen, HardDriveDownload, Shield } from 'lucide-react'
import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { bridge } from '@/services/bridge'
import { formatCount, formatDateTime, formatRelative } from '@/utils/format'
import type { BackupStatus } from '@/types/ipc'

const MB = 1024 * 1024

function humanBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / MB).toFixed(2)} MB`
}

/**
 * 备份面板（V3 / F-2）。
 *
 * 它保护的是一批**Steam 再也拿不回来**的数据：
 *  - `price_history`：本机史低判定的唯一依据，Steam 不提供任何历史价格接口；
 *  - `play_sessions`：快照差分采样出来的每日时长，丢了就无法回溯；
 *  - `game_notes` / `hunt_picks`：用户自己写的评分、笔记、追猎清单，任何同步都重建不了。
 *
 * 界面刻意把「备份在哪、有多大、上次什么时候」全部摊开 ——
 * 备份这种东西最怕的是「以为有，其实从来没有成功过」，所以错误也会直接显示在这里。
 */
export function BackupPanel({ setMessage }: { setMessage: (message: string | null) => void }) {
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setStatus(await bridge.backup.status())
    } catch {
      setStatus(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const runNow = async (): Promise<void> => {
    setBusy(true)
    try {
      const r = await bridge.backup.run()
      if (!r.ok) {
        setMessage(r.error ?? '备份失败')
      } else {
        setMessage(`已备份 ${formatCount(r.rows)} 行到 ${r.filePath}${r.removed > 0 ? `，顺带清掉 ${r.removed} 份旧备份` : ''}`)
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const openDir = async (): Promise<void> => {
    const r = await bridge.backup.openDir()
    if (!r.ok) setMessage(r.error ?? '打开备份目录失败')
  }

  if (!status) return null

  return (
    <Card padding="md">
      <SectionHeader
        title="本地自动备份"
        subtitle={
          status.enabled
            ? '每天最多一份，滚动保留最近若干份'
            : '当前已关闭 —— 价格采样与游玩记录一旦丢失无法从 Steam 重新拉取'
        }
        icon={<Shield size={15} />}
        action={
          <Badge tone={status.enabled ? (status.lastError ? 'danger' : 'ok') : 'neutral'} size="xs">
            {status.enabled ? (status.lastError ? '上次失败' : '已开启') : '已关闭'}
          </Badge>
        }
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Cell label="上次备份" value={status.lastAt ? formatRelative(status.lastAt) : '从未'} hint={status.lastAt ? formatDateTime(status.lastAt) : '开启后下一次同步完成时会立即补一份'} />
        <Cell label="已存备份" value={`${status.files.length} 份`} hint={`共 ${humanBytes(status.totalBytes)} · 上限 ${status.keep} 份`} />
        <Cell label="备份行数" value={status.lastRows > 0 ? `${formatCount(status.lastRows)} 行` : '—'} hint="含价格采样、游玩记录、笔记与追猎清单" />
      </div>

      {status.lastError ? (
        <p className="mt-3 rounded-lg border border-danger/30 bg-danger/8 px-3 py-2 text-[11.5px] leading-relaxed text-danger">
          上次备份失败：{status.lastError}
        </p>
      ) : null}

      {status.files.length > 0 ? (
        <div className="mt-3 space-y-1 border-t border-line pt-3">
          {status.files.slice(0, 5).map((f) => (
            <div key={f.name} className="flex items-center justify-between gap-2 text-[11.5px]">
              <span className="truncate font-mono text-t3" title={f.name}>
                {f.name}
              </span>
              <span className="shrink-0 text-t2">
                {humanBytes(f.bytes)} · {formatDateTime(f.at)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <Button size="sm" variant="secondary" icon={<HardDriveDownload size={14} />} loading={busy} onClick={() => void runNow()}>
          {busy ? '备份中…' : '立即备份'}
        </Button>
        <Button size="sm" variant="ghost" icon={<FolderOpen size={14} />} onClick={() => void openDir()}>
          打开备份目录
        </Button>
        <p className="min-w-[260px] flex-1 text-[11.5px] leading-relaxed text-t3">
          备份文件与「导出数据包」同一种格式，<span className="text-t2">不含 Steam API Key</span>，
          可以在另一台机器上用「导入数据包」恢复。开关与保留份数在「设置 → 通用」里调整。
        </p>
      </div>
      <p className="mt-2 truncate text-[11px] text-t3">目录：{status.dir}</p>
    </Card>
  )
}

function Cell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg1/45 px-3 py-2.5">
      <p className="text-[11px] text-t3">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold text-t1">{value}</p>
      {hint ? <p className="truncate text-[10.5px] text-t3" title={hint}>{hint}</p> : null}
    </div>
  )
}
