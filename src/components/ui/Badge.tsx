import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  tone?: 'accent' | 'ok' | 'warn' | 'danger' | 'neutral'
  size?: 'xs' | 'sm'
  icon?: ReactNode
  className?: string
  /** 悬浮说明：Badge 常常尺寸太小装不下解释，title 是最省事的补充 */
  title?: string
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

export function Badge({ children, tone = 'neutral', size = 'sm', icon, className = '', title }: BadgeProps) {
  return (
    <span
      title={title}
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
