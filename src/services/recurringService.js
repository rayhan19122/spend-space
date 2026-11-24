import { addDays, fromISO, todayISO, toISO } from '../utils/dates.js'
import { isDuplicateError } from '../utils/errors.js'
import { nextOccurrenceAfter } from '../utils/recurring.js'
import { supabase, unwrap } from './client.js'

export async function listRules(userId) {
  return unwrap(
    await supabase
      .from('recurring_rules')
      .select('*, project:projects(id,name,icon,color,is_archived), category:categories(id,name,icon,color)')
      .eq('user_id', userId)
      .order('next_due_date', { nullsFirst: false }),
  )
}

const toRow = ({ projectId, categoryId, type, amountMinor, title, notes, paymentMethod, frequency, startDate, endDate }) => ({
  project_id: projectId,
  category_id: categoryId,
  type,
  amount_minor: amountMinor,
  title: title.trim(),
  notes: notes?.trim() || null,
  payment_method: paymentMethod,
  frequency,
  start_date: startDate,
  end_date: endDate || null,
})

export async function createRule(userId, values) {
  return unwrap(
    await supabase
      .from('recurring_rules')
      .insert({ ...toRow(values), user_id: userId, next_due_date: values.startDate })
      .select()
      .single(),
  )
}

export async function updateRule(userId, rule, values) {
  const row = toRow(values)
  const scheduleChanged =
    row.start_date !== rule.start_date || row.frequency !== rule.frequency || row.end_date !== rule.end_date
  if (scheduleChanged) row.next_due_date = rescheduledDueDate(rule, row)
  return unwrap(
    await supabase.from('recurring_rules').update(row).eq('user_id', userId).eq('id', rule.id).select().single(),
  )
}

// Nothing handled yet: the rule starts at its new start date. Otherwise it continues from where
// it had reached, so a schedule edit never asks the user to re-record past occurrences.
function rescheduledDueDate(rule, row) {
  if (rule.next_due_date === rule.start_date) return row.start_date
  const reached = rule.next_due_date ?? todayISO()
  return nextOccurrenceAfter(row, toISO(addDays(fromISO(reached), -1)))
}

export async function setRuleActive(userId, id, isActive) {
  unwrap(await supabase.from('recurring_rules').update({ is_active: isActive }).eq('user_id', userId).eq('id', id))
}

export async function deleteRule(userId, id) {
  unwrap(await supabase.from('recurring_rules').delete().eq('user_id', userId).eq('id', id))
}

async function advance(userId, rule) {
  const next = nextOccurrenceAfter(rule, rule.next_due_date)
  unwrap(
    await supabase
      .from('recurring_rules')
      .update({ next_due_date: next })
      .eq('user_id', userId)
      .eq('id', rule.id),
  )
}

// Creates the actual transaction for the due occurrence. The database's unique index makes this
// safe to retry: if the insert succeeded earlier but the advance didn't, only the advance reruns.
export async function recordOccurrence(userId, rule) {
  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    project_id: rule.project_id,
    category_id: rule.category_id,
    type: rule.type,
    amount_minor: rule.amount_minor,
    title: rule.title,
    notes: rule.notes,
    payment_method: rule.payment_method,
    transaction_date: rule.next_due_date,
    recurring_rule_id: rule.id,
    occurrence_date: rule.next_due_date,
  })
  if (error && !isDuplicateError(error)) throw error
  await advance(userId, rule)
}

export const skipOccurrence = advance
