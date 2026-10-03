import { CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { formatRelative } from '@/utils/format'

/**
 * 同步状态指示：绿点=正常，黄点=进行中/网络受限，红点=上次同步失败。
 * 数据来源是主进程广播的 SyncStatusPayload，不在这里做任何猜测。
 *
 * 「网络受限」只在**没有任何成功记录**时才显示：detection 是应用启动时取的一次快照
 * （useAppStore.boot），之后不刷新。加速器（Watt / Steam++）刚启动那一瞬探测可能失败，
 * 于是顶栏会把「网络受限」黄灯一直挂着，哪怕两分钟后同步成功、数据哗哗地更新了。
 * 同步成功本身就是「链路通」最强的证据 —— 真实同步要打十几个接口，比探测严格得多，
 * 所以 lastSyncOk === true 时一律不显示受限（useAppStore.runSync 成功后会再刷新一次
 * detection，让标签回到准确状态）。
 */
export function SyncIndicator() {
  const sync = useAppStore((s) => s.sync)
  const detection = useAppStore((s) => s.detection)
  const runSync = useAppStore((s) => s.runSync)

  const failed = sync.lastSyncOk === false || Boolean(sync.lastError)
  const busy = sync.running
  const syncedBefore = sync.lastSyncOk === true
  const degraded = !busy && !failed && !syncedBefore && detection !== null && !detection.apiReachable

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
