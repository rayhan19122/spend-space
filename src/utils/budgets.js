// Budget windows and progress. Budgets count expenses only.
//
// Weekly and monthly budgets repeat from their start date; the "current window" is the one
// containing today. A monthly budget starting on the 1st therefore follows calendar months.
import { addMonths } from 'date-fns'
import { addDays, daysBetweenInclusive, fromISO, isWithin, todayISO, toISO } from './dates.js'
import { percentOf, sumMinor } from './money.js'

export const NEAR_LIMIT_PERCENT = 80

const monthWindow = (start, index) => ({
  from: toISO(addMonths(start, index)),
  to: toISO(addDays(addMonths(start, index + 1), -1)),
})

function repeatingWindow(budget, reference) {
  const start = fromISO(budget.start_date)
  if (budget.period === 'weekly') {
    const index = Math.max(0, Math.floor((daysBetweenInclusive(budget.start_date, reference) - 1) / 7))
    return { from: toISO(addDays(start, index * 7)), to: toISO(addDays(start, index * 7 + 6)) }
  }
  let index = 0
  while (reference > monthWindow(start, index).to) index += 1
  return monthWindow(start, index)
}

export function budgetWindow(budget, today = todayISO()) {
  if (budget.period === 'custom') return { from: budget.start_date, to: budget.end_date }
  const reference = budget.end_date && today > budget.end_date ? budget.end_date : today
  const window = repeatingWindow(budget, reference < budget.start_date ? budget.start_date : reference)
  return {
    from: window.from,
    to: budget.end_date && window.to > budget.end_date ? budget.end_date : window.to,
  }
}

export function budgetProgress(budget, rows, today = todayISO()) {
  const window = budgetWindow(budget, today)
  const spentMinor = sumMinor(
    rows
      .filter(
        (row) =>
          row.type === 'expense' &&
          row.project_id === budget.project_id &&
          (budget.category_id === null || row.category_id === budget.category_id) &&
          isWithin(row.transaction_date, window.from, window.to),
      )
      .map((row) => row.amount_minor),
  )
  const amountMinor = budget.amount_minor
  const percentUsed = percentOf(spentMinor, amountMinor)
  const isOver = spentMinor > amountMinor
  // Compared on exact integers: percentUsed is rounded for display, so 79.99% would read as 80.
  const reachedNearLimit = BigInt(spentMinor) * 100n >= BigInt(amountMinor) * BigInt(NEAR_LIMIT_PERCENT)

  let state = 'active'
  if (today < window.from) state = 'upcoming'
  else if (today > window.to) state = 'ended'

  return {
    window,
    state,
    spentMinor,
    amountMinor,
    remainingMinor: amountMinor - spentMinor,
    percentUsed,
    isOver,
    isNearLimit: !isOver && reachedNearLimit,
  }
}

const PERIOD_PREFERENCE = { monthly: 0, custom: 1, weekly: 2 }

// Choosing which budgets to total without counting the same spending twice:
// each project uses one whole-project budget if it has one (it already covers every
// category), otherwise one budget per category. Only budgets running today count.
export function budgetsForUtilization(budgets, today = todayISO()) {
  const running = budgets.filter((budget) => {
    if (budget.is_archived) return false
    const { from, to } = budgetWindow(budget, today)
    return isWithin(today, from, to)
  })

  const preferred = (list) =>
    [...list].sort((a, b) => PERIOD_PREFERENCE[a.period] - PERIOD_PREFERENCE[b.period])[0]

  const chosen = []
  const byProject = Map.groupBy(running, (budget) => budget.project_id)
  for (const projectBudgets of byProject.values()) {
    const whole = projectBudgets.filter((budget) => budget.category_id === null)
    if (whole.length) {
      chosen.push(preferred(whole))
    } else {
      const byCategory = Map.groupBy(projectBudgets, (budget) => budget.category_id)
      for (const group of byCategory.values()) chosen.push(preferred(group))
    }
  }
  return chosen
}

export function utilization(budgets, rows, today = todayISO()) {
  const progress = budgetsForUtilization(budgets, today).map((b) => budgetProgress(b, rows, today))
  const amountMinor = sumMinor(progress.map((p) => p.amountMinor))
  const spentMinor = sumMinor(progress.map((p) => p.spentMinor))
  return {
    amountMinor,
    spentMinor,
    remainingMinor: amountMinor - spentMinor,
    percentUsed: percentOf(spentMinor, amountMinor),
    budgetCount: progress.length,
  }
}

// The earliest and latest dates needed to compute the given budgets' current windows.
export function windowSpan(budgets, today = todayISO()) {
  if (!budgets.length) return { from: null, to: null }
  const windows = budgets.map((budget) => budgetWindow(budget, today))
  return {
    from: windows.map((w) => w.from).sort()[0],
    to: windows.map((w) => w.to).sort().at(-1),
  }
}

export const PERIOD_LABELS = { weekly: 'Weekly', monthly: 'Monthly', custom: 'Custom range' }
