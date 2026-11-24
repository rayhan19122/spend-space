import { Plus, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BudgetFormDialog } from '../components/budgets/BudgetFormDialog.jsx'
import { BudgetGrid } from '../components/budgets/BudgetGrid.jsx'
import { Button } from '../components/common/Button.jsx'
import { Card, EmptyState, ErrorState, LoadingBlock } from '../components/common/Card.jsx'
import { CheckboxField } from '../components/common/Field.jsx'
import { ColorIcon } from '../components/common/Identity.jsx'
import { useBudgetExpenses, useBudgets, useProjects } from '../hooks/useData.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'

export default function BudgetsPage() {
  useDocumentTitle('Budgets')
  const { active, isPending: projectsPending } = useProjects()
  const { data, isPending, error, refetch } = useBudgets()
  const [showArchived, setShowArchived] = useState(false)
  const [creating, setCreating] = useState(false)

  const activeIds = useMemo(() => new Set(active.map((project) => project.id)), [active])
  const budgets = useMemo(
    () => (data ?? []).filter((b) => activeIds.has(b.project_id) && (showArchived || !b.is_archived)),
    [activeIds, data, showArchived],
  )
  const expenses = useBudgetExpenses(budgets)
  const hasArchived = (data ?? []).some((b) => b.is_archived && activeIds.has(b.project_id))

  const addButton = active.length > 0 && (
    <Button variant="primary" onClick={() => setCreating(true)}>
      <Plus className="size-4" aria-hidden="true" /> New budget
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">Budgets from all active projects. Each one tracks only its own project.</p>
        {addButton}
      </div>
      {hasArchived && <CheckboxField label="Show archived budgets" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />}

      {error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : isPending || projectsPending || (budgets.length > 0 && expenses.isPending) ? (
        <LoadingBlock label="Loading budgets" rows={3} />
      ) : budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="No budgets yet"
            description={active.length ? 'Set a limit for a project or a category and see how much is left.' : 'Create a project first, then give it a budget.'}
            action={addButton || <Link to="/projects?new=1" className="font-medium text-link hover:underline">Create a project</Link>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {active
            .filter((project) => budgets.some((b) => b.project_id === project.id))
            .map((project) => (
              <section key={project.id} aria-labelledby={`budgets-${project.id}`} className="space-y-3">
                <h2 id={`budgets-${project.id}`} className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <ColorIcon icon={project.icon} color={project.color} size="sm" />
                  <Link to={`/projects/${project.id}/budgets`} className="hover:underline">{project.name}</Link>
                </h2>
                <BudgetGrid budgets={budgets.filter((b) => b.project_id === project.id)} rows={expenses.data ?? []} />
              </section>
            ))}
        </div>
      )}

      {creating && <BudgetFormDialog open onClose={() => setCreating(false)} />}
    </div>
  )
}
