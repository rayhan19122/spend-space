import { useState } from 'react'
import { useCategoryLookup, useWrite } from '../../hooks/useData.js'
import { deleteBudget, setBudgetArchived } from '../../services/budgetService.js'
import { budgetProgress } from '../../utils/budgets.js'
import { ConfirmDialog } from '../common/Dialog.jsx'
import { BudgetCard } from './BudgetCard.jsx'
import { BudgetFormDialog } from './BudgetFormDialog.jsx'

export function BudgetGrid({ budgets, rows, readOnly }) {
  const categories = useCategoryLookup()
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const archive = useWrite(
    (userId, { id, isArchived }) => setBudgetArchived(userId, id, isArchived),
    { success: (_data, { isArchived }) => `Budget ${isArchived ? 'archived' : 'restored'}.` },
  )
  const remove = useWrite((userId, id) => deleteBudget(userId, id), {
    success: 'Budget deleted.',
    onSuccess: () => setDeleting(null),
  })

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3">
        {budgets.map((budget) => (
          <BudgetCard
            key={budget.id}
            budget={budget}
            progress={budgetProgress(budget, rows)}
            currency={budget.currency}
            categoryName={budget.category_id ? (categories.get(budget.category_id)?.name ?? 'Category') : null}
            readOnly={readOnly}
            onEdit={() => setEditing(budget)}
            onArchive={(isArchived) => archive.mutate({ id: budget.id, isArchived })}
            onDelete={() => setDeleting(budget)}
          />
        ))}
      </div>

      {editing && <BudgetFormDialog key={editing.id} budget={editing} open onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete this budget?"
        confirmLabel="Delete"
        description={deleting && `"${deleting.name}" will be removed. Your transactions aren't affected.`}
      />
    </>
  )
}
