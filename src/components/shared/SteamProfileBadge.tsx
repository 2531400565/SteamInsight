import { Award, Sparkles, TrendingUp } from 'lucide-react'
import type { SteamUser } from '@/types/steam'
import { formatCount } from '@/utils/format'

/**
 * Steam 会员概览（V3 / F-6）。
 *
 * 数据是 `IPlayerService/GetBadges` 顺手带回来的（已有 API Key 就能调，几十字节），
 * 展示也很轻 —— 但它回答的是「我在 Steam 上到底走了多远」，
 * 而这是本应用**唯一能免费拿到**的"资历"数据：等级、徽章数、经验。
 *
 * 取值全部降级为 0：老账号同步过一次之后才有值；
 * 等级为 0 时整个组件不渲染 —— 与其显示「等级 0」这种像是出错了的数字，不如什么都不说。
 */
export interface ProfileBadgeProps {
  user: SteamUser | null | undefined
  /** 紧凑模式只显示「Lv.X · N 枚徽章」一行，给标题栏用 */
  compact?: boolean
}

export function hasProfileLevel(user: SteamUser | null | undefined): boolean {
  return !!user && (user.level ?? 0) > 0
}

export function SteamProfileBadge({ user, compact = false }: ProfileBadgeProps) {
  if (!hasProfileLevel(user)) return null
  const level = user!.level ?? 0
  const badges = user!.badgeCount ?? 0
  const xpToNext = user!.xpToNext ?? 0

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill border border-line2 bg-accent3/12 px-2 py-0.5 text-[11px] text-accent">
        <Sparkles size={11} />
        Lv.{level}
        {badges > 0 ? <span className="text-t3">· {badges} 枚徽章</span> : null}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-bg1/45 px-3 py-2.5">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent3/15 text-accent">
        <TrendingUp size={18} />
      </div>
      <div className="min-w-0">
        <p className="flex items-baseline gap-1.5">
          <span className="text-[17px] font-semibold text-t1">Lv.{level}</span>
          <span className="text-[11.5px] text-t3">Steam 等级</span>
        </p>
        <p className="mt-0.5 text-[11px] text-t3">
          {badges > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Award size={11} />
              {badges} 枚徽章 · 徽章经验 {formatCount(user!.badgeXp ?? 0)}
            </span>
          ) : (
            '徽章数据未获取'
          )}
          {xpToNext > 0 ? ` · 距下一级还需 ${formatCount(xpToNext)} 经验` : ''}
        </p>
      </div>
    </div>
  )
}
