import type { ReactNode } from 'react'

interface IconButtonProps {
  children: ReactNode
  label: string
  onClick?: () => void
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'solid'
  disabled?: boolean
  className?: string
}

const IVARIANT: Record<NonNullable<IconButtonProps['variant']>, string> = {
  ghost: 'bg-transparent text-t2 hover:text-t1 hover:bg-bg3',
  solid: 'bg-bg3 text-t1 border border-line2 hover:bg-bg4'
}

const ISIZE: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-9 w-9 rounded-lg'
}

export function IconButton({
  children,
  label,
  onClick,
  size = 'md',
  variant = 'ghost',
  disabled = false,
  className = ''
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        'no-drag inline-flex items-center justify-center transition-colors',
        IVARIANT[variant],
        ISIZE[size],
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
