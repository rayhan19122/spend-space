import { describe, expect, it } from 'vitest'
import {
  averageDailySpending,
  currenciesIn,
  effectiveRange,
  foldTail,
  highestSpendingDay,
  inCurrency,
  largestExpense,
  mostFrequentCategory,
  shareByCategoryName,
  suggestGranularity,
  totals,
  totalsByCategory,
  totalsByProject,
  trendSeries,
} from '../../src/utils/analytics.js'

const row = (overrides) => ({
  type: 'expense',
  amount_minor: 10000,
  currency: 'BDT',
  transaction_date: '2026-11-10',
  project_id: 'uni',
  category_id: 'food',
  ...overrides,
})

const income = (overrides) => row({ type: 'income', category_id: 'salary', ...overrides })

describe('totals', () => {
  it('separates income, expenses and net', () => {
    expect(totals([income({ amount_minor: 100000 }), row({ amount_minor: 30000 }), row({ amount_minor: 20000 })])).toEqual({
      incomeMinor: 100000,
      expenseMinor: 50000,
      netMinor: 50000,
      count: 3,
    })
  })

  it('net can be negative', () => {
    expect(totals([income({ amount_minor: 100 }), row({ amount_minor: 300 })]).netMinor).toBe(-200)
  })

  it('is all zeros with no data', () => {
    expect(totals([])).toEqual({ incomeMinor: 0, expenseMinor: 0, netMinor: 0, count: 0 })
  })

  it('stays exact where floats would drift', () => {
    const rows = Array.from({ length: 10 }, () => row({ amount_minor: 10 }))
    expect(totals(rows).expenseMinor).toBe(100) // 0.1 added ten times is 0.9999999999999999
  })
})

describe('project totals', () => {
  it('keep each project separate, largest expense first', () => {
    const result = totalsByProject([
      row({ project_id: 'uni', amount_minor: 50000 }),
      row({ project_id: 'travel', amount_minor: 90000 }),
      income({ project_id: 'uni', amount_minor: 20000 }),
    ])
    expect(result.map((r) => r.key)).toEqual(['travel', 'uni'])
    expect(result[1]).toMatchObject({ incomeMinor: 20000, expenseMinor: 50000, netMinor: -30000 })
  })

  it('project totals add up to the combined total', () => {
    const rows = [
      row({ project_id: 'a', amount_minor: 333 }),
      row({ project_id: 'b', amount_minor: 667 }),
      income({ project_id: 'a', amount_minor: 1 }),
    ]
    const sum = totalsByProject(rows).reduce((acc, r) => acc + r.expenseMinor, 0)
    expect(sum).toBe(totals(rows).expenseMinor)
  })
})

describe('category totals', () => {
  it('group by category ID', () => {
    const result = totalsByCategory([
      row({ category_id: 'food', amount_minor: 100 }),
      row({ category_id: 'food', amount_minor: 200 }),
      row({ category_id: 'bus', amount_minor: 50 }),
    ])
    expect(result[0]).toMatchObject({ key: 'food', expenseMinor: 300, count: 2 })
    expect(result[1]).toMatchObject({ key: 'bus', expenseMinor: 50 })
  })

  it('shares combine same-named categories across projects and exclude the other type', () => {
    const names = { f1: 'Food', f2: 'Food', b: 'Bus', s: 'Salary' }
    const result = shareByCategoryName(
      [
        row({ category_id: 'f1', amount_minor: 3000 }),
        row({ category_id: 'f2', project_id: 'travel', amount_minor: 3000 }),
        row({ category_id: 'b', amount_minor: 4000 }),
        income({ category_id: 's', amount_minor: 999999 }),
      ],
      'expense',
      (id) => names[id],
    )
    expect(result).toEqual([
      { name: 'Food', amountMinor: 6000, percent: 60 },
      { name: 'Bus', amountMinor: 4000, percent: 40 },
    ])
  })
})

describe('mixed currencies', () => {
  const rows = [
    row({ currency: 'BDT', amount_minor: 50000 }),
    row({ currency: 'USD', amount_minor: 1000 }),
    row({ currency: 'BDT', amount_minor: 25000 }),
  ]

  it('lists the currencies present', () => {
    expect(currenciesIn(rows)).toEqual(['BDT', 'USD'])
  })

  it('filters to one currency so totals are never mixed', () => {
    expect(totals(inCurrency(rows, 'BDT')).expenseMinor).toBe(75000)
    expect(totals(inCurrency(rows, 'USD')).expenseMinor).toBe(1000)
  })
})

describe('trendSeries', () => {
  it('fills empty days with zero so gaps are visible', () => {
    const series = trendSeries(
      [row({ transaction_date: '2026-11-02', amount_minor: 500 }), income({ transaction_date: '2026-11-02', amount_minor: 900 })],
      'daily',
      '2026-11-01',
      '2026-11-03',
    )
    expect(series.map((p) => [p.key, p.expenseMinor, p.incomeMinor])).toEqual([
      ['2026-11-01', 0, 0],
      ['2026-11-02', 500, 900],
      ['2026-11-03', 0, 0],
    ])
  })

  it('puts boundary dates in the correct week and month', () => {
    const rows = [
      row({ transaction_date: '2026-11-07', amount_minor: 1 }), // Saturday
      row({ transaction_date: '2026-11-08', amount_minor: 10 }), // Sunday
      row({ transaction_date: '2026-11-30', amount_minor: 100 }),
      row({ transaction_date: '2026-12-01', amount_minor: 1000 }),
    ]
    const weekly = trendSeries(rows, 'weekly', '2026-11-01', '2026-12-05')
    expect(weekly.find((p) => p.key === '2026-11-01').expenseMinor).toBe(1)
    expect(weekly.find((p) => p.key === '2026-11-08').expenseMinor).toBe(10)
    const monthly = trendSeries(rows, 'monthly', '2026-11-01', '2026-12-31')
    expect(monthly.map((p) => p.expenseMinor)).toEqual([111, 1000])
  })

  it('ignores rows outside the range rather than inventing buckets', () => {
    const series = trendSeries([row({ transaction_date: '2026-10-31' })], 'daily', '2026-11-01', '2026-11-01')
    expect(series).toHaveLength(1)
    expect(series[0].expenseMinor).toBe(0)
  })

  it('is empty without a valid range', () => {
    expect(trendSeries([], 'daily', null, null)).toEqual([])
    expect(trendSeries([], 'daily', '2026-11-05', '2026-11-01')).toEqual([])
  })
})

