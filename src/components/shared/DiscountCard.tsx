import type { ReactNode } from 'react'
import { ExternalLink, Timer } from 'lucide-react'
import { Badge, GameCover, PriceTag, ProgressBar, Tooltip } from '@/components/ui'
import { formatCount, formatCountdown, formatPercent } from '@/utils/format'
import { useNow } from '@/hooks/useNow'

interface DiscountCardProps {
  name: string
  headerImage: string
  originalPriceCents: number
  finalPriceCents: number
  discountPercent: number
  isHistoricalLow: boolean
  reviewPercent?: number
  reviewCount?: number
  tags?: string[]
  endsAt?: number | null
  onOpenStore: () => void
  onOpenDetail?: () => void
  /** 卡片底部额外区域（愿望单用来放「取消关注」等操作） */
  footer?: ReactNode
}

/** 折扣 / 愿望单通用卡片。价格一律走 PriceTag，货币符号与「免费」判定只有一处口径。 */
export function DiscountCard({
  name,
  headerImage,
  originalPriceCents,
  finalPriceCents,
  discountPercent,
  isHistoricalLow,
  reviewPercent,
  reviewCount,
  tags = [],
  endsAt,
  onOpenStore,
  onOpenDetail,
  footer
}: DiscountCardProps) {
  useNow(60_000)
  const countdown = formatCountdown(endsAt, '')

  return (
    <div className="card card-hover flex flex-col overflow-hidden">
      <div className="relative">
        <button
          type="button"
          onClick={onOpenStore}
          title={`在 Steam 商店打开《${name}》`}
          className="block h-[104px] w-full overflow-hidden"
        >
          <GameCover src={headerImage} name={name} className="h-full w-full" />
        </button>
        {discountPercent > 0 ? (
          <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-pill accent-gradient px-2.5 py-1 text-[12px] font-semibold text-white shadow-soft">
            -{Math.round(discountPercent)}%
          </span>
        ) : null}
        {isHistoricalLow ? (
          <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-pill border border-ok/50 bg-bg1/85 px-2 py-0.5 text-[11px] font-medium text-ok">
            史低
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <button
          type="button"
          disabled={!onOpenDetail}
          onClick={() => onOpenDetail?.()}
          className="truncate text-left text-[13px] font-medium text-t1 disabled:cursor-default hover:text-accent"
          title={name}
        >
          {name}
        </button>

        {typeof reviewPercent === 'number' ? (
          <Tooltip label={`好评率 ${formatPercent(reviewPercent)}${reviewCount ? ` · ${formatCount(reviewCount)} 篇评测` : ''}`}>
            <div className="w-full">
              <ProgressBar
                value={reviewPercent}
                tone={reviewPercent >= 90 ? 'ok' : reviewPercent >= 70 ? 'warn' : 'danger'}
                height={4}
                label={`《${name}》好评率 ${formatPercent(reviewPercent)}${reviewCount ? ` · ${formatCount(reviewCount)} 篇评测` : ''}`}
              />
            </div>
          </Tooltip>
        ) : null}

        <div className="flex items-end justify-between gap-2">
          <PriceTag
            originalCents={originalPriceCents}
            finalCents={finalPriceCents}
            discountPercent={discountPercent}
            isHistoricalLow={isHistoricalLow}
            size="md"
          />
          <button
            type="button"
            onClick={onOpenStore}
            className="flex items-center gap-1 rounded-pill border border-line2 px-2.5 py-1 text-[11.5px] text-accent transition-colors hover:bg-accent3/15"
          >
            <ExternalLink size={12} />
            商店
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {countdown ? (
            <Badge tone="warn" size="xs" icon={<Timer size={10} />}>
              {countdown}
            </Badge>
          ) : null}
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag} tone="neutral" size="xs">
              {tag}
            </Badge>
          ))}
        </div>

        {footer ? <div className="mt-auto pt-1">{footer}</div> : null}
      </div>
    </div>
  )
}
