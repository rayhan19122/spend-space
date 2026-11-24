import { Plus, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/common/Button.jsx'
import { Card, EmptyState, ErrorState, LoadingBlock } from '../../components/common/Card.jsx'
import { CheckboxField } from '../../components/common/Field.jsx'
import { BudgetFormDialog } from '../../components/budgets/BudgetFormDialog.jsx'
import { BudgetGrid } from '../../components/budgets/BudgetGrid.jsx'
import { useBudgetExpenses, useBudgets } from '../../hooks/useData.js'
import { useProjectContext } from './useProjectContext.js'

export default function ProjectBudgetsPage() {
  const project = useProjectContext()
  const { data, isPending, error, refetch } = useBudgets(project.id)
  const [showArchived, setShowArchived] = useState(false)
  const [creating, setCreating] = useState(false)

  const budgets = useMemo(() => (data ?? []).filter((b) => showArchived || !b.is_archived), [data, showArchived])
  const expenses = useBudgetExpenses(budgets, project.id)
  const hasArchived = (data ?? []).some((b) => b.is_archived)
  const addButton = !project.is_archived && (
    <Button variant="primary" onClick={() => setCreating(true)}>
      <Plus className="size-4" aria-hidden="true" /> New budget
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">Budgets count expenses in {project.name} during each period. Income is never counted.</p>
        {addButton}
      </div>
      {hasArchived && <CheckboxField label="Show archived budgets" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />}

      {error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : isPending || (budgets.length > 0 && expenses.isPending) ? (
        <LoadingBlock label="Loading budgets" rows={3} />
      ) : budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="No budgets yet"
            description="Set a limit for the whole project or a single category, and see how much is left."
            action={addButton}
          />
        </Card>
      ) : (
        <BudgetGrid budgets={budgets} rows={expenses.data ?? []} readOnly={project.is_archived} />
      )}

      {creating && <BudgetFormDialog projectId={project.id} open onClose={() => setCreating(false)} />}
    </div>
  )
}
