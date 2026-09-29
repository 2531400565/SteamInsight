import { CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { formatRelative } from '@/utils/format'

/**
 * 同步状态指示：绿点=正常，黄点=进行中/网络受限，红点=上次同步失败。
 * 数据来源是主进程广播的 SyncStatusPayload，不在这里做任何猜测。
 */
export function SyncIndicator() {
  const sync = useAppStore((s) => s.sync)
  const detection = useAppStore((s) => s.detection)
  const runSync = useAppStore((s) => s.runSync)

  const failed = sync.lastSyncOk === false || Boolean(sync.lastError)
  const busy = sync.running
  const degraded = !busy && !failed && detection !== null && !detection.apiReachable

  const tone = failed ? 'danger' : busy || degraded ? 'warn' : 'ok'
  const dotClass =
    tone === 'danger' ? 'bg-danger' : tone === 'warn' ? 'bg-warn' : 'bg-ok'
  const label = busy
    ? sync.message || '同步中…'
    : failed
      ? '同步失败'
      : degraded
        ? '网络受限'
        : sync.lastSyncAt
          ? `已同步 · ${formatRelative(sync.lastSyncAt)}`
          : '尚未同步'

  const textTone =
    tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-t2'

  return (
    <div className="flex items-center gap-1">
      <div
        className="flex items-center gap-2 rounded-pill border border-line bg-bg2/70 px-3 py-1.5"
        title={sync.lastError ?? (degraded ? '无法访问 Steam API，建议开启 Watt Toolkit 后重试' : label)}
      >
        {busy ? (
          <LoaderCircle className="spin text-warn" size={13} />
        ) : (
          <span className={`size-2 rounded-pill ${dotClass} ${tone === 'ok' ? 'status-dot-live' : ''}`} />
        )}
        <span className={`max-w-[190px] truncate text-xs ${textTone}`}>{label}</span>
        {failed ? <CircleAlert className="text-danger" size={13} /> : null}
      </div>
      <button
        type="button"
        aria-label="立即同步"
        title="立即同步"
        disabled={busy}
        onClick={() => void runSync()}
        className="no-drag flex size-8 items-center justify-center rounded-pill text-t3 transition-colors hover:bg-bg4 hover:text-accent disabled:opacity-40"
      >
        <RefreshCw className={busy ? 'spin' : ''} size={14} />
      </button>
    </div>
  )
}
