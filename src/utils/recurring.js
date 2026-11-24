// Recurring rule dates. Every occurrence is computed from the start date rather than the previous
// occurrence, so a rule starting on the 31st returns to the 31st after a short month.
import { addMonths, addYears } from 'date-fns'
import { addDays, fromISO, todayISO, toISO } from './dates.js'

export const FREQUENCY_LABELS = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }

function occurrenceAt(rule, index) {
  const start = fromISO(rule.start_date)
  if (rule.frequency === 'weekly') return toISO(addDays(start, index * 7))
  if (rule.frequency === 'monthly') return toISO(addMonths(start, index))
  return toISO(addYears(start, index))
}

// The first occurrence after `date`, or null if the rule has ended by then.
export function nextOccurrenceAfter(rule, date) {
  let index = 0
  let occurrence = occurrenceAt(rule, index)
  while (occurrence <= date) {
    index += 1
    occurrence = occurrenceAt(rule, index)
  }
  return rule.end_date && occurrence > rule.end_date ? null : occurrence
}

export const isDue = (rule, today = todayISO()) =>
  rule.is_active && Boolean(rule.next_due_date) && rule.next_due_date <= today

export const dueRules = (rules, today = todayISO()) =>
  rules
    .filter((rule) => isDue(rule, today))
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
