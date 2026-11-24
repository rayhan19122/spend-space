import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DATE_PRESETS, describeRange, isValidISO, rangeForPreset } from '../utils/dates.js'

// Filters live in the URL, so back, refresh and shared links all keep them.
export function useDateRange(defaultPreset = 'this-month') {
  const [params, setParams] = useSearchParams()
  const rawPreset = params.get('range')
  const preset = DATE_PRESETS.some((p) => p.value === rawPreset) ? rawPreset : defaultPreset

  const value = useMemo(() => {
    if (preset !== 'custom') return { preset, ...rangeForPreset(preset) }
    const from = params.get('from')
    const to = params.get('to')
    return { preset, from: isValidISO(from) ? from : null, to: isValidISO(to) ? to : null }
  }, [preset, params])

  const update = useCallback(
    (changes) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, val] of Object.entries(changes)) {
            if (val) next.set(key, val)
            else next.delete(key)
          }
          next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const setPreset = useCallback(
    (next) => {
      if (next === 'custom') {
        const { from, to } = value
        update({ range: 'custom', from, to })
      } else {
        update({ range: next, from: null, to: null })
      }
    },
    [update, value],
  )

  return {
    ...value,
    setPreset,
    setFrom: useCallback((from) => update({ range: 'custom', from }), [update]),
    setTo: useCallback((to) => update({ range: 'custom', to }), [update]),
    isInverted: Boolean(value.from && value.to && value.from > value.to),
    describe: (pattern) => describeRange(value, pattern),
  }
}
