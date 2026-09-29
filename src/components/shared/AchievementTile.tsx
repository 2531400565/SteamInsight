import { useState } from 'react'
import { Lock, Star, Trophy } from 'lucide-react'
import type { Achievement } from '@/types/steam'
import { Badge } from '@/components/ui'
import { formatPercent, formatRelative, rarityLabel } from '@/utils/format'

interface AchievementTileProps {
  achievement: Achievement
  gameName?: string
  gameHeader?: string
  onOpenGame?: (appId: number) => void
}

/** 成就条目。未解锁的显示灰色图标 + 锁标记，避免与已解锁混淆。 */
export function AchievementTile({ achievement, gameName, gameHeader, onOpenGame }: AchievementTileProps) {
  const [broken, setBroken] = useState(false)
  const rarity = rarityLabel(achievement.globalPercent)
  const icon = achievement.unlocked ? achievement.iconUrl : achievement.iconGrayUrl
  const showFallback = broken || !icon

  return (
    <div
      className={[
        'flex items-start gap-3 rounded-xl border p-3 transition-colors',
        achievement.unlocked ? 'border-line bg-bg2/60' : 'border-line bg-bg1/50 opacity-75'
      ].join(' ')}
    >
      <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-line bg-bg3">
        {showFallback ? (
          <div className="flex size-full items-center justify-center text-t3">
            {achievement.unlocked ? <Trophy size={18} /> : <Lock size={16} />}
          </div>
        ) : (
          <img
            src={icon}
            alt={achievement.displayName}
            onError={() => setBroken(true)}
            className={achievement.unlocked ? 'size-full object-cover' : 'size-full object-cover grayscale'}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[13px] font-medium text-t1" title={achievement.displayName}>
            {achievement.displayName}
          </p>
          {achievement.isRare ? (
            <Badge tone={rarity.tone} size="xs" icon={<Star size={9} />}>
              {rarity.label}
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[11.5px] text-t3" title={achievement.description}>
          {achievement.description || (achievement.hidden ? '隐藏成就' : '暂无描述')}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-t3">
          {gameName ? (
            <button
              type="button"
              disabled={!onOpenGame || !gameHeader}
              onClick={() => onOpenGame?.(achievement.appId)}
              className="truncate text-accent transition-colors hover:underline disabled:text-t3 disabled:no-underline"
              title={gameName}
            >
              {gameName}
            </button>
          ) : null}
          <span>·</span>
          {/* globalPercent 为 0 = Steam 未给出该成就的全球占比（未知），不能显示成「0.0% 玩家拥有」 */}
          <span>
            {achievement.globalPercent > 0
              ? `全球 ${formatPercent(achievement.globalPercent, 1)} 玩家拥有`
              : '全球占比未知'}
          </span>
          <span>·</span>
          <span>{achievement.unlocked ? formatRelative(achievement.unlockedAt, '已解锁') : '未解锁'}</span>
        </div>
      </div>
    </div>
  )
}
