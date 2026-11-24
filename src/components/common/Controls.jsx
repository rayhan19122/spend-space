import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Button, IconButton } from './Button.jsx'

export function Segmented({ label, options, value, onChange, size = 'md', className = '' }) {
  const heights = size === 'sm' ? 'h-9 lg:h-7 text-xs' : 'h-11 lg:h-9 text-sm'
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex max-w-full rounded-xl bg-surface-2 p-1 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-lg px-3 font-medium whitespace-nowrap transition-colors ${heights} ${
              selected ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function ProgressBar({ percent, tone = 'neutral', label }) {
  const fill = { neutral: 'bg-brand', warning: 'bg-warning', danger: 'bg-danger' }[tone]
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div className={`progress-fill h-full rounded-full transition-[width] duration-300 ${fill}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

export function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(total, page * pageSize)
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm text-ink-2">
      <p className="tabular" aria-live="polite">
        {first.toLocaleString('en')}–{last.toLocaleString('en')} of {total.toLocaleString('en')}
      </p>
      <div className="flex items-center gap-1">
        <IconButton label="Previous page" icon={ChevronLeft} variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} />
        <IconButton label="Next page" icon={ChevronRight} variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)} />
      </div>
    </nav>
  )
}

// A small actions menu. Closes on outside click, Escape, or choosing an item.
const MENU_WIDTH = 224
const EDGE_GAP = 8

export function Menu({ label, trigger, items, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState(align)
  const root = useRef(null)
  const menuId = useId()

  // Open towards whichever side has room, so the menu never runs off a narrow screen.
  useLayoutEffect(() => {
    if (!open || !root.current) return
    const { left, right } = root.current.getBoundingClientRect()
    const fitsLeftAligned = left + MENU_WIDTH <= window.innerWidth - EDGE_GAP
    const fitsRightAligned = right - MENU_WIDTH >= EDGE_GAP
    setSide(align === 'left' ? (fitsLeftAligned || !fitsRightAligned ? 'left' : 'right') : (fitsRightAligned || !fitsLeftAligned ? 'right' : 'left'))
  }, [align, open])

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        root.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (open) root.current?.querySelector('[role="menuitem"]')?.focus()
  }, [open])

  const moveFocus = (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    const entries = [...root.current.querySelectorAll('[role="menuitem"]')]
    const index = entries.indexOf(document.activeElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    entries[(index + step + entries.length) % entries.length]?.focus()
  }

  return (
    <div ref={root} className="relative">
      {trigger({
        'aria-label': label,
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? menuId : undefined,
        onClick: () => setOpen((value) => !value),
      })}
      {open && (
        // eslint-disable-next-line jsx-a11y/interactive-supports-focus -- Focus moves to the items, which is the menu pattern.
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={moveFocus}
          className={`absolute z-30 mt-2 max-h-80 w-56 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-float ${
            side === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item, index) =>
            item.heading ? (
              <div key={index} className="truncate px-2.5 py-2 text-xs text-ink-3">{item.heading}</div>
            ) : (
              <Button
                key={item.label}
                role="menuitem"
                variant="ghost"
                className={`h-11 w-full justify-start px-2.5 font-normal lg:h-9 ${item.danger ? 'text-danger hover:text-danger' : ''}`}
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
              >
                {item.icon && <item.icon className="size-4 shrink-0" aria-hidden="true" />}
                <span className="truncate">{item.label}</span>
              </Button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
