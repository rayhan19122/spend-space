import { createContext, use, useCallback, useMemo, useState } from 'react'
import { TransactionDialog } from '../components/transactions/TransactionDialog.jsx'

const QuickAddContext = createContext(null)

// One transaction dialog for the whole app, reachable from navigation, cards and lists.
export function QuickAddProvider({ children }) {
  const [state, setState] = useState(null)
  const [dialogKey, setDialogKey] = useState(0)

  const open = useCallback((options = {}) => {
    setDialogKey((key) => key + 1)
    setState(options)
  }, [])

  const close = useCallback(() => setState(null), [])
  const value = useMemo(() => ({ open }), [open])

  return (
    <QuickAddContext value={value}>
      {children}
      <TransactionDialog key={dialogKey} open={Boolean(state)} options={state ?? {}} onClose={close} />
    </QuickAddContext>
  )
}

export function useQuickAdd() {
  return use(QuickAddContext)
}
