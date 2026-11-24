import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useQuickAdd } from '../../context/QuickAddContext.jsx'
import { useDateFormatter, useWrite } from '../../hooks/useData.js'
import { deleteTransaction } from '../../services/transactionService.js'
import { formatMoney } from '../../utils/money.js'
import { paymentMethodLabel } from '../../utils/validation.js'
import { IconButton } from '../common/Button.jsx'
import { Badge } from '../common/Card.jsx'
import { Menu } from '../common/Controls.jsx'
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

// A table from tablet width up, tappable cards on phones. Only one is ever displayed, and
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
      <ul className="-mx-1 divide-y divide-line md:hidden">
        {rows.map((row) => {
          const editable = !compact && isEditable(row)
          const body = (
            <>
              <ColorIcon icon={row.category?.icon} color={row.category?.color ?? '#64748b'} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold text-ink">{row.title}</span>
                  <SignedAmount row={row} className="text-sm" />
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink-3">
                  {row.category?.name} · {formatDate(row.transaction_date)}
                  {!compact && ` · ${paymentMethodLabel(row.payment_method)}`}
                </span>
                {showProject && <span className="mt-1.5 flex"><ProjectBadge project={row.project} /></span>}
                {!compact && row.notes && <span className="mt-1.5 line-clamp-2 block text-xs text-ink-2">{row.notes}</span>}
              </span>
            </>
          )
          return (
            <li key={row.id} className="flex items-start gap-1">
              {editable ? (
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  aria-label={`Edit ${row.title}`}
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-1 py-3 text-left transition-colors active:bg-surface-2"
                >
                  {body}
                </button>
              ) : (
                <div className="flex min-w-0 flex-1 items-start gap-3 px-1 py-3">{body}</div>
              )}
              {editable && (
                <div className="pt-1.5">
                  <Menu
                    label={`Actions for ${row.title}`}
                    trigger={(props) => <IconButton icon={MoreVertical} className="text-ink-3" {...props} label={props['aria-label']} />}
                    items={[
                      { label: 'Edit', icon: Pencil, onSelect: () => onEdit(row) },
                      { label: 'Delete', icon: Trash2, danger: true, onSelect: () => setDeleting(row) },
                    ]}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* Columns appear as the screen widens; hidden ones are folded under the title. */}
      <table className="hidden w-full table-fixed text-sm md:table">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-3">
            <th scope="col" className="pb-2.5 font-medium">Transaction</th>
            {showProject && <th scope="col" className="w-36 pb-2.5 font-medium lg:w-40">Project</th>}
            <th scope="col" className="hidden w-32 pb-2.5 font-medium xl:table-cell">Category</th>
            <th scope="col" className="w-28 pb-2.5 font-medium">Date</th>
            {!compact && <th scope="col" className="hidden w-32 pb-2.5 font-medium min-[1360px]:table-cell">Method</th>}
            <th scope="col" className="w-32 pb-2.5 text-right font-medium">Amount</th>
            {!compact && <th scope="col" className="w-20 pb-2.5"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id} className="group transition-colors hover:bg-surface-2/60">
              <td className="py-2.5 pr-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ColorIcon icon={row.category?.icon} color={row.category?.color ?? '#64748b'} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{row.title}</p>
                    <p className="truncate text-xs text-ink-3">
                      <span className="xl:hidden">{row.category?.name}{!compact && row.notes ? ' · ' : ''}</span>
                      {!compact && row.notes}
                    </p>
                  </div>
                </div>
              </td>
              {showProject && (
                <td className="py-2.5 pr-3"><div className="flex min-w-0"><ProjectBadge project={row.project} /></div></td>
              )}
              <td className="hidden truncate py-2.5 pr-3 text-ink-2 xl:table-cell">{row.category?.name}</td>
              <td className="tabular py-2.5 pr-3 whitespace-nowrap text-ink-2">{formatDate(row.transaction_date)}</td>
              {!compact && <td className="hidden truncate py-2.5 pr-3 text-ink-2 min-[1360px]:table-cell">{paymentMethodLabel(row.payment_method)}</td>}
              <td className="py-2.5 text-right"><SignedAmount row={row} /></td>
              {!compact && (
                <td className="py-1 pl-1">
                  {isEditable(row) ? (
                    <div className="opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <RowActions row={row} onEdit={onEdit} onDelete={setDeleting} />
                    </div>
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
