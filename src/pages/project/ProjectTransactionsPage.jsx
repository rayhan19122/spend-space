import { TransactionBrowser } from '../../components/transactions/TransactionBrowser.jsx'
import { useProjectContext } from './useProjectContext.js'

export default function ProjectTransactionsPage() {
  return <TransactionBrowser project={useProjectContext()} />
}
