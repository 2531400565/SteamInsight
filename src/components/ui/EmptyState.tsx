import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-10 px-4 ${className}`}>
      {icon && <div className="text-t3 mb-3">{icon}</div>}
      <div className="text-t2 font-medium">{title}</div>
      {description && <div className="text-t3 text-xs mt-1 max-w-xs">{description}</div>}
      {action && <div className="mt-4 no-drag">{action}</div>}
    </div>
  )
}
