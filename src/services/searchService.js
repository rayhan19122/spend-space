import { ilikeTerm } from '../utils/search.js'
import { supabase, unwrap } from './client.js'
import { listTransactions } from './transactionService.js'

// Searches transaction title and notes, plus project and category names. Transactions in a
// matching project or category are returned too, so "university" finds that project's records.
export async function globalSearch(userId, text) {
  const term = ilikeTerm(text)
  const [projects, categories] = await Promise.all([
    supabase.from('projects').select('*').eq('user_id', userId).or(`name.ilike.${term}`).order('name').limit(5).then(unwrap),
    supabase.from('categories').select('id,project_id,name,type,icon,color').eq('user_id', userId).or(`name.ilike.${term}`).order('name').limit(20).then(unwrap),
  ])
  const { rows } = await listTransactions(userId, {
    pageSize: 8,
    filters: {
      search: text,
      matches: { projectIds: projects.map((p) => p.id), categoryIds: categories.map((c) => c.id) },
    },
  })
  return { projects, categories: categories.slice(0, 5), transactions: rows }
}
