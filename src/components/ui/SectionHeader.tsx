import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function SectionHeader({ title, subtitle, icon, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <span className="text-accent shrink-0">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-t1 font-semibold text-[15px] leading-tight truncate">{title}</h3>
          {subtitle && <p className="text-t3 text-xs mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 no-drag">{action}</div>}
    </div>
  )
}
