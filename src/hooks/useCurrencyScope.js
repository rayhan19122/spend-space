import { useMemo } from 'react'
import { useParamState } from './useParamState.js'

// Global views total one currency at a time, because amounts can't be added without conversion.
// Returns the chosen currency, the available ones, and how many projects the choice leaves out.
export function useCurrencyScope(projects, fallbackCurrency) {
  const [selected, setSelected] = useParamState('currency')
  const currencies = useMemo(
    () => [...new Set(projects.map((project) => project.currency))].sort(),
    [projects],
  )

  let currency = selected
  if (!currencies.includes(currency)) {
    currency = currencies.includes(fallbackCurrency) ? fallbackCurrency : (currencies[0] ?? fallbackCurrency)
  }

  const scopedProjects = useMemo(
    () => projects.filter((project) => project.currency === currency),
    [projects, currency],
  )

  return {
    currency,
    setCurrency: setSelected,
    currencies,
    scopedProjects,
    excludedCount: projects.length - scopedProjects.length,
  }
}
