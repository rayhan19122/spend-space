import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useId, useState } from 'react'
import { DATE_PRESETS } from '../../utils/dates.js'
import { CURRENCIES } from '../../utils/currency.js'
import { Banner } from './Card.jsx'
import { SelectField, TextField } from './Field.jsx'
import { Segmented } from './Controls.jsx'

const BAR_BASE =
  'grid grid-cols-2 items-start gap-x-3 gap-y-2.5 [&>*]:min-w-0 [&_label]:mb-1 [&_label]:text-xs [&_label]:font-medium [&_label]:text-ink-3'
// Few filters keep a comfortable width; a long set splits into even rows instead of leaving one alone.
const COLUMNS = {
  auto: 'sm:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]',
  six: 'sm:grid-cols-3 min-[1440px]:grid-cols-6',
  // A lone filter gets the full width on phones instead of half of it.
  stack: 'max-sm:grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]',
}

// On phones a long row of dropdowns pushes the content below the fold, so `collapsible` folds the
// filters behind one button that says what is applied. From the sm breakpoint up they are always shown.
export function FilterBar({ label = 'Filters', children, collapsible = false, activeCount = 0, summary, columns = 'auto' }) {
  const BAR_CLASS = `${BAR_BASE} ${COLUMNS[columns]}`
  const [open, setOpen] = useState(false)
  const panelId = useId()
  if (!collapsible) {
    return <div role="group" aria-label={label} className={BAR_CLASS}>{children}</div>
  }
  return (
    <div className="min-w-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-full items-center gap-2.5 glass-control rounded-xl px-3.5 text-left text-sm transition-colors sm:hidden"
      >
        <SlidersHorizontal className="size-4 shrink-0 text-ink-2" aria-hidden="true" />
        <span className="font-medium text-ink">Filters</span>
        {activeCount > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-[11px] leading-5 font-semibold text-primary-ink">{activeCount}</span>
        )}
        {summary && <span className="min-w-0 flex-1 truncate text-right text-ink-3">{summary}</span>}
        <ChevronDown className={`size-4 shrink-0 text-ink-3 transition-transform ${open ? 'rotate-180' : ''} ${summary ? '' : 'ml-auto'}`} aria-hidden="true" />
      </button>
      <div id={panelId} role="group" aria-label={label} className={`${BAR_CLASS} ${open ? 'mt-3' : 'max-sm:hidden'}`}>
        {children}
      </div>
    </div>
  )
}

export function DateRangeFilter({ range }) {
  return (
    <>
      <SelectField label="Date range" value={range.preset} onChange={(event) => range.setPreset(event.target.value)}>
        {DATE_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
      </SelectField>
      {range.preset === 'custom' && (
        <>
          <TextField
            label="From"
            type="date"
            value={range.from ?? ''}
            onChange={(event) => range.setFrom(event.target.value)}
            error={range.isInverted ? 'Must be before the end date.' : undefined}
          />
          <TextField label="To" type="date" value={range.to ?? ''} onChange={(event) => range.setTo(event.target.value)} />
        </>
      )}
    </>
  )
}

export function ProjectFilter({ active, archived, value, onChange, allLabel = 'All active projects' }) {
  return (
    <SelectField label="Project" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{allLabel}</option>
      {active.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      {archived.length > 0 && (
        <optgroup label="Archived">
          {archived.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </optgroup>
      )}
    </SelectField>
  )
}

export function TypeFilter({ value, onChange }) {
  return (
    <SelectField label="Type" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">All types</option>
      <option value="expense">Expenses only</option>
      <option value="income">Income only</option>
    </SelectField>
  )
}

const currencyName = (code) => CURRENCIES.find((currency) => currency.code === code)?.name ?? code

// Shown only when a person's projects use more than one currency.
export function CurrencyScope({ scope }) {
  if (scope.currencies.length < 2) return null
  return (
    <div className="space-y-2">
      <Segmented
        label="Currency"
        options={scope.currencies.map((code) => ({ value: code, label: code }))}
        value={scope.currency}
        onChange={scope.setCurrency}
      />
      <Banner tone="neutral">
        Showing {currencyName(scope.currency)} projects only. {scope.excludedCount} project
        {scope.excludedCount === 1 ? ' uses' : 's use'} another currency and {scope.excludedCount === 1 ? 'is' : 'are'} not
        included, because amounts are never converted or added across currencies.
      </Banner>
    </div>
  )
}
