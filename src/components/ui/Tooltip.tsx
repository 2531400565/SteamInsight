import type { ReactNode } from 'react'

interface TooltipProps {
  label: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
}

export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  const pos =
    side === 'top'
      ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
      : 'top-full mt-2 left-1/2 -translate-x-1/2'
  return (
    <span className="relative inline-flex group no-drag">
      {children}
      <span
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-bg3 border border-line2 px-2 py-1 text-xs text-t1 shadow-card opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 ${pos}`}
      >
        {label}
      </span>
    </span>
  )
}
