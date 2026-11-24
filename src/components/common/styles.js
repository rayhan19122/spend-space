const BUTTON_BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

const BUTTON_VARIANTS = {
  primary: 'bg-primary text-primary-ink shadow-primary hover:bg-primary-hover',
  secondary: 'border border-line bg-surface text-ink shadow-card hover:border-line-strong hover:bg-surface-2',
  soft: 'bg-primary-soft text-primary-soft-ink hover:bg-primary-soft/70',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90 dark:text-[#14181e]',
  dangerOutline: 'border border-line bg-surface text-danger hover:bg-danger-soft',
}

// Phone sizes meet the 44px touch-target guideline; desktop tightens up.
const BUTTON_SIZES = {
  sm: 'h-10 px-3 text-sm lg:h-8 lg:px-2.5',
  md: 'h-11 px-4 text-sm lg:h-9 lg:px-3.5',
  icon: 'size-11 lg:size-9',
}

export const buttonClass = ({ variant = 'secondary', size = 'md', className = '' } = {}) =>
  `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`

// 16px text on phones stops iOS Safari zooming the page when a field gets focus.
export const inputClass = (hasError, { multiline = false } = {}) =>
  `block w-full min-w-0 rounded-xl border bg-surface px-3 text-base text-ink shadow-card transition-[border-color,box-shadow] placeholder:text-ink-3 hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none lg:text-sm ${
    multiline ? 'py-2' : 'h-11 lg:h-9'
  } ${hasError ? 'border-danger' : 'border-line'}`

export const cardClass = 'rounded-2xl border border-line bg-surface shadow-card'
