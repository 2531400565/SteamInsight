import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange?: (next: number) => void
  size?: number
  /** 只读时显示为纯展示，不出现 hover 效果 */
  readOnly?: boolean
  labels?: [string, string, string, string, string]
}

const DEFAULT_LABELS: [string, string, string, string, string] = ['很差', '一般', '还行', '不错', '神作']

/**
 * 5 星评分。点同一颗星可以取消（回到 0 = 未评分）——
 * 否则用户点错了就再也回不到「不评分」的状态，只能清空整条笔记。
 */
export function StarRating({ value, onChange, size = 18, readOnly = false, labels = DEFAULT_LABELS }: StarRatingProps) {
  const interactive = !readOnly && typeof onChange === 'function'
  return (
    <div className="flex items-center gap-1" role={interactive ? 'radiogroup' : undefined} aria-label="我的评分">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value
        const cls = filled ? 'text-warn' : 'text-t3'
        if (!interactive) {
          return <Star key={n} size={size} className={cls} fill={filled ? 'currentColor' : 'none'} />
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} 星 · ${labels[n - 1]}`}
            title={`${n} 星 · ${labels[n - 1]}`}
            onClick={() => onChange?.(value === n ? 0 : n)}
            className="rounded-pill p-0.5 transition-transform hover:scale-110"
          >
            <Star size={size} className={cls} fill={filled ? 'currentColor' : 'none'} />
          </button>
        )
      })}
      <span className="ml-1 text-[11.5px] text-t3">{value > 0 ? labels[value - 1] : '未评分'}</span>
    </div>
  )
}
