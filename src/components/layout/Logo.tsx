interface LogoProps {
  size?: number
}

/** 应用标识：双圆 + 连杆，向 Steam 的视觉语言致意，但不是官方图标本身。 */
export function Logo({ size = 28 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="si-logo-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--si-accent-3)" />
          <stop offset="1" stopColor="var(--si-accent)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#si-logo-g)" opacity="0.16" />
      <circle cx="16" cy="16" r="15" stroke="url(#si-logo-g)" strokeWidth="1.5" fill="none" />
      <circle cx="12.5" cy="20" r="4.6" fill="url(#si-logo-g)" />
      <circle cx="21" cy="10.5" r="3.1" fill="url(#si-logo-g)" />
      <path
        d="M15.6 17.4 18.7 13.4"
        stroke="url(#si-logo-g)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="12.5" cy="20" r="1.5" fill="var(--si-bg-1)" />
    </svg>
  )
}
