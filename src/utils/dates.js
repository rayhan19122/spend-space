// Calendar dates are 'yyyy-MM-dd' strings in the user's local time. They never pass through
// toISOString(), which would move an evening in Dhaka or a morning in New York to the wrong day.
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from 'date-fns'

export const WEEK_STARTS_ON = 0
const WEEK_OPTIONS = { weekStartsOn: WEEK_STARTS_ON }

export const DEFAULT_DATE_FORMAT = 'd MMM yyyy'

export const DATE_FORMATS = [
  { value: 'd MMM yyyy', label: '1 Nov 2026' },
  { value: 'MMM d, yyyy', label: 'Nov 1, 2026' },
  { value: 'dd/MM/yyyy', label: '01/11/2026' },
  { value: 'yyyy-MM-dd', label: '2026-11-01' },
]

export const toISO = (date) => format(date, 'yyyy-MM-dd')
export const fromISO = (iso) => parse(iso, 'yyyy-MM-dd', new Date(2000, 0, 1))
export const todayISO = () => toISO(new Date())

export const isValidISO = (iso) =>
  typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) && isValid(fromISO(iso))

export const formatDate = (iso, pattern = DEFAULT_DATE_FORMAT) => format(fromISO(iso), pattern)

export const DATE_PRESETS = [
  { value: 'this-week', label: 'This week' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-year', label: 'This year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
]

export function rangeForPreset(preset, today = todayISO()) {
  const now = fromISO(today)
  switch (preset) {
    case 'this-week':
      return { from: toISO(startOfWeek(now, WEEK_OPTIONS)), to: toISO(endOfWeek(now, WEEK_OPTIONS)) }
    case 'this-month':
      return { from: toISO(startOfMonth(now)), to: toISO(endOfMonth(now)) }
    case 'last-month': {
      const last = subMonths(now, 1)
      return { from: toISO(startOfMonth(last)), to: toISO(endOfMonth(last)) }
    }
    case 'this-year':
      return { from: toISO(startOfYear(now)), to: toISO(endOfYear(now)) }
    default:
      return { from: null, to: null }
  }
}

export function describeRange({ preset, from, to }, pattern) {
  const known = DATE_PRESETS.find((p) => p.value === preset)
  if (preset !== 'custom' && known) return known.label
  if (from && to) return `${formatDate(from, pattern)} – ${formatDate(to, pattern)}`
  if (from) return `From ${formatDate(from, pattern)}`
  if (to) return `Until ${formatDate(to, pattern)}`
  return 'All time'
}

// ISO strings compare correctly as plain text.
export const isWithin = (iso, from, to) => (!from || iso >= from) && (!to || iso <= to)

export const daysBetweenInclusive = (from, to) =>
  differenceInCalendarDays(fromISO(to), fromISO(from)) + 1

const BUCKETS = {
  daily: {
    keyOf: (iso) => iso,
    list: (start, end) => eachDayOfInterval({ start, end }),
    label: (date) => format(date, 'd MMM'),
  },
  weekly: {
    keyOf: (iso) => toISO(startOfWeek(fromISO(iso), WEEK_OPTIONS)),
    list: (start, end) => eachWeekOfInterval({ start, end }, WEEK_OPTIONS),
    label: (date) => format(date, 'd MMM'),
  },
  monthly: {
    keyOf: (iso) => `${iso.slice(0, 7)}-01`,
    list: (start, end) => eachMonthOfInterval({ start, end }),
    label: (date) => format(date, 'MMM yy'),
  },
}

export const bucketKey = (iso, granularity) => BUCKETS[granularity].keyOf(iso)

export function bucketsBetween(from, to, granularity) {
  const { list, label } = BUCKETS[granularity]
  return list(fromISO(from), fromISO(to)).map((date) => ({ key: toISO(date), label: label(date) }))
}

export const lastNMonthsRange = (n, today = todayISO()) => ({
  from: toISO(startOfMonth(subMonths(fromISO(today), n - 1))),
  to: toISO(endOfMonth(fromISO(today))),
})

export { addDays }
