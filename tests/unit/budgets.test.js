import { describe, expect, it } from 'vitest'
import {
  budgetProgress,
  budgetsForUtilization,
  budgetWindow,
  utilization,
  windowSpan,
} from '../../src/utils/budgets.js'

const budget = (overrides) => ({
  id: 'b1',
  project_id: 'uni',
  category_id: null,
  amount_minor: 1200000,
  period: 'monthly',
  start_date: '2026-11-01',
  end_date: null,
  is_archived: false,
  ...overrides,
})

const expense = (overrides) => ({
  type: 'expense',
  amount_minor: 845000,
  transaction_date: '2026-11-10',
  project_id: 'uni',
  category_id: 'food',
  ...overrides,
})

describe('budgetWindow', () => {
  it('monthly from the 1st follows calendar months', () => {
    expect(budgetWindow(budget(), '2026-11-15')).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(budgetWindow(budget(), '2026-12-01')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
    expect(budgetWindow(budget(), '2027-02-28')).toEqual({ from: '2027-02-01', to: '2027-02-28' })
  })

  it('monthly from mid-month rolls on that day', () => {
    const b = budget({ start_date: '2026-11-15' })
    expect(budgetWindow(b, '2026-12-14')).toEqual({ from: '2026-11-15', to: '2026-12-14' })
    expect(budgetWindow(b, '2026-12-15')).toEqual({ from: '2026-12-15', to: '2027-01-14' })
  })

  it('monthly from the 31st survives a short month without gaps or overlap', () => {
    const b = budget({ start_date: '2027-01-31' })
    const feb = budgetWindow(b, '2027-02-15')
    const mar = budgetWindow(b, '2027-03-15')
    expect(feb).toEqual({ from: '2027-01-31', to: '2027-02-27' })
    expect(mar.from).toBe('2027-02-28')
  })

  it('weekly windows are seven days from the start', () => {
    const b = budget({ period: 'weekly', start_date: '2026-11-01' })
    expect(budgetWindow(b, '2026-11-01')).toEqual({ from: '2026-11-01', to: '2026-11-07' })
    expect(budgetWindow(b, '2026-11-07')).toEqual({ from: '2026-11-01', to: '2026-11-07' })
    expect(budgetWindow(b, '2026-11-08')).toEqual({ from: '2026-11-08', to: '2026-11-14' })
  })

  it('custom uses its dates', () => {
    const b = budget({ period: 'custom', start_date: '2026-11-05', end_date: '2026-11-20' })
    expect(budgetWindow(b, '2030-01-01')).toEqual({ from: '2026-11-05', to: '2026-11-20' })
  })

  it('shows the first window before the budget starts', () => {
    expect(budgetWindow(budget({ start_date: '2027-01-01' }), '2026-11-01')).toEqual({ from: '2027-01-01', to: '2027-01-31' })
  })

  it('stops at the end date', () => {
    const b = budget({ end_date: '2026-11-20' })
    expect(budgetWindow(b, '2026-11-10')).toEqual({ from: '2026-11-01', to: '2026-11-20' })
    expect(budgetWindow(b, '2027-06-01')).toEqual({ from: '2026-11-01', to: '2026-11-20' })
  })
})

describe('budgetProgress', () => {
  const today = '2026-11-15'

  it('reproduces the example from the brief', () => {
    const p = budgetProgress(budget(), [expense()], today)
    expect(p.amountMinor).toBe(1200000)
    expect(p.spentMinor).toBe(845000)
    expect(p.remainingMinor).toBe(355000)
    expect(p.percentUsed).toBe(70.4)
    expect(p.isOver).toBe(false)
  })

  it('never counts income', () => {
    const p = budgetProgress(budget(), [expense({ type: 'income', amount_minor: 999999 })], today)
    expect(p.spentMinor).toBe(0)
  })

  it('ignores other projects', () => {
    expect(budgetProgress(budget(), [expense({ project_id: 'travel' })], today).spentMinor).toBe(0)
  })

  it('a category budget counts only that category', () => {
    const rows = [expense({ category_id: 'food', amount_minor: 100 }), expense({ category_id: 'bus', amount_minor: 900 })]
    expect(budgetProgress(budget({ category_id: 'food' }), rows, today).spentMinor).toBe(100)
  })

  it('a whole-project budget counts every category', () => {
    const rows = [expense({ category_id: 'food', amount_minor: 100 }), expense({ category_id: 'bus', amount_minor: 900 })]
    expect(budgetProgress(budget(), rows, today).spentMinor).toBe(1000)
  })

  it('includes boundary dates and excludes the days around them', () => {
    const rows = [
      expense({ transaction_date: '2026-10-31', amount_minor: 1 }),
      expense({ transaction_date: '2026-11-01', amount_minor: 10 }),
      expense({ transaction_date: '2026-11-30', amount_minor: 100 }),
      expense({ transaction_date: '2026-12-01', amount_minor: 1000 }),
    ]
    expect(budgetProgress(budget(), rows, today).spentMinor).toBe(110)
  })

  it('exactly on budget is not over', () => {
    const p = budgetProgress(budget(), [expense({ amount_minor: 1200000 })], today)
    expect(p.remainingMinor).toBe(0)
    expect(p.percentUsed).toBe(100)
    expect(p.isOver).toBe(false)
  })

  it('one unit over is over, and remaining goes negative', () => {
    const p = budgetProgress(budget(), [expense({ amount_minor: 1200001 })], today)
    expect(p.isOver).toBe(true)
    expect(p.remainingMinor).toBe(-1)
    expect(p.isNearLimit).toBe(false)
  })

  it('warns from 80%', () => {
    expect(budgetProgress(budget(), [expense({ amount_minor: 959999 })], today).isNearLimit).toBe(false)
    expect(budgetProgress(budget(), [expense({ amount_minor: 960000 })], today).isNearLimit).toBe(true)
  })

  it('reports state against today', () => {
    expect(budgetProgress(budget(), [], today).state).toBe('active')
    expect(budgetProgress(budget({ start_date: '2027-01-01' }), [], today).state).toBe('upcoming')
    expect(budgetProgress(budget({ period: 'custom', start_date: '2026-01-01', end_date: '2026-02-01' }), [], today).state).toBe('ended')
  })

  it('last month\'s spending does not count against this month', () => {
    const p = budgetProgress(budget(), [expense({ transaction_date: '2026-11-20' })], '2026-12-05')
    expect(p.spentMinor).toBe(0)
  })
})

describe('utilization avoids double-counting', () => {
  const today = '2026-11-15'

  it('uses the project budget instead of adding its category budgets on top', () => {
    const budgets = [
      budget({ id: 'whole', amount_minor: 100000 }),
      budget({ id: 'food', category_id: 'food', amount_minor: 50000 }),
    ]
    const result = utilization(budgets, [expense({ amount_minor: 30000 })], today)
    expect(result).toMatchObject({ amountMinor: 100000, spentMinor: 30000, percentUsed: 30, budgetCount: 1 })
  })

  it('adds category budgets when there is no project budget', () => {
    const budgets = [
      budget({ id: 'food', category_id: 'food', amount_minor: 1000 }),
      budget({ id: 'bus', category_id: 'bus', amount_minor: 3000 }),
    ]
    const rows = [expense({ category_id: 'food', amount_minor: 500 }), expense({ category_id: 'bus', amount_minor: 500 })]
    expect(utilization(budgets, rows, today)).toMatchObject({ amountMinor: 4000, spentMinor: 1000, percentUsed: 25 })
  })

  it('counts weekly and monthly budgets for the same scope once', () => {
    const budgets = [
      budget({ id: 'weekly', period: 'weekly', amount_minor: 700 }),
      budget({ id: 'monthly', period: 'monthly', amount_minor: 3000 }),
    ]
    expect(budgetsForUtilization(budgets, today).map((b) => b.id)).toEqual(['monthly'])
  })

  it('adds different projects together', () => {
    const budgets = [budget({ amount_minor: 1000 }), budget({ id: 'b2', project_id: 'travel', amount_minor: 3000 })]
    const rows = [expense({ amount_minor: 1000 }), expense({ project_id: 'travel', amount_minor: 1000 })]
    expect(utilization(budgets, rows, today)).toMatchObject({ amountMinor: 4000, spentMinor: 2000, percentUsed: 50 })
  })

  it('leaves out archived, ended and upcoming budgets', () => {
    const budgets = [
      budget({ is_archived: true }),
      budget({ id: 'ended', project_id: 'x', period: 'custom', start_date: '2026-01-01', end_date: '2026-02-01' }),
      budget({ id: 'soon', project_id: 'y', start_date: '2027-01-01' }),
    ]
    expect(utilization(budgets, [], today).budgetCount).toBe(0)
  })

  it('is zero, not an error, with no budgets', () => {
    expect(utilization([], [], today)).toMatchObject({ amountMinor: 0, spentMinor: 0, percentUsed: 0 })
  })
})

describe('windowSpan', () => {
  it('covers every budget', () => {
    const budgets = [budget(), budget({ period: 'custom', start_date: '2026-01-01', end_date: '2026-02-01' })]
    expect(windowSpan(budgets, '2026-11-15')).toEqual({ from: '2026-01-01', to: '2026-11-30' })
  })

  it('is open when there are no budgets', () => {
    expect(windowSpan([])).toEqual({ from: null, to: null })
  })
})
