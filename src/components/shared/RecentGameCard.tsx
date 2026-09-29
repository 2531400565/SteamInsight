import { Clock } from 'lucide-react'
import type { RankingRow } from '@/types/steam'
import { GameCover } from '@/components/ui'
import { formatHours, formatRelative } from '@/utils/format'

interface RecentGameCardProps {
  row: RankingRow
  onOpen?: (appId: number) => void
  /** 展示「最近游玩」而不是「总时长」的场景 */
  variant?: 'played' | 'recent'
}

/** 最近游玩 / 排行榜条：封面 + 名称 + 时长，整卡可点进详情。 */
export function RecentGameCard({ row, onOpen, variant = 'recent' }: RecentGameCardProps) {
  const clickable = Boolean(onOpen)
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => onOpen?.(row.appId)}
      className={[
        'card card-hover group w-[184px] shrink-0 overflow-hidden text-left',
        clickable ? 'cursor-pointer' : 'cursor-default'
      ].join(' ')}
    >
      <div className="relative h-[84px] w-full overflow-hidden">
        <GameCover src={row.headerImage} name={row.name} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg2 via-transparent to-transparent" />
      </div>
      <div className="space-y-1 p-2.5">
        <p className="truncate text-[12.5px] font-medium text-t1" title={row.name}>
          {row.name}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-t3">
          <Clock size={11} />
          {variant === 'played' ? (
            <span>区间 {formatHours(row.rangeMinutes)} 小时</span>
          ) : (
            <span>{formatRelative(row.lastPlayedAt, '从未游玩')}</span>
          )}
        </div>
      </div>
    </button>
  )
}
