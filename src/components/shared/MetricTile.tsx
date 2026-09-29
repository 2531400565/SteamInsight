import type { ReactNode } from 'react'

interface MetricTileProps {
  label: string
  value: ReactNode
  unit?: string
  hint?: string
  icon?: ReactNode
  /** 右侧或下方的补充信息 */
  extra?: ReactNode
  className?: string
}

/** 紧凑指标块：用于游戏详情、Wrapped 这类「一堆并列小数字」的场景。 */
export function MetricTile({ label, value, unit, hint, icon, extra, className = '' }: MetricTileProps) {
  return (
    <div className={`rounded-xl border border-line bg-bg2/55 px-3 py-2.5 ${className}`}>
      <div className="flex items-center gap-1.5 text-[11.5px] text-t3">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-[19px] font-semibold leading-none text-t1">{value}</span>
        {unit ? <span className="text-[11.5px] text-t3">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-t3">{hint}</p> : null}
      {extra}
    </div>
  )
}
