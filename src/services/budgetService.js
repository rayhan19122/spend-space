import { supabase, unwrap } from './client.js'

export async function listBudgets(userId, projectId) {
  let query = supabase.from('budgets').select('*').eq('user_id', userId)
  if (projectId) query = query.eq('project_id', projectId)
  return unwrap(await query.order('name'))
}

const toRow = ({ projectId, categoryId, name, amountMinor, period, startDate, endDate }) => ({
  project_id: projectId,
  category_id: categoryId || null,
  name: name.trim(),
  amount_minor: amountMinor,
  period,
  start_date: startDate,
  end_date: endDate || null,
})

export async function createBudget(userId, values) {
  return unwrap(await supabase.from('budgets').insert({ ...toRow(values), user_id: userId }).select().single())
}

export async function updateBudget(userId, id, values) {
  return unwrap(await supabase.from('budgets').update(toRow(values)).eq('user_id', userId).eq('id', id).select().single())
}

export async function setBudgetArchived(userId, id, isArchived) {
  unwrap(await supabase.from('budgets').update({ is_archived: isArchived }).eq('user_id', userId).eq('id', id))
}

export async function deleteBudget(userId, id) {
  unwrap(await supabase.from('budgets').delete().eq('user_id', userId).eq('id', id))
}
