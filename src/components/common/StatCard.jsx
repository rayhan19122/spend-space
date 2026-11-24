import { cardClass } from './styles.js'

const TONES = {
  neutral: 'text-ink',
  income: 'text-income',
  danger: 'text-danger',
}

export function StatCard({ label, value, sub, tone = 'neutral', icon: Icon }) {
  return (
    <div className={`${cardClass} min-w-0 p-3.5 lg:p-4`}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
        {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
        <span className="truncate">{label}</span>
      </p>
      <p className={`mt-1.5 text-lg leading-tight font-semibold tracking-tight break-words lg:text-2xl ${TONES[tone]}`}>{value}</p>
      {sub && <p className="mt-1 truncate text-xs text-ink-3" title={typeof sub === 'string' ? sub : undefined}>{sub}</p>}
    </div>
  )
}
