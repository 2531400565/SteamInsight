import { useCallback, useEffect, useState } from 'react'
import { Activity, CircleCheck, CircleX, Clock, RefreshCw, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { bridge } from '@/services/bridge'
import { useDataStore } from '@/store/useDataStore'
import type { ApiHealthEntry } from '@/types/ipc'
import { formatRelative } from '@/utils/format'

/** 成就数据「多久没更新了」的判定阈值。 */
const STALE_DAYS = 30

/**
 * 数据可信度面板。
 *
 * 解决两类「用户看不出来」的问题：
 *  1. **Steam 悄悄改了接口结构** —— 表现是 HTTP 200、数据条数变少或字段变了，
 *     普通成功/失败统计完全看不见。这里记的是**结构指纹**，变了会明确标红。
 *  2. **成就数据悄悄变旧** —— 同步是增量的（只抓本次玩过的游戏），
 *     长期不玩的游戏成就数会停在旧值。页面上不标出来，就会让人误以为「这是最新的」。
 */
export function DataTrustPanel() {
  const games = useDataStore((s) => s.snapshot?.games)
  const [entries, setEntries] = useState<ApiHealthEntry[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      setEntries(await bridge.net.apiHealth())
    } catch {
      setEntries([])
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // 成就新鲜度：games 里有 lastPlayedAt 的才算「本机还可能在玩」
  const nowSec = Math.floor(Date.now() / 1000)
  const stale = (games ?? []).filter((g) => {
    if (g.achievementsTotal === 0) return false
    const ref = g.lastPlayedAt ?? g.firstPlayedAt
    if (!ref) return true
    return nowSec - ref > STALE_DAYS * 86400
  }).length

  const broken = entries.filter((e) => !e.ok).length

  return (
    <Card padding="md">
      <SectionHeader
        title="数据可信度"
        subtitle="Steam 改接口时会静默少数据；成就增量同步也会让久未游玩的数据变旧。这里把两件事都摊开"
        icon={<Activity size={15} />}
        action={
          <Button size="sm" variant="ghost" icon={<RefreshCw size={14} className={busy ? 'spin' : ''} />} onClick={() => void load()}>
            刷新
          </Button>
        }
      />

      <div className="mt-3 space-y-3">
        {/* 接口结构指纹 */}
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] text-t2">
            接口结构
            {entries.length === 0 ? (
              <span className="text-t3">（完成一次同步后开始记录）</span>
            ) : broken > 0 ? (
              <Badge tone="danger" size="xs">{broken} 个异常</Badge>
            ) : (
              <Badge tone="ok" size="xs">全部正常</Badge>
            )}
          </p>
          {entries.length === 0 ? (
            <p className="text-[11.5px] leading-relaxed text-t3">
              这里记录每个 Steam 接口的<span className="text-t2">响应结构指纹</span>。传统监控只看「请求有没有成功」，
              但 Steam 更常见的情况是**返回 200、字段却变了** —— 那时候只有指纹比对能发现。
            </p>
          ) : (
            <ul className="space-y-1">
              {entries.map((e) => (
                <li key={e.key} className="flex items-center gap-2 rounded-lg border border-line bg-bg1/45 px-2.5 py-1.5 text-[11.5px]">
                  <span className={e.ok ? 'text-ok' : 'text-danger'}>
                    {e.ok ? <CircleCheck size={13} /> : <CircleX size={13} />}
                  </span>
                  <span className="text-t1">{e.label}</span>
                  <span className="truncate font-mono text-[10.5px] text-t3">{e.shape}</span>
                  <span className="ml-auto shrink-0 text-t3">{e.size > 0 ? `${e.size} 条 · ` : ''}{formatRelative(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 成就新鲜度 */}
        <div className="rounded-xl border border-line bg-bg1/40 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[12px] text-t1">
            <Clock size={13} className={stale > 0 ? 'text-warn' : 'text-ok'} />
            成就数据新鲜度
            {stale > 0 ? (
              <Badge tone="warn" size="xs">{stale} 款超过 {STALE_DAYS} 天未更新</Badge>
            ) : (
              <Badge tone="ok" size="xs">全部较新</Badge>
            )}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-t3">
            同步是<span className="text-t2">增量</span>的：只重抓「本次时长增长」的游戏。所以一款游戏
            {stale > 0 ? '很久没玩' : '最近玩过'}之后，它的成就解锁数就会停在最后一次抓取的时刻 ——
            这不是数据丢了，而是「增量策略的必然结果」。想补齐可以在成就中心点「补全成就数据」。
          </p>
          {stale > 0 ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-warn">
              <TriangleAlert size={12} />
              这些游戏的成就数可能不是最新，别把它当成「打满的进度」
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
