import { AlertTriangle, RefreshCw } from 'lucide-react'
import { friendlyError } from '../../utils/errors.js'
import { Button } from './Button.jsx'
import { cardClass } from './styles.js'

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`${cardClass} ${className}`} {...props}>
      {children}
    </div>
  )
}

export function SectionCard({ title, subtitle, action, className = '', bodyClassName = 'p-4 lg:px-6 lg:pt-4 lg:pb-6', children }) {
  return (
    <section className={`${cardClass} fade-up min-w-0 ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-4 lg:px-6 lg:pt-5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

const BADGE_TONES = {
  neutral: 'bg-surface-2 text-ink-2',
  primary: 'bg-primary-soft text-primary-soft-ink',
  income: 'bg-income-soft text-income',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${BADGE_TONES[tone]} ${className}`}>
      {children}
    </span>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function LoadingBlock({ label = 'Loading', className = '', rows = 3 }) {
  return (
    <div role="status" className={`space-y-3 ${className}`}>
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}
    </div>
  )
}

export function StatsSkeleton({ count = 4 }) {
  return (
    <div role="status" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <span className="sr-only">Loading figures…</span>
      {Array.from({ length: count }, (_, index) => <Skeleton key={index} className="h-[88px] rounded-xl" />)}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  return (
    <div className={`flex flex-col items-center px-4 text-center ${compact ? 'py-6' : 'py-12'}`}>
      {Icon && (
        <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-ink ring-8 ring-primary-soft/40">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      )}
      <p className="font-display text-base font-bold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-2">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = "Couldn't load this" }) {
  return (
    <div role="alert" className="flex flex-col items-center px-4 py-10 text-center">
      <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-danger-soft text-danger">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-2">{friendlyError(error)}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  )
}

export function Banner({ tone = 'warning', icon: Icon, children, action }) {
  const tones = {
    warning: 'border-warning/30 bg-warning-soft text-warning',
    neutral: 'border-line bg-surface-2 text-ink-2',
    danger: 'border-danger/30 bg-danger-soft text-danger',
  }
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`}>
      <p className="flex min-w-0 items-start gap-2">
        {Icon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
        <span>{children}</span>
      </p>
      {action}
    </div>
  )
}
