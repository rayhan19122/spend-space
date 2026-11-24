import { transactionSearchFilter } from '../utils/search.js'
import { fetchAll, supabase, unwrap } from './client.js'

const LIST_COLUMNS = `*,
  project:projects(id,name,icon,color,is_archived),
  category:categories(id,name,icon,color,is_archived)`

const ANALYTICS_COLUMNS =
  'id,project_id,category_id,type,amount_minor,currency,title,transaction_date'

function applyFilters(query, userId, filters) {
  let scoped = query.eq('user_id', userId)
  const { projectId, projectIds, categoryIds, type, paymentMethod, from, to, search, matches } = filters
  if (projectId) scoped = scoped.eq('project_id', projectId)
  if (projectIds) scoped = scoped.in('project_id', projectIds)
  if (categoryIds) scoped = scoped.in('category_id', categoryIds)
  if (type) scoped = scoped.eq('type', type)
  if (paymentMethod) scoped = scoped.eq('payment_method', paymentMethod)
  if (from) scoped = scoped.gte('transaction_date', from)
  if (to) scoped = scoped.lte('transaction_date', to)
  if (search) scoped = scoped.or(transactionSearchFilter(search, matches))
  return scoped
}

const SORTS = {
  'date-desc': [['transaction_date', false], ['created_at', false], ['id', false]],
  'date-asc': [['transaction_date', true], ['created_at', true], ['id', true]],
  'amount-desc': [['amount_minor', false], ['transaction_date', false], ['id', false]],
  'amount-asc': [['amount_minor', true], ['transaction_date', false], ['id', false]],
}

function applySort(query, sort = 'date-desc') {
  return SORTS[sort].reduce((q, [column, ascending]) => q.order(column, { ascending }), query)
}

export async function listTransactions(userId, { filters = {}, page = 1, pageSize = 25, sort } = {}) {
  const start = (page - 1) * pageSize
  const query = applySort(
    applyFilters(supabase.from('transactions').select(LIST_COLUMNS, { count: 'exact' }), userId, filters),
    sort,
  )
  const { data, count, error } = await query.range(start, start + pageSize - 1)
  if (error) throw error
  return { rows: data, total: count ?? 0 }
}

export async function recentTransactions(userId, filters, limit = 6) {
  return (await listTransactions(userId, { filters, pageSize: limit })).rows
}

export function fetchAnalyticsRows(userId, filters = {}) {
  return fetchAll(() =>
    applySort(applyFilters(supabase.from('transactions').select(ANALYTICS_COLUMNS), userId, filters), 'date-desc'),
  )
}

export function fetchExportRows(userId, filters = {}, sort = 'date-desc') {
  return fetchAll(() =>
    applySort(applyFilters(supabase.from('transactions').select(LIST_COLUMNS), userId, filters), sort),
  )
}

const toRow = ({ projectId, categoryId, type, amountMinor, title, notes, date, paymentMethod }) => ({
  project_id: projectId,
  category_id: categoryId,
  type,
  amount_minor: amountMinor,
  title: title.trim(),
  notes: notes?.trim() || null,
  transaction_date: date,
  payment_method: paymentMethod,
})

export async function createTransaction(userId, values) {
  return unwrap(
    await supabase.from('transactions').insert({ ...toRow(values), user_id: userId }).select().single(),
  )
}

export async function updateTransaction(userId, id, values, { movedProject = false } = {}) {
  const changes = toRow(values)
  // A recorded occurrence stays linked to its rule only inside the rule's project.
  if (movedProject) changes.recurring_rule_id = null
  return unwrap(
    await supabase.from('transactions').update(changes).eq('user_id', userId).eq('id', id).select().single(),
  )
}

export async function deleteTransaction(userId, id) {
  unwrap(await supabase.from('transactions').delete().eq('user_id', userId).eq('id', id))
}
