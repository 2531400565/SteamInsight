import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  glow?: boolean
}

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
}

export function Card({ children, className = '', hover = false, padding = 'md', glow = false }: CardProps) {
  const cls = ['card', hover && 'card-hover', PADDING[padding], className].filter(Boolean).join(' ')
  return (
    <div className={cls} style={glow ? { boxShadow: 'var(--si-shadow-glow)' } : undefined}>
      {children}
    </div>
  )
}
