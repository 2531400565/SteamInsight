import type { ReactNode } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Card } from './Card'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: ReactNode
  unit?: string
  delta?: number | null
  hint?: string
  accent?: string
  className?: string
}

export function StatCard({
  icon,
  label,
  value,
  unit,
  delta,
  hint,
  accent,
  className = ''
}: StatCardProps) {
  const hasDelta = typeof delta === 'number' && delta !== null
  const positive = (delta ?? 0) >= 0
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-t3 text-xs">{label}</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-t1 text-2xl font-semibold leading-none">{value}</span>
            {unit && <span className="text-t3 text-sm">{unit}</span>}
          </div>
          {hint && <div className="text-t3 text-xs mt-1 truncate">{hint}</div>}
        </div>
        <span
          className="p-2 rounded-xl bg-bg3 shrink-0"
          style={accent ? { color: accent } : undefined}
        >
          {icon}
        </span>
      </div>
      {hasDelta && (
        <div
          className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${positive ? 'text-ok' : 'text-danger'}`}
        >
          {positive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {Math.abs(delta as number).toFixed(1)}%
        </div>
      )}
    </Card>
  )
}
