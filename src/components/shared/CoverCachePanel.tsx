import { useCallback, useEffect, useState } from 'react'
import { ImageIcon, RefreshCw, Trash } from 'lucide-react'
import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { bridge } from '@/services/bridge'
import type { CoverCacheStats } from '@/types/ipc'

const MB = 1024 * 1024

function humanBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / MB).toFixed(2)} MB`
}

/**
 * 封面缓存面板（V5 优化 2）。
 *
 * F6 的封面缓存是「只增不减」的：协议层按 appid 缓存 header 图，从设计上就不自动清理
 * （自动清理省几十 MB 却会带来「封面突然全没」的困惑）。但「只增不减」也得有个出口 ——
 * 这里给出占用统计与手动清理按钮。清理是安全的：si-cover 协议对未命中会自动重新下载，
 * 下一次浏览封面时缓存自会回填，不需要任何失效动作。
 */
export function CoverCachePanel({ setMessage }: { setMessage: (message: string | null) => void }) {
  const [stats, setStats] = useState<CoverCacheStats | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setStats(await bridge.covers.stats())
    } catch {
      setStats(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const clear = async (): Promise<void> => {
    // 清理只影响可再生的图片缓存，但「一键没了」的体感仍然强烈，问一句再动手。
    if (!window.confirm(`确定清理封面缓存？已缓存的 ${stats?.count ?? 0} 张封面会被删除，浏览到时自动重新下载。`)) return
    setBusy(true)
    try {
      const r = await bridge.covers.clear()
      if (!r.ok) setMessage('清理封面缓存失败，请查看日志。')
      else setMessage(`已清理封面缓存（${r.cleared} 张）。浏览到对应游戏时会自动重新下载。`)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  // 主进程不可用（预览模式天然返回 0/0，不会走到这里）才隐藏，正常打开总是显示
  if (!stats) return null

  return (
    <Card padding="md">
      <SectionHeader
        title="封面缓存"
        subtitle="浏览过的游戏封面会缓存到本地，再次显示时不再消耗网络"
        icon={<ImageIcon size={15} />}
        action={
          <Badge tone="neutral" size="xs">
            {stats.count > 0 ? `${stats.count} 张 · ${humanBytes(stats.totalBytes)}` : '空'}
          </Badge>
        }
      />
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <Button size="sm" variant="ghost" icon={<RefreshCw size={14} />} loading={busy} onClick={() => void refresh()}>
          刷新统计
        </Button>
        <Button size="sm" variant="danger" icon={<Trash size={14} />} disabled={stats.count === 0} loading={busy} onClick={() => void clear()}>
          清理封面缓存
        </Button>
        <p className="min-w-[260px] flex-1 text-[11.5px] leading-relaxed text-t3">
          清理只影响<span className="text-t2">可再生的图片缓存</span>，不会删除任何账号、同步或笔记数据；
          清理后浏览到对应游戏时封面会自动重新下载。
        </p>
      </div>
    </Card>
  )
}
