import { Archive, ArchiveRestore, ArrowRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatMoney } from '../../utils/money.js'
import { Button, ButtonLink } from '../common/Button.jsx'
import { Badge } from '../common/Card.jsx'
import { Menu, ProgressBar } from '../common/Controls.jsx'
import { ColorIcon } from '../common/Identity.jsx'
import { cardClass } from '../common/styles.js'

export function ProjectCard({ project, spentMinor, budget, onEdit, onArchive, onDelete }) {
  const navigate = useNavigate()
  const open = `/projects/${project.id}`
  const money = (minor) => formatMoney(minor, project.currency)

  return (
    <article className={`${cardClass} lift fade-up relative isolate flex min-w-0 flex-col p-5`}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 rounded-t-3xl"
        style={{ background: `radial-gradient(120% 100% at 0% 0%, color-mix(in srgb, ${project.color} 26%, transparent), transparent 70%)` }}
        aria-hidden="true"
      />
      <header className="flex items-start gap-3">
        <ColorIcon icon={project.icon} color={project.color} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-ink">{project.name}</h2>
          <p className="truncate text-xs text-ink-3">{project.description || `${project.currency} project`}</p>
        </div>
        <Menu
          label={`Actions for ${project.name}`}
          trigger={(props) => (
            <Button variant="ghost" size="icon" className="-mt-1 -mr-1.5" {...props}>
              <MoreHorizontal className="size-[18px]" aria-hidden="true" />
            </Button>
          )}
          items={[
            { label: 'Open', icon: ArrowRight, onSelect: () => navigate(open) },
            { label: 'Edit', icon: Pencil, onSelect: onEdit },
            project.is_archived
              ? { label: 'Restore', icon: ArchiveRestore, onSelect: () => onArchive(false) }
              : { label: 'Archive', icon: Archive, onSelect: () => onArchive(true) },
            { label: 'Delete', icon: Trash2, danger: true, onSelect: onDelete },
          ]}
        />
      </header>

      <dl className="mt-5 flex-1 space-y-2.5 text-sm">
        <div>
          <dt className="text-xs font-medium text-ink-3">Spent (all time)</dt>
          <dd className="font-display tabular mt-0.5 text-2xl font-bold tracking-tight text-ink">{money(spentMinor)}</dd>
        </div>
        {budget.budgetCount > 0 && (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-2">Current budget</dt>
              <dd className="tabular text-ink">{money(budget.amountMinor)}</dd>
            </div>
            <ProgressBar
              percent={budget.percentUsed}
              tone={budget.spentMinor > budget.amountMinor ? 'danger' : 'neutral'}
              label={`Budget used for ${project.name}`}
            />
            <p className="text-xs text-ink-3">
              {budget.spentMinor > budget.amountMinor
                ? `${money(budget.spentMinor - budget.amountMinor)} over budget`
                : `${money(budget.remainingMinor)} left this period`}
            </p>
          </>
        )}
      </dl>

      <footer className="mt-5 flex items-center justify-between gap-2 border-t border-line pt-4">
        {project.is_archived ? <Badge>Archived</Badge> : <span />}
        <ButtonLink to={open} size="sm" variant="soft">
          Open project <ArrowRight className="size-3.5" aria-hidden="true" />
        </ButtonLink>
      </footer>
    </article>
  )
}
