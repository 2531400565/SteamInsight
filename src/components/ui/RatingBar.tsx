import { clampPercent } from '@/utils/format'

interface RatingBarProps {
  percent: number
  count?: number
  className?: string
}

export function RatingBar({ percent, count, className = '' }: RatingBarProps) {
  const p = clampPercent(percent)
  const tone = p >= 90 ? 'var(--si-ok)' : p >= 70 ? 'var(--si-warn)' : 'var(--si-danger)'
  const label = p >= 90 ? '好评' : p >= 70 ? '褒贬不一' : '差评'
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        {/* O-4：读屏软件看这条 bar 只会遇到两个空 div，这里给它一个「好评率 X%」的名字 */}
        <div
          className="flex-1 h-2 rounded-pill bg-bg3 overflow-hidden"
          role="meter"
          aria-valuenow={Math.round(p)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`好评率 ${p.toFixed(0)}%，${label}${count !== undefined ? `，共 ${count.toLocaleString('zh-CN')} 条评测` : ''}`}
        >
          <div className="h-full rounded-pill" style={{ width: `${p}%`, background: tone }} />
        </div>
        {/* 百分比本身是视觉重复，读屏无需再念一遍 */}
        <span aria-hidden="true" className="text-xs font-medium" style={{ color: tone }}>
          {p.toFixed(0)}%
        </span>
      </div>
      <div className="flex items-center justify-between mt-1 text-[11px] text-t3">
        <span>{label}</span>
        {count !== undefined && <span>{count.toLocaleString('zh-CN')} 评测</span>}
      </div>
    </div>
  )
}
