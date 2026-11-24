import { supabase } from '../lib/supabase.js'

export { supabase }

export function unwrap({ data, error }) {
  if (error) throw error
  return data
}

const PAGE_SIZE = 1000

// The Supabase API returns at most 1,000 rows per request by default. A plain select would
// silently truncate long histories and produce wrong totals, so analytics fetch every page.
// `build` must return a query with a stable order.
export async function fetchAll(build) {
  const rows = []
  for (let start = 0; ; start += PAGE_SIZE) {
    const page = unwrap(await build().range(start, start + PAGE_SIZE - 1))
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}
