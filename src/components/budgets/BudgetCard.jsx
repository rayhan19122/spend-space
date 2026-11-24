import { AlertTriangle, Archive, ArchiveRestore, CheckCircle2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useDateFormatter } from '../../hooks/useData.js'
import { PERIOD_LABELS } from '../../utils/budgets.js'
import { formatMoney } from '../../utils/money.js'
import { Button } from '../common/Button.jsx'
import { Badge } from '../common/Card.jsx'
import { Menu, ProgressBar } from '../common/Controls.jsx'
import { cardClass } from '../common/styles.js'

function StatusBadge({ progress }) {
  if (progress.isOver) {
    return <Badge tone="danger"><AlertTriangle className="size-3" aria-hidden="true" /> Over budget</Badge>
  }
  if (progress.isNearLimit) {
    return <Badge tone="warning"><AlertTriangle className="size-3" aria-hidden="true" /> Near limit</Badge>
  }
  if (progress.state === 'upcoming') return <Badge>Not started</Badge>
  if (progress.state === 'ended') return <Badge>Ended</Badge>
  return <Badge tone="income"><CheckCircle2 className="size-3" aria-hidden="true" /> On track</Badge>
}

export function BudgetCard({ budget, progress, currency, categoryName, readOnly, onEdit, onArchive, onDelete }) {
  const formatDate = useDateFormatter()
  const money = (minor) => formatMoney(minor, currency)
  const tone = progress.isOver ? 'danger' : progress.isNearLimit ? 'warning' : 'neutral'

  return (
    <article className={`${cardClass} min-w-0 p-4 ${budget.is_archived ? 'opacity-70' : ''}`}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink">{budget.name}</h3>
          <p className="truncate text-xs text-ink-3">
            {categoryName ?? 'Whole project'} · {PERIOD_LABELS[budget.period]}
          </p>
        </div>
        {!readOnly && (
          <Menu
            label={`Actions for ${budget.name}`}
            trigger={(props) => (
              <Button variant="ghost" size="icon" className="-mt-1 -mr-1.5" {...props}>
                <MoreHorizontal className="size-[18px]" aria-hidden="true" />
              </Button>
            )}
            items={[
              { label: 'Edit', icon: Pencil, onSelect: onEdit },
              budget.is_archived
                ? { label: 'Restore', icon: ArchiveRestore, onSelect: () => onArchive(false) }
                : { label: 'Archive', icon: Archive, onSelect: () => onArchive(true) },
              { label: 'Delete', icon: Trash2, danger: true, onSelect: onDelete },
            ]}
          />
        )}
      </header>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="min-w-0 text-xl font-semibold tracking-tight break-words text-ink">
          {money(progress.spentMinor)}
          <span className="text-sm font-normal text-ink-3"> of {money(progress.amountMinor)}</span>
        </p>
        <p className="tabular shrink-0 text-sm font-medium text-ink-2">{progress.percentUsed}%</p>
      </div>

      <div className="mt-2">
        <ProgressBar percent={progress.percentUsed} tone={tone} label={`${budget.name} used`} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className={progress.isOver ? 'font-medium text-danger' : 'text-ink-2'}>
          {progress.isOver
            ? `${money(-progress.remainingMinor)} over`
            : `${money(progress.remainingMinor)} remaining`}
        </p>
        <StatusBadge progress={progress} />
      </div>

      <p className="mt-2 text-xs text-ink-3">
        <span className="sr-only">Period: </span>
        {formatDate(progress.window.from)} – {formatDate(progress.window.to)}
      </p>
    </article>
  )
}
