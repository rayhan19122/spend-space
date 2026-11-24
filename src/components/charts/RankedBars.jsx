import { Link } from 'react-router-dom'
import { foldTail } from '../../utils/analytics.js'
import { formatMoney } from '../../utils/money.js'

// A ranked list as HTML: one series in one color, each value printed beside its bar.
// Being plain rows of text, it is its own table view and needs no tooltip.
export function RankedBars({ rows, currency, label }) {
  const visible = foldTail(rows)
  const largest = Math.max(...visible.map((row) => row.amountMinor), 1)
  return (
    <ul aria-label={label} className="space-y-3">
      {visible.map((row) => {
        const name = (
          <span className="flex min-w-0 items-center gap-2">
            {row.color && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" />}
            <span className="truncate">{row.label}</span>
          </span>
        )
        return (
          <li key={row.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              {row.to ? <Link to={row.to} className="min-w-0 font-medium text-ink hover:underline">{name}</Link> : <span className="min-w-0 font-medium text-ink">{name}</span>}
              <span className="tabular shrink-0 text-ink">
                {formatMoney(row.amountMinor, currency)}
                {row.percent !== undefined && <span className="ml-1.5 text-xs text-ink-3">{row.percent}%</span>}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-2" aria-hidden="true">
              <div className="h-full rounded-full bg-chart-1" style={{ width: `${(row.amountMinor / largest) * 100}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
