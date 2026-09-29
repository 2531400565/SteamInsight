import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface SelectProps {
  value: string
  options: ReadonlyArray<{ value: string; label: string }>
  onChange: (value: string) => void
  label?: string
  disabled?: boolean
  className?: string
}

export function Select({ value, options, onChange, label, disabled = false, className = '' }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const current = options.find((o) => o.value === value)
  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && <div className="text-t3 text-xs mb-1">{label}</div>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="no-drag w-full inline-flex items-center justify-between gap-2 rounded-lg bg-bg3 border border-line2 px-3 h-9 text-sm text-t1 hover:border-line3 transition-colors disabled:opacity-50"
      >
        <span className="truncate">{current?.label ?? '请选择'}</span>
        <ChevronDown size={16} className={`text-t3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-line2 bg-bg2 shadow-card overflow-hidden pop-enter max-h-60 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-bg3 ${
                o.value === value ? 'text-accent' : 'text-t1'
              }`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
