import { CheckCircle2, X, XCircle } from 'lucide-react'
import { createContext, use, useCallback, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

const DISMISS_AFTER_MS = 4500

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), [])

  const push = useCallback(
    (tone, message) => {
      const id = nextId.current++
      setToasts((list) => [...list.slice(-2), { id, tone, message }])
      setTimeout(() => dismiss(id), DISMISS_AFTER_MS)
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
    }),
    [push],
  )

  return (
    <ToastContext value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-center gap-2 lg:inset-x-auto lg:top-auto lg:right-6 lg:bottom-6 lg:items-end"
      >
        {toasts.map((toast) => {
          const Icon = toast.tone === 'success' ? CheckCircle2 : XCircle
          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className="toast-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 glass rounded-2xl border px-3.5 py-3 text-sm text-ink"
            >
              <Icon className={`mt-0.5 size-4 shrink-0 ${toast.tone === 'success' ? 'text-income' : 'text-danger'}`} aria-hidden="true" />
              <p className="min-w-0 flex-1">{toast.message}</p>
              <button type="button" aria-label="Dismiss" onClick={() => dismiss(toast.id)} className="-m-1 rounded p-1 text-ink-3 hover:text-ink">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext>
  )
}

export function useToast() {
  return use(ToastContext)
}
