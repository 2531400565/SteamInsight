import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

interface ButtonProps {
  children?: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
  full?: boolean
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  title?: string
  className?: string
}

const VARIANT: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'accent-gradient text-white shadow-soft hover:brightness-110',
  secondary: 'bg-bg3 text-t1 border border-line2 hover:border-line3 hover:bg-bg4',
  ghost: 'bg-transparent text-t2 hover:text-t1 hover:bg-bg3',
  danger: 'bg-danger text-white hover:brightness-110'
}

const SIZE: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-base gap-2 rounded-xl'
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  full = false,
  disabled = false,
  onClick,
  type = 'button',
  title,
  className = ''
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      type={type}
      title={title}
      disabled={isDisabled}
      onClick={onClick}
      className={[
        'no-drag inline-flex items-center justify-center font-medium select-none transition-all duration-200',
        VARIANT[variant],
        SIZE[size],
        full && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? <LoaderCircle className="spin" size={size === 'lg' ? 18 : 16} /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
}
