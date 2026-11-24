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
    <article className={`${cardClass} flex min-w-0 flex-col p-4`}>
      <header className="flex items-start gap-3">
        <ColorIcon icon={project.icon} color={project.color} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-ink">{project.name}</h2>
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

      <dl className="mt-4 flex-1 space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-2">Spent (all time)</dt>
          <dd className="tabular font-semibold text-ink">{money(spentMinor)}</dd>
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

      <footer className="mt-4 flex items-center justify-between gap-2">
        {project.is_archived ? <Badge>Archived</Badge> : <span />}
        <ButtonLink to={open} size="sm">
          Open project <ArrowRight className="size-3.5" aria-hidden="true" />
        </ButtonLink>
      </footer>
    </article>
  )
}
