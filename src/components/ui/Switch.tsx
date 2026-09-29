interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, description, disabled = false }: SwitchProps) {
  const btn = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center rounded-pill transition-colors duration-200 shrink-0 ${
        checked ? 'bg-accent' : 'bg-bg4'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ width: 40, height: 22 }}
    >
      <span
        className={`absolute rounded-pill bg-white transition-all duration-200 ${
          checked ? 'left-[20px]' : 'left-0.5'
        }`}
        style={{ width: 18, height: 18, top: 2 }}
      />
    </button>
  )
  if (!label && !description) return btn
  return (
    <label className={`flex items-center justify-between gap-3 ${disabled ? 'opacity-60' : ''}`}>
      <div className="min-w-0">
        {label && <div className="text-t1 text-sm">{label}</div>}
        {description && <div className="text-t3 text-xs mt-0.5">{description}</div>}
      </div>
      {btn}
    </label>
  )
}
