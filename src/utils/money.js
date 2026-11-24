// All money in the app is an integer count of minor units (৳500.25 = 50025).
// Input is parsed from strings and display goes through decimal strings, so floats are never
// the source of truth. Sums and percentages use BigInt where a product could overflow.
import { currencyDisplay, minorDigits } from './currency.js'

export const MAX_AMOUNT_MINOR = 1_000_000_000_000

export function parseAmount(input, currency) {
  const text = String(input ?? '').trim().replace(/,/g, '')
  if (!text) return { ok: false, error: 'Enter an amount.' }
  if (text.startsWith('-')) return { ok: false, error: 'Amount must be positive.' }

  const digits = minorDigits(currency)
  const match = /^(\d*)(?:\.(\d*))?$/.exec(text)
  if (!match || (!match[1] && !match[2])) return { ok: false, error: 'Enter a valid number.' }

  const whole = match[1] || '0'
  const fraction = match[2] ?? ''
  if (fraction.length > digits) {
    return {
      ok: false,
      error: digits === 0
        ? `${currency} amounts cannot have decimals.`
        : `${currency} amounts can have at most ${digits} decimal places.`,
    }
  }

  const minor = BigInt(whole + fraction.padEnd(digits, '0'))
  if (minor <= 0n) return { ok: false, error: 'Amount must be greater than zero.' }
  if (minor > BigInt(MAX_AMOUNT_MINOR)) return { ok: false, error: 'That amount is too large.' }
  return { ok: true, minor: Number(minor) }
}

// 50025 → "500.25". Used for display and exports, never for arithmetic.
export function minorToDecimalString(minor, currency) {
  const digits = minorDigits(currency)
  const negative = minor < 0
  const text = String(Math.abs(minor)).padStart(digits + 1, '0')
  const whole = digits ? text.slice(0, -digits) : text
  const fraction = digits ? text.slice(-digits) : ''
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

const formatterCache = new Map()

function formatter(currency, fractionDigits) {
  const key = `${currency}:${fractionDigits}`
  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        currencyDisplay: currencyDisplay(currency),
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }),
    )
  }
  return formatterCache.get(key)
}

// ৳8,450 when whole, ৳8,450.50 otherwise. `sign: 'always'` gives +৳500 / −৳500.
export function formatMoney(minor, currency, { sign = 'auto' } = {}) {
  const digits = minorDigits(currency)
  const decimal = minorToDecimalString(Math.abs(minor), currency)
  const isWhole = digits === 0 || decimal.endsWith(`.${'0'.repeat(digits)}`)
  const body = formatter(currency, isWhole ? 0 : digits).format(decimal)
  if (minor < 0) return `−${body}`
  if (sign === 'always' && minor > 0) return `+${body}`
  return body
}

// Compact chart-axis labels (৳12K). Rounded display only; never fed back into calculations.
export function formatMoneyCompact(minor, currency) {
  const major = minor / 10 ** minorDigits(currency)
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    currencyDisplay: currencyDisplay(currency),
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(major)
}

export function sumMinor(values) {
  const total = values.reduce((sum, value) => sum + BigInt(value), 0n)
  return Number(total)
}

// Percentage to one decimal place, rounded half-up with integer arithmetic.
export function percentOf(part, whole) {
  if (whole <= 0) return 0
  const tenths = (BigInt(part) * 1000n + BigInt(whole) / 2n) / BigInt(whole)
  return Number(tenths) / 10
}

export function divideRounded(minor, divisor) {
  if (divisor <= 0) return 0
  return Number((BigInt(minor) + BigInt(divisor) / 2n) / BigInt(divisor))
}
