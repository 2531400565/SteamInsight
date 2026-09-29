import type { ReactNode } from 'react'

interface PanelProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  glow?: boolean
}

const PADDING: Record<NonNullable<PanelProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
}

export function Panel({ children, className = '', hover = false, padding = 'md', glow = false }: PanelProps) {
  const cls = ['glass', 'rounded-card', 'shadow-soft', hover && 'card-hover', PADDING[padding], className]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} style={glow ? { boxShadow: 'var(--si-shadow-glow)' } : undefined}>
      {children}
    </div>
  )
}
