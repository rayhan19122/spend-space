import { cardClass } from './styles.js'

const TONES = {
  neutral: 'text-ink',
  income: 'text-income',
  danger: 'text-danger',
}

// Icon chips carry a tint per meaning; the number itself keeps its tone color.
const CHIPS = {
  neutral: 'bg-primary-soft text-primary-soft-ink',
  income: 'bg-income-soft text-income',
  danger: 'bg-danger-soft text-danger',
}

export function StatCard({ label, value, sub, tone = 'neutral', icon: Icon, chip }) {
  return (
    <div className={`${cardClass} lift fade-up min-w-0 p-4 lg:p-5`}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium tracking-wide text-ink-2 uppercase">{label}</p>
        {Icon && (
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${CHIPS[chip ?? tone]}`}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className={`font-display tabular mt-2 text-xl leading-tight font-bold tracking-tight break-words lg:text-[26px] ${TONES[tone]}`}>{value}</p>
      {sub && <p className="mt-1 truncate text-xs text-ink-3" title={typeof sub === 'string' ? sub : undefined}>{sub}</p>}
    </div>
  )
}
