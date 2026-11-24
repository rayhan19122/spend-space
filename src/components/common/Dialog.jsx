import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { Button, IconButton } from './Button.jsx'

// Built on the native <dialog>, which provides focus trapping, Escape, the top layer, and
// returning focus to the opener without extra code.
export function Dialog({ open, onClose, title, description, width, children, footer, onSubmit }) {
  const ref = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const Body = onSubmit ? 'form' : 'div'

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Backdrop click is a mouse convenience; Escape is the keyboard route.
    <dialog
      ref={ref}
      className="app-dialog"
      style={width ? { '--dialog-width': width } : undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onMouseDown={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      {open && (
        <Body
          {...(onSubmit ? { onSubmit, noValidate: true } : {})}
          className="flex max-h-[92dvh] flex-col"
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
            <div className="min-w-0 pt-1">
              <h2 id={titleId} className="text-base font-semibold text-ink">{title}</h2>
              {description && <p id={descriptionId} className="mt-1 text-sm text-ink-2">{description}</p>}
            </div>
            <IconButton label="Close" icon={X} onClick={onClose} className="-mr-2" />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="pb-safe flex flex-col-reverse gap-2 border-t border-line px-5 pt-3 sm:flex-row sm:justify-end [&]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </footer>
          )}
        </Body>
      )}
    </dialog>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = true,
  loading = false,
  requireText,
  typedText = '',
  onTypedChange,
  children,
}) {
  const blocked = requireText ? typedText.trim() !== requireText : false
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      width="28rem"
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} disabled={blocked}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-ink-2">
        {description && <p>{description}</p>}
        {children}
        {requireText && (
          <label className="block">
            <span className="mb-1.5 block font-medium text-ink">
              Type <span className="font-semibold">{requireText}</span> to confirm
            </span>
            <input
              className="block h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-base text-ink lg:h-9 lg:text-sm"
              value={typedText}
              onChange={(event) => onTypedChange(event.target.value)}
              autoComplete="off"
            />
          </label>
        )}
      </div>
    </Dialog>
  )
}
