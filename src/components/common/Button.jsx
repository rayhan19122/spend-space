import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonClass } from './styles.js'

export function Button({ variant, size, className, loading = false, disabled, children, type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant, size, className, children, ...props }) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </Link>
  )
}

// Icon-only buttons must always have a screen-reader label.
export function IconButton({ label, icon: Icon, variant = 'ghost', className, ...props }) {
  return (
    <Button variant={variant} size="icon" className={className} aria-label={label} title={label} {...props}>
      <Icon className="size-[18px]" aria-hidden="true" />
    </Button>
  )
}
