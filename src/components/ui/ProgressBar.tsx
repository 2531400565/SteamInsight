import { clampPercent } from '@/utils/format'

interface ProgressBarProps {
  value: number
  max?: number
  tone?: 'accent' | 'ok' | 'warn' | 'danger'
  height?: number
  showLabel?: boolean
  className?: string
  /**
   * O-4：进度条**画出来**了，读屏软件却只能看见两个空 div。
   * 没有这个名字，用户听到的就是无意义的空白 —— 务必描述「是什么进度的百分之多少」。
   */
  label?: string
}

const TONE: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  accent: 'var(--si-accent)',
  ok: 'var(--si-ok)',
  warn: 'var(--si-warn)',
  danger: 'var(--si-danger)'
}

export function ProgressBar({
  value,
  max = 100,
  tone = 'accent',
  height = 8,
  showLabel = false,
  className = '',
  label
}: ProgressBarProps) {
  const pct = clampPercent((value / max) * 100)
  const color = TONE[tone]
  return (
    <div className={className}>
      <div
        className="w-full rounded-pill bg-bg3 overflow-hidden"
        style={{ height }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-pill transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && (
        <div className="text-t3 text-xs mt-1 text-right">{pct.toFixed(0)}%</div>
      )}
    </div>
  )
}
