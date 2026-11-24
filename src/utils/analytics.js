// Pure calculations over transaction rows: { type, amount_minor, currency, transaction_date,
// project_id, category_id }. Callers pass rows in a single currency; amounts in different
// currencies cannot be added without conversion, which this app does not do.
import { bucketKey, bucketsBetween, daysBetweenInclusive, todayISO } from './dates.js'
import { divideRounded, percentOf, sumMinor } from './money.js'

const amountsOf = (rows, type) =>
  rows.filter((row) => row.type === type).map((row) => row.amount_minor)

export function totals(rows) {
  const incomeMinor = sumMinor(amountsOf(rows, 'income'))
  const expenseMinor = sumMinor(amountsOf(rows, 'expense'))
  return { incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor, count: rows.length }
}

export function currenciesIn(rows) {
  return [...new Set(rows.map((row) => row.currency))].sort()
}

export const inCurrency = (rows, currency) => rows.filter((row) => row.currency === currency)

// [{ key, incomeMinor, expenseMinor, netMinor, count }], largest expense first.
export function groupTotals(rows, keyOf) {
  const groups = new Map()
  for (const row of rows) {
    const key = keyOf(row)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  return [...groups.entries()]
    .map(([key, group]) => ({ key, ...totals(group) }))
    .sort((a, b) => b.expenseMinor - a.expenseMinor || b.incomeMinor - a.incomeMinor)
}

export const totalsByProject = (rows) => groupTotals(rows, (row) => row.project_id)
export const totalsByCategory = (rows) => groupTotals(rows, (row) => row.category_id)

// Categories belong to a project, so "Food" in two projects is two rows. Global views
// combine them by name, which is why this takes a lookup rather than comparing IDs.
export function shareByCategoryName(rows, type, categoryName) {
  const matching = rows.filter((row) => row.type === type)
  const whole = sumMinor(matching.map((row) => row.amount_minor))
  const groups = new Map()
  for (const row of matching) {
    const name = categoryName(row.category_id) ?? 'Unknown'
    groups.set(name, (groups.get(name) ?? 0) + row.amount_minor)
  }
  return [...groups.entries()]
    .map(([name, amountMinor]) => ({ name, amountMinor, percent: percentOf(amountMinor, whole) }))
    .sort((a, b) => b.amountMinor - a.amountMinor || a.name.localeCompare(b.name))
}

const MAX_RANKED_ROWS = 7

// Folds the long tail into "Other", so a ranked list stays readable. Totals are unchanged.
export function foldTail(rows, maxRows = MAX_RANKED_ROWS) {
  if (rows.length <= maxRows + 1) return rows
  const tail = rows.slice(maxRows)
  const amountMinor = sumMinor(tail.map((row) => row.amountMinor))
  const whole = sumMinor(rows.map((row) => row.amountMinor))
  return [
    ...rows.slice(0, maxRows),
    { key: '__other', label: `Other (${tail.length})`, amountMinor, percent: percentOf(amountMinor, whole) },
  ]
}

export function trendSeries(rows, granularity, from, to) {
  if (!from || !to || from > to) return []
  const series = bucketsBetween(from, to, granularity).map((bucket) => ({
    ...bucket,
    incomeMinor: 0,
    expenseMinor: 0,
  }))
  const byKey = new Map(series.map((point) => [point.key, point]))
  for (const row of rows) {
    const point = byKey.get(bucketKey(row.transaction_date, granularity))
    if (!point) continue
    if (row.type === 'income') point.incomeMinor += row.amount_minor
    else point.expenseMinor += row.amount_minor
  }
  return series
}

// Picks a sensible default so a year is not drawn as 365 thin bars.
export function suggestGranularity(from, to) {
  if (!from || !to) return 'monthly'
  const days = daysBetweenInclusive(from, to)
  if (days <= 45) return 'daily'
  if (days <= 180) return 'weekly'
  return 'monthly'
}

// The span a report covers. "All time" runs from the first record to today.
export function effectiveRange(rows, from, to, today = todayISO()) {
  if (from && to) return { from, to }
  if (!rows.length) return { from: from ?? null, to: to ?? null }
  const dates = rows.map((row) => row.transaction_date).sort()
  const latest = dates.at(-1) > today ? dates.at(-1) : today
  return { from: from ?? dates[0], to: to ?? latest }
}

// Days that haven't happened yet don't count, or "This year" in November would understate the
// average. A range ending in the past uses its full length.
export function averageDailySpending(rows, from, to, today = todayISO()) {
  if (!from || !to || from > to) return 0
  const latest = rows.reduce((max, row) => (row.transaction_date > max ? row.transaction_date : max), today)
  const end = to < latest ? to : latest
  if (end < from) return 0
  const expense = sumMinor(amountsOf(rows, 'expense'))
  return divideRounded(expense, daysBetweenInclusive(from, end))
}

export function largestExpense(rows) {
  let largest = null
  for (const row of rows) {
    if (row.type !== 'expense') continue
    if (!largest || row.amount_minor > largest.amount_minor) largest = row
  }
  return largest
}

// Requires at least two expenses in a category: one purchase is not a pattern.
export function mostFrequentCategory(rows) {
  const counts = new Map()
  for (const row of rows) {
    if (row.type === 'expense') counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1)
  }
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
  return top && top[1] >= 2 ? { categoryId: top[0], count: top[1] } : null
}

// Requires spending on at least two different days, or "highest" means nothing.
export function highestSpendingDay(rows) {
  const days = new Map()
  for (const row of rows) {
    if (row.type === 'expense') {
      days.set(row.transaction_date, (days.get(row.transaction_date) ?? 0) + row.amount_minor)
    }
  }
  if (days.size < 2) return null
  const [date, amountMinor] = [...days.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  return { date, amountMinor }
}
