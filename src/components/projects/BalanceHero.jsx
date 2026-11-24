import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react'
import { formatMoney } from '../../utils/money.js'

function HeroFigure({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/12 px-3.5 py-3 ring-1 ring-white/15 backdrop-blur-sm">
      <p className="flex items-center gap-1.5 text-xs font-medium text-white/80">
        <Icon className="size-3.5" aria-hidden="true" /> {label}
      </p>
      <p className="font-display tabular mt-1 truncate text-base font-semibold text-white lg:text-lg">{value}</p>
    </div>
  )
}

// The headline card: net balance large, income and expenses beneath. With a type filter it
// leads with the one visible side instead of a net that would be misleading.
export function BalanceHero({ totals, currency, type, eyebrow, caption }) {
  const lead = type === 'income'
    ? { label: 'Income', value: totals.incomeMinor }
    : type === 'expense'
      ? { label: 'Expenses', value: totals.expenseMinor }
      : { label: 'Net balance', value: totals.netMinor }
  const negative = !type && totals.netMinor < 0

  return (
    <section aria-label={lead.label} className="bg-hero fade-up relative isolate min-w-0 overflow-hidden rounded-3xl p-5 text-white shadow-float lg:p-6">
      <svg className="pointer-events-none absolute -top-16 -right-16 -z-10 size-64 opacity-30" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="70" fill="none" stroke="white" strokeOpacity=".35" strokeWidth="1" />
        <circle cx="100" cy="100" r="96" fill="none" stroke="white" strokeOpacity=".2" strokeWidth="1" />
        <circle cx="100" cy="100" r="44" fill="none" stroke="white" strokeOpacity=".45" strokeWidth="1" />
      </svg>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white/75">{eyebrow}</p>
          <p className="mt-1 text-sm font-medium text-white/90">{lead.label}</p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
          <Scale className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="font-display tabular mt-2 text-3xl leading-none font-bold tracking-tight break-words sm:text-4xl lg:text-[44px]">
        {negative && <span className="sr-only">Negative </span>}
        {formatMoney(lead.value, currency)}
      </p>
      {caption && <p className="mt-2 text-xs text-white/70">{caption}</p>}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <HeroFigure label="Income" icon={ArrowDownLeft} value={type === 'expense' ? '—' : formatMoney(totals.incomeMinor, currency)} />
        <HeroFigure label="Expenses" icon={ArrowUpRight} value={type === 'income' ? '—' : formatMoney(totals.expenseMinor, currency)} />
      </div>
    </section>
  )
}
