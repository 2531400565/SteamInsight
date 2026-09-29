import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  tone?: 'accent' | 'ok' | 'warn' | 'danger' | 'neutral'
  size?: 'xs' | 'sm'
  icon?: ReactNode
  className?: string
}

const BTONE: Record<NonNullable<BadgeProps['tone']>, string> = {
  accent: 'bg-accent/15 text-accent',
  ok: 'bg-ok/15 text-ok',
  warn: 'bg-warn/15 text-warn',
  danger: 'bg-danger/15 text-danger',
  neutral: 'bg-bg4 text-t2'
}

const BSIZE: Record<NonNullable<BadgeProps['size']>, string> = {
  xs: 'text-[10px] px-1.5 py-0.5 gap-1',
  sm: 'text-xs px-2 py-0.5 gap-1'
}

export function Badge({ children, tone = 'neutral', size = 'sm', icon, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-pill font-medium whitespace-nowrap',
        BTONE[tone],
        BSIZE[size],
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon}
      {children}
    </span>
  )
}
