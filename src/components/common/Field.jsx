import { useId } from 'react'
import { inputClass } from './styles.js'

function FieldShell({ id, label, error, hint, optional, hideLabel, children }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-ink'}>
        {label}
        {optional && <span className="ml-1 font-normal text-ink-3">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-3">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  )
}

const describedBy = (id, error, hint) => {
  if (error) return `${id}-error`
  return hint ? `${id}-hint` : undefined
}

export function TextField({ label, error, hint, optional, hideLabel, className = '', prefix, ...props }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} hideLabel={hideLabel}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-ink-3" aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          id={id}
          className={`${inputClass(error)} ${prefix ? 'pl-11' : ''} ${className}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(id, error, hint)}
          {...props}
        />
      </div>
    </FieldShell>
  )
}

export function SelectField({ label, error, hint, optional, hideLabel, className = '', children, ...props }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} hideLabel={hideLabel}>
      <select
        id={id}
        className={`${inputClass(error)} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
}

export function TextareaField({ label, error, hint, optional, rows = 3, ...props }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional}>
      <textarea
        id={id}
        rows={rows}
        className={inputClass(error, { multiline: true })}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
      />
    </FieldShell>
  )
}

export function CheckboxField({ label, hint, ...props }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" className="mt-0.5 size-5 accent-[var(--primary)] lg:size-4" {...props} />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-3">{hint}</span>}
      </label>
    </div>
  )
}
