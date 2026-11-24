import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useQuickAdd } from '../../context/QuickAddContext.jsx'
import { useDateFormatter, useWrite } from '../../hooks/useData.js'
import { deleteTransaction } from '../../services/transactionService.js'
import { formatMoney } from '../../utils/money.js'
import { paymentMethodLabel } from '../../utils/validation.js'
import { IconButton } from '../common/Button.jsx'
import { Badge } from '../common/Card.jsx'
import { ConfirmDialog } from '../common/Dialog.jsx'
import { ColorIcon, ProjectBadge } from '../common/Identity.jsx'

export function SignedAmount({ row, className = '' }) {
  const signed = row.type === 'income' ? row.amount_minor : -row.amount_minor
  return (
    <span className={`tabular font-semibold whitespace-nowrap ${row.type === 'income' ? 'text-income' : 'text-ink'} ${className}`}>
      {formatMoney(signed, row.currency, { sign: 'always' })}
      <span className="sr-only"> {row.type}</span>
    </span>
  )
}

function RowActions({ row, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end">
      <IconButton label={`Edit ${row.title}`} icon={Pencil} onClick={() => onEdit(row)} />
      <IconButton label={`Delete ${row.title}`} icon={Trash2} onClick={() => onDelete(row)} />
    </div>
  )
}

// A table on large screens, readable cards on phones. Only one is ever displayed, and
// display:none also hides the other from screen readers.
export function TransactionList({ rows, showProject = true, compact = false }) {
  const quickAdd = useQuickAdd()
  const formatDate = useDateFormatter()
  const [deleting, setDeleting] = useState(null)

  const remove = useWrite((userId, id) => deleteTransaction(userId, id), {
    success: 'Transaction deleted.',
    onSuccess: () => setDeleting(null),
  })

  const onEdit = (row) => quickAdd.open({ transaction: row })
  const isEditable = (row) => !row.project?.is_archived

  return (
    <>
      <ul className="divide-y divide-line lg:hidden">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <ColorIcon icon={row.category?.icon} color={row.category?.color ?? '#64748b'} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium text-ink">{row.title}</p>
                <SignedAmount row={row} className="text-sm" />
              </div>
              <p className="mt-0.5 truncate text-xs text-ink-3">
                {row.category?.name} · {formatDate(row.transaction_date)}
              </p>
              {showProject && <div className="mt-1.5 flex"><ProjectBadge project={row.project} /></div>}
              {!compact && row.notes && <p className="mt-1.5 line-clamp-2 text-xs text-ink-2">{row.notes}</p>}
              {!compact && isEditable(row) && (
                <div className="-mr-2 -mb-2 flex items-center justify-end">
                  <RowActions row={row} onEdit={onEdit} onDelete={setDeleting} />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <table className="hidden w-full table-fixed text-sm lg:table">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-3">
            <th scope="col" className="pb-2 font-medium">Title</th>
            {showProject && <th scope="col" className="w-40 pb-2 font-medium">Project</th>}
            <th scope="col" className="w-36 pb-2 font-medium">Category</th>
            <th scope="col" className="w-28 pb-2 font-medium">Date</th>
            {!compact && <th scope="col" className="w-32 pb-2 font-medium">Method</th>}
            <th scope="col" className="w-32 pb-2 text-right font-medium">Amount</th>
            {!compact && <th scope="col" className="w-20 pb-2"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-surface-2/60">
              <td className="py-2 pr-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ColorIcon icon={row.category?.icon} color={row.category?.color ?? '#64748b'} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{row.title}</p>
                    {!compact && row.notes && <p className="truncate text-xs text-ink-3">{row.notes}</p>}
                  </div>
                </div>
              </td>
              {showProject && (
                <td className="py-2 pr-3"><div className="flex min-w-0"><ProjectBadge project={row.project} /></div></td>
              )}
              <td className="truncate py-2 pr-3 text-ink-2">{row.category?.name}</td>
              <td className="tabular py-2 pr-3 whitespace-nowrap text-ink-2">{formatDate(row.transaction_date)}</td>
              {!compact && <td className="truncate py-2 pr-3 text-ink-2">{paymentMethodLabel(row.payment_method)}</td>}
              <td className="py-2 text-right"><SignedAmount row={row} /></td>
              {!compact && (
                <td className="py-1 pl-1">
                  {isEditable(row) ? (
                    <RowActions row={row} onEdit={onEdit} onDelete={setDeleting} />
                  ) : (
                    <div className="flex justify-end"><Badge>Archived</Badge></div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete this transaction?"
        confirmLabel="Delete"
        description={
          deleting &&
          `"${deleting.title}" (${formatMoney(deleting.amount_minor, deleting.currency)}) will be permanently removed and totals will update. This can't be undone.`
        }
      />
    </>
  )
}
