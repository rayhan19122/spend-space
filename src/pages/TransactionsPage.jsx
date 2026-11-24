import { Repeat } from 'lucide-react'
import { ButtonLink } from '../components/common/Button.jsx'
import { TransactionBrowser } from '../components/transactions/TransactionBrowser.jsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'

export default function TransactionsPage() {
  useDocumentTitle('Transactions')
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-2">Every transaction, across all projects.</p>
        <ButtonLink to="/recurring" size="sm" variant="ghost" className="max-lg:hidden">
          <Repeat className="size-4" aria-hidden="true" /> Recurring rules
        </ButtonLink>
      </div>
      <TransactionBrowser />
    </div>
  )
}
