import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

// A single filter value stored in the URL. Changing a filter returns to the first page.
export function useParamState(key, fallback = '') {
  const [params, setParams] = useSearchParams()
  const value = params.get(key) ?? fallback
  const setValue = useCallback(
    (next) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current)
          if (next && next !== fallback) updated.set(key, next)
          else updated.delete(key)
          if (key !== 'page') updated.delete('page')
          return updated
        },
        { replace: true },
      )
    },
    [fallback, key, setParams],
  )
  return [value, setValue]
}
