import { DATE_PRESETS } from '../../utils/dates.js'
import { CURRENCIES } from '../../utils/currency.js'
import { Banner } from './Card.jsx'
import { SelectField, TextField } from './Field.jsx'
import { Segmented } from './Controls.jsx'

export function FilterBar({ label = 'Filters', children }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 items-start gap-2.5 sm:flex sm:flex-wrap sm:items-end [&>*]:min-w-0 sm:[&>*]:w-44 [&_label]:mb-1 [&_label]:text-xs [&_label]:font-medium [&_label]:text-ink-3">
      {children}
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
