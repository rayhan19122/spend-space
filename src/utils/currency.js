export const DEFAULT_CURRENCY = 'BDT'

export const CURRENCIES = [
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
]

// In the 'en' locale these would otherwise render as "BDT 500" rather than "৳500".
const USE_NARROW_SYMBOL = new Set(['BDT', 'INR', 'PKR'])

export const currencyDisplay = (code) => (USE_NARROW_SYMBOL.has(code) ? 'narrowSymbol' : 'symbol')

const digitsCache = new Map()

// Decimal places of a currency's minor unit: BDT 2, JPY 0, KWD 3.
export function minorDigits(code) {
  if (!digitsCache.has(code)) {
    const { maximumFractionDigits } = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
    }).resolvedOptions()
    digitsCache.set(code, maximumFractionDigits)
  }
  return digitsCache.get(code)
}

export function currencySymbol(code) {
  const part = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: code,
    currencyDisplay: currencyDisplay(code),
  })
    .formatToParts(0)
    .find((p) => p.type === 'currency')
  return part?.value ?? code
}
