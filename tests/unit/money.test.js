import { describe, expect, it } from 'vitest'
import {
  divideRounded,
  formatMoney,
  formatMoneyCompact,
  MAX_AMOUNT_MINOR,
  minorToDecimalString,
  parseAmount,
  percentOf,
  sumMinor,
} from '../../src/utils/money.js'

describe('parseAmount', () => {
  it.each([
    ['500', 'BDT', 50000],
    ['500.25', 'BDT', 50025],
    ['500.2', 'BDT', 50020],
    ['.5', 'BDT', 50],
    ['5.', 'BDT', 500],
    ['1,234.50', 'BDT', 123450],
    ['  42  ', 'BDT', 4200],
    ['1000', 'JPY', 1000],
    ['1.234', 'KWD', 1234],
  ])('%s %s → %i minor units', (input, currency, expected) => {
    expect(parseAmount(input, currency)).toEqual({ ok: true, minor: expected })
  })

  it('avoids the classic float errors', () => {
    // 19.99 * 100 is 1998.9999999999998 in floating point.
    expect(parseAmount('19.99', 'BDT').minor).toBe(1999)
    // 1.1 + 2.2 is 3.3000000000000003 in floating point.
    expect(parseAmount('1.10', 'BDT').minor + parseAmount('2.20', 'BDT').minor).toBe(330)
    expect(parseAmount('4.35', 'BDT').minor).toBe(435)
    expect(parseAmount('1.15', 'BDT').minor).toBe(115)
  })

  it.each([
    ['', 'Enter an amount.'],
    ['   ', 'Enter an amount.'],
    ['abc', 'Enter a valid number.'],
    ['12abc', 'Enter a valid number.'],
    ['1e5', 'Enter a valid number.'],
    ['1.2.3', 'Enter a valid number.'],
    ['.', 'Enter a valid number.'],
    ['-5', 'Amount must be positive.'],
    ['0', 'Amount must be greater than zero.'],
    ['0.00', 'Amount must be greater than zero.'],
  ])('rejects %j', (input, error) => {
    expect(parseAmount(input, 'BDT')).toEqual({ ok: false, error })
  })

  it('rejects more decimals than the currency has, rather than rounding', () => {
    expect(parseAmount('1.234', 'BDT').ok).toBe(false)
    expect(parseAmount('1.5', 'JPY').ok).toBe(false)
    expect(parseAmount('1.2345', 'KWD').ok).toBe(false)
  })

  it('enforces the same maximum as the database', () => {
    expect(parseAmount('10000000000', 'BDT').minor).toBe(MAX_AMOUNT_MINOR)
    expect(parseAmount('10000000000.01', 'BDT').ok).toBe(false)
    expect(parseAmount('99999999999999999999999', 'BDT').ok).toBe(false)
  })
})

describe('minorToDecimalString', () => {
  it.each([
    [50025, 'BDT', '500.25'],
    [5, 'BDT', '0.05'],
    [50, 'BDT', '0.50'],
    [0, 'BDT', '0.00'],
    [-50025, 'BDT', '-500.25'],
    [1000, 'JPY', '1000'],
    [1234, 'KWD', '1.234'],
    [MAX_AMOUNT_MINOR, 'BDT', '10000000000.00'],
  ])('%i %s → %s', (minor, currency, expected) => {
    expect(minorToDecimalString(minor, currency)).toBe(expected)
  })

  it('round-trips with parseAmount', () => {
    for (const minor of [1, 99, 100, 1999, 50025, 123456789]) {
      expect(parseAmount(minorToDecimalString(minor, 'BDT'), 'BDT').minor).toBe(minor)
    }
  })
})

describe('formatMoney', () => {
  it('shows the taka symbol, not the code', () => {
    expect(formatMoney(845000, 'BDT')).toBe('৳8,450')
  })

  it('omits .00 but keeps real cents', () => {
    expect(formatMoney(50000, 'BDT')).toBe('৳500')
    expect(formatMoney(50025, 'BDT')).toBe('৳500.25')
    expect(formatMoney(50020, 'BDT')).toBe('৳500.20')
    expect(formatMoney(5, 'BDT')).toBe('৳0.05')
  })

  it('respects each currency', () => {
    expect(formatMoney(1999, 'USD')).toBe('$19.99')
    expect(formatMoney(100000, 'CAD')).toBe('CA$1,000')
    expect(formatMoney(1000, 'JPY')).toBe('¥1,000')
    expect(formatMoney(1234, 'KWD')).toContain('1.234')
    expect(formatMoney(50000, 'INR')).toBe('₹500')
  })

  it('handles zero, negatives and explicit signs', () => {
    expect(formatMoney(0, 'BDT')).toBe('৳0')
    expect(formatMoney(-50000, 'BDT')).toBe('−৳500')
    expect(formatMoney(50000, 'BDT', { sign: 'always' })).toBe('+৳500')
    expect(formatMoney(0, 'BDT', { sign: 'always' })).toBe('৳0')
  })

  it('formats the largest allowed amount exactly', () => {
    expect(formatMoney(MAX_AMOUNT_MINOR + 1, 'BDT')).toBe('৳10,000,000,000.01')
  })

  it('has a compact form for chart axes', () => {
    expect(formatMoneyCompact(1200000, 'BDT')).toBe('৳12K')
  })
})

describe('arithmetic', () => {
  it('sums exactly', () => {
    expect(sumMinor([10, 20])).toBe(30)
    expect(sumMinor([])).toBe(0)
    expect(sumMinor(Array(1000).fill(1))).toBe(1000)
  })

  it('percentOf rounds half-up to one decimal without floats', () => {
    expect(percentOf(845000, 1200000)).toBe(70.4)
    expect(percentOf(1, 3)).toBe(33.3)
    expect(percentOf(2, 3)).toBe(66.7)
    expect(percentOf(1, 1)).toBe(100)
    expect(percentOf(150, 100)).toBe(150)
    expect(percentOf(0, 100)).toBe(0)
  })

  it('percentOf is safe when the whole is zero', () => {
    expect(percentOf(100, 0)).toBe(0)
  })

  it('percentOf does not overflow on very large values', () => {
    expect(percentOf(MAX_AMOUNT_MINOR * 8000, MAX_AMOUNT_MINOR * 9000)).toBe(88.9)
  })

  it('divideRounded rounds half-up', () => {
    expect(divideRounded(10, 3)).toBe(3)
    expect(divideRounded(11, 3)).toBe(4)
    expect(divideRounded(5, 2)).toBe(3)
    expect(divideRounded(100, 0)).toBe(0)
  })
})
