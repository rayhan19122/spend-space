import { describe, expect, it } from 'vitest'
import {
  bucketsBetween,
  daysBetweenInclusive,
  describeRange,
  formatDate,
  isValidISO,
  isWithin,
  lastNMonthsRange,
  rangeForPreset,
  toISO,
} from '../../src/utils/dates.js'

describe('rangeForPreset', () => {
  // 2026-11-11 is a Wednesday.
  const today = '2026-11-11'

  it('this week runs Sunday to Saturday', () => {
    expect(rangeForPreset('this-week', today)).toEqual({ from: '2026-11-08', to: '2026-11-14' })
  })

  it('this month', () => {
    expect(rangeForPreset('this-month', today)).toEqual({ from: '2026-11-01', to: '2026-11-30' })
  })

  it('last month', () => {
    expect(rangeForPreset('last-month', today)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
  })

  it('last month from a 31st does not skip a short month', () => {
    expect(rangeForPreset('last-month', '2026-03-31')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('last month from January is December of the previous year', () => {
    expect(rangeForPreset('last-month', '2027-01-15')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })

  it('handles a leap February', () => {
    expect(rangeForPreset('this-month', '2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })

  it('this year', () => {
    expect(rangeForPreset('this-year', today)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })

  it('all time has no bounds', () => {
    expect(rangeForPreset('all', today)).toEqual({ from: null, to: null })
  })

  it('uses a week start that crosses a year boundary correctly', () => {
    expect(rangeForPreset('this-week', '2027-01-01')).toEqual({ from: '2026-12-27', to: '2027-01-02' })
  })
})

describe('isWithin', () => {
  it('includes both boundary dates', () => {
    expect(isWithin('2026-11-01', '2026-11-01', '2026-11-30')).toBe(true)
    expect(isWithin('2026-11-30', '2026-11-01', '2026-11-30')).toBe(true)
  })

  it('excludes the day before and after', () => {
    expect(isWithin('2026-10-31', '2026-11-01', '2026-11-30')).toBe(false)
    expect(isWithin('2026-12-01', '2026-11-01', '2026-11-30')).toBe(false)
  })

  it('treats a missing bound as open', () => {
    expect(isWithin('1999-01-01', null, '2026-11-30')).toBe(true)
    expect(isWithin('2099-01-01', '2026-11-01', null)).toBe(true)
    expect(isWithin('2099-01-01', null, null)).toBe(true)
  })
})

describe('toISO', () => {
  it('keeps the local calendar day late at night', () => {
    // toISOString() on this would give a different day in any zone east of UTC.
    expect(toISO(new Date(2026, 10, 1, 0, 30))).toBe('2026-11-01')
    expect(toISO(new Date(2026, 10, 1, 23, 59))).toBe('2026-11-01')
  })
})

describe('isValidISO', () => {
  it('accepts real dates only', () => {
    expect(isValidISO('2026-11-01')).toBe(true)
    expect(isValidISO('2028-02-29')).toBe(true)
    expect(isValidISO('2026-02-29')).toBe(false)
    expect(isValidISO('2026-13-01')).toBe(false)
    expect(isValidISO('not-a-date')).toBe(false)
    expect(isValidISO('')).toBe(false)
    expect(isValidISO(null)).toBe(false)
  })
})

describe('formatDate', () => {
  it('uses the chosen pattern and does not shift the day', () => {
    expect(formatDate('2026-11-01')).toBe('1 Nov 2026')
    expect(formatDate('2026-11-01', 'dd/MM/yyyy')).toBe('01/11/2026')
    expect(formatDate('2026-11-01', 'yyyy-MM-dd')).toBe('2026-11-01')
  })
})

describe('daysBetweenInclusive', () => {
  it('counts both ends', () => {
    expect(daysBetweenInclusive('2026-11-01', '2026-11-01')).toBe(1)
    expect(daysBetweenInclusive('2026-11-01', '2026-11-30')).toBe(30)
    expect(daysBetweenInclusive('2026-01-01', '2026-12-31')).toBe(365)
  })
})

describe('bucketsBetween', () => {
  it('lists each day', () => {
    expect(bucketsBetween('2026-11-01', '2026-11-03', 'daily').map((b) => b.key)).toEqual([
      '2026-11-01', '2026-11-02', '2026-11-03',
    ])
  })

  it('lists weeks by their Sunday, including a partial first week', () => {
    expect(bucketsBetween('2026-11-04', '2026-11-16', 'weekly').map((b) => b.key)).toEqual([
      '2026-11-01', '2026-11-08', '2026-11-15',
    ])
  })

  it('lists months across a year boundary', () => {
    expect(bucketsBetween('2026-11-15', '2027-01-10', 'monthly').map((b) => b.key)).toEqual([
      '2026-11-01', '2026-12-01', '2027-01-01',
    ])
  })
})

describe('describeRange', () => {
  it('names presets and formats custom ranges', () => {
    expect(describeRange({ preset: 'last-month' })).toBe('Last month')
    expect(describeRange({ preset: 'custom', from: '2026-11-01', to: '2026-11-05' })).toBe('1 Nov 2026 – 5 Nov 2026')
    expect(describeRange({ preset: 'custom', from: '2026-11-01' })).toBe('From 1 Nov 2026')
    expect(describeRange({ preset: 'custom' })).toBe('All time')
  })
})

describe('lastNMonthsRange', () => {
  it('covers whole months back from today', () => {
    expect(lastNMonthsRange(12, '2026-11-15')).toEqual({ from: '2025-12-01', to: '2026-11-30' })
  })
})
