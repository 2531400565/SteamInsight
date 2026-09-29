interface SkeletonProps {
  className?: string
  rounded?: string
}

export function Skeleton({ className = '', rounded }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={rounded ? { borderRadius: rounded } : undefined}
    />
  )
}