describe('suggestGranularity', () => {
  it('scales with the range', () => {
    expect(suggestGranularity('2026-11-01', '2026-11-30')).toBe('daily')
    expect(suggestGranularity('2026-08-01', '2026-11-30')).toBe('weekly')
    expect(suggestGranularity('2026-01-01', '2026-12-31')).toBe('monthly')
  })
})

describe('effectiveRange', () => {
  it('keeps an explicit range', () => {
    expect(effectiveRange([], '2026-01-01', '2026-01-31')).toEqual({ from: '2026-01-01', to: '2026-01-31' })
  })

  it('runs all-time from the first record to today', () => {
    const rows = [row({ transaction_date: '2026-03-05' }), row({ transaction_date: '2026-01-05' })]
    expect(effectiveRange(rows, null, null, '2026-11-01')).toEqual({ from: '2026-01-05', to: '2026-11-01' })
  })

  it('extends to a future-dated record', () => {
    expect(effectiveRange([row({ transaction_date: '2027-01-01' })], null, null, '2026-11-01').to).toBe('2027-01-01')
  })
})

describe('averageDailySpending', () => {
  const afterRange = '2027-06-01'

  it('divides by every day in the range, not only days with spending', () => {
    expect(averageDailySpending([row({ amount_minor: 30000 })], '2026-11-01', '2026-11-30', afterRange)).toBe(1000)
  })

  it('does not count days that have not happened yet', () => {
    // On 10 Nov, "this month" has had 10 days, not 30.
    expect(averageDailySpending([row({ amount_minor: 30000 })], '2026-11-01', '2026-11-30', '2026-11-10')).toBe(3000)
  })

  it('counts through a future-dated record', () => {
    const rows = [row({ amount_minor: 30000, transaction_date: '2026-11-20' })]
    expect(averageDailySpending(rows, '2026-11-01', '2026-11-30', '2026-11-10')).toBe(1500)
  })

  it('is zero for a range entirely in the future', () => {
    expect(averageDailySpending([], '2027-01-01', '2027-01-31', '2026-11-10')).toBe(0)
  })

  it('ignores income', () => {
    expect(averageDailySpending([income({ amount_minor: 30000 })], '2026-11-01', '2026-11-30', afterRange)).toBe(0)
  })

  it('is zero without a range', () => {
    expect(averageDailySpending([row()], null, null)).toBe(0)
  })
})

describe('insights only claim what the data supports', () => {
  it('largestExpense ignores income', () => {
    const big = row({ amount_minor: 500 })
    expect(largestExpense([row({ amount_minor: 100 }), big, income({ amount_minor: 9999 })])).toBe(big)
  })

  it('largestExpense is null with no expenses', () => {
    expect(largestExpense([income()])).toBeNull()
  })

  it('mostFrequentCategory needs a repeat', () => {
    expect(mostFrequentCategory([row({ category_id: 'a' }), row({ category_id: 'b' })])).toBeNull()
    expect(mostFrequentCategory([])).toBeNull()
  })

  it('mostFrequentCategory counts purchases, not money', () => {
    expect(
      mostFrequentCategory([
        row({ category_id: 'tea', amount_minor: 1 }),
        row({ category_id: 'tea', amount_minor: 1 }),
        row({ category_id: 'rent', amount_minor: 99999 }),
      ]),
    ).toEqual({ categoryId: 'tea', count: 2 })
  })

  it('highestSpendingDay needs at least two days', () => {
    expect(highestSpendingDay([row(), row()])).toBeNull()
    expect(highestSpendingDay([])).toBeNull()
  })

  it('highestSpendingDay adds up each day', () => {
    expect(
      highestSpendingDay([
        row({ transaction_date: '2026-11-01', amount_minor: 60 }),
        row({ transaction_date: '2026-11-01', amount_minor: 60 }),
        row({ transaction_date: '2026-11-02', amount_minor: 100 }),
      ]),
    ).toEqual({ date: '2026-11-01', amountMinor: 120 })
  })
})

describe('foldTail', () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ key: `c${i}`, label: `C${i}`, amountMinor: 100 }))

  it('leaves short lists alone', () => {
    expect(foldTail(rows.slice(0, 8))).toHaveLength(8)
  })

  it('folds the tail into Other without changing the total', () => {
    const folded = foldTail(rows)
    expect(folded).toHaveLength(8)
    expect(folded.at(-1)).toMatchObject({ key: '__other', label: 'Other (3)', amountMinor: 300, percent: 30 })
    expect(folded.reduce((sum, row) => sum + row.amountMinor, 0)).toBe(1000)
  })
})
