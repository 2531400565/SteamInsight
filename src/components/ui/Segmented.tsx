import type { ReactNode } from 'react'

interface SegOption {
  value: string
  label: string
  icon?: ReactNode
}

interface SegmentedProps {
  value: string
  options: ReadonlyArray<SegOption>
  onChange: (value: string) => void
  size?: 'sm' | 'md'
  className?: string
}

const SIZE: Record<NonNullable<SegmentedProps['size']>, string> = {
  sm: 'h-7 text-xs',
  md: 'h-9 text-sm'
}

export function Segmented({
  value,
  options,
  onChange,
  size = 'md',
  className = ''
}: SegmentedProps) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  const n = options.length
  return (
    <div
      className={`relative inline-flex items-center rounded-pill bg-bg2 border border-line p-1 ${className}`}
    >
      <span
        className="absolute top-1 bottom-1 rounded-pill bg-bg4 shadow-soft transition-all duration-300 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${n})`,
          left: `calc(0.25rem + (100% - 0.5rem) / ${n} * ${idx})`
        }}
      />
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`relative z-10 flex-1 inline-flex items-center justify-center gap-1.5 rounded-pill font-medium transition-colors px-3 ${SIZE[size]} ${
              selected ? 'text-t1' : 'text-t3 hover:text-t2'
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
