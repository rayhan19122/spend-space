export function LogoMark({ className = 'size-7' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <rect x="8" y="8" width="7" height="7" rx="1.5" fill="var(--primary-ink)" />
      <rect x="17" y="8" width="7" height="7" rx="1.5" fill="var(--primary-ink)" opacity=".55" />
      <rect x="8" y="17" width="7" height="7" rx="1.5" fill="var(--primary-ink)" opacity=".55" />
      <rect x="17" y="17" width="7" height="7" rx="1.5" fill="#34d399" />
    </svg>
  )
}

export function Logo({ tagline = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="min-w-0">
        <span className="block text-[15px] leading-tight font-semibold tracking-tight text-ink">SpendSpace</span>
        {tagline && <span className="block truncate text-xs leading-tight text-ink-3">Every expense has its place.</span>}
      </span>
    </span>
  )
}
