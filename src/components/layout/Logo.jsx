import { useId } from 'react'

export function LogoMark({ className = 'size-8' }) {
  const id = useId()
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f46e5" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <rect x="8" y="8" width="7" height="7" rx="2" fill="#fff" />
      <rect x="17" y="8" width="7" height="7" rx="2" fill="#fff" opacity=".55" />
      <rect x="8" y="17" width="7" height="7" rx="2" fill="#fff" opacity=".55" />
      <rect x="17" y="17" width="7" height="7" rx="2" fill="#34d399" />
    </svg>
  )
}

export function Logo({ tagline = false, className = '' }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-9" />
      <span className="min-w-0">
        <span className="font-display block text-base leading-tight font-bold tracking-tight text-ink">SpendSpace</span>
        {tagline && <span className="block truncate text-xs leading-tight text-ink-3">Every expense has its place.</span>}
      </span>
    </span>
  )
}
