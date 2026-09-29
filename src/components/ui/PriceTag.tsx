import { formatMoney, formatDiscount } from '@/utils/format'

interface PriceTagProps {
  originalCents: number
  finalCents: number
  discountPercent: number
  isHistoricalLow?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SIZE: Record<NonNullable<PriceTagProps['size']>, { price: string; badge: string; low: string }> = {
  sm: { price: 'text-sm', badge: 'text-[10px] px-1', low: 'text-[10px] px-1' },
  md: { price: 'text-lg', badge: 'text-xs px-1.5', low: 'text-xs px-1.5' },
  lg: { price: 'text-2xl', badge: 'text-xs px-2', low: 'text-sm px-2' }
}

export function PriceTag({
  originalCents,
  finalCents,
  discountPercent,
  isHistoricalLow = false,
  size = 'md'
}: PriceTagProps) {
  const s = SIZE[size]
  const hasDiscount = discountPercent > 0 && finalCents < originalCents
  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <span className={`font-semibold text-t1 ${s.price}`}>{formatMoney(finalCents)}</span>
      {hasDiscount && (
        <>
          <span className="text-t3 line-through text-sm">{formatMoney(originalCents)}</span>
          <span className={`rounded-pill bg-danger/15 text-danger font-semibold ${s.badge}`}>
            {formatDiscount(discountPercent)}
          </span>
        </>
      )}
      {isHistoricalLow && (
        <span className={`rounded-pill bg-ok/15 text-ok font-semibold ${s.low}`}>史低</span>
      )}
    </div>
  )
}
