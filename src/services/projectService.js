import { supabase, unwrap } from './client.js'

export async function listProjects(userId) {
  return unwrap(await supabase.from('projects').select('*').eq('user_id', userId).order('name'))
}

// maybeSingle: a project that doesn't exist, or belongs to someone else, is simply null under RLS.
export async function getProject(userId, projectId) {
  return unwrap(
    await supabase.from('projects').select('*').eq('user_id', userId).eq('id', projectId).maybeSingle(),
  )
}

export async function createProject({ name, description, icon, color, currency, seedCategories, budgetMinor, budgetStart }) {
  return unwrap(
    await supabase
      .rpc('create_project', {
        p_name: name,
        p_description: description,
        p_icon: icon,
        p_color: color,
        p_currency: currency,
        p_seed_categories: seedCategories,
        p_budget_minor: budgetMinor,
        p_budget_period: 'monthly',
        p_budget_start: budgetStart,
      })
      .single(),
  )
}

export async function updateProject(userId, projectId, changes) {
  return unwrap(
    await supabase.from('projects').update(changes).eq('user_id', userId).eq('id', projectId).select().single(),
  )
}

export async function deleteProject(userId, projectId) {
  unwrap(await supabase.from('projects').delete().eq('user_id', userId).eq('id', projectId))
}

// For the delete confirmation, so the user sees what will be lost.
export async function getProjectRecordCounts(userId, projectId) {
  const count = async (table) => {
    const { count: total, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('project_id', projectId)
    if (error) throw error
    return total ?? 0
  }
  const [transactions, budgets, categories, rules] = await Promise.all([
    count('transactions'),
    count('budgets'),
    count('categories'),
    count('recurring_rules'),
  ])
  return { transactions, budgets, categories, rules }
}

export async function resetAllData() {
  unwrap(await supabase.rpc('reset_my_data'))
}
