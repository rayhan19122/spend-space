import { totals, groupTotals } from '../utils/analytics.js'
import { toCsv } from '../utils/csv.js'
import { minorToDecimalString } from '../utils/money.js'
import { paymentMethodLabel } from '../utils/validation.js'
import { fetchAll, supabase } from './client.js'
import { fetchAnalyticsRows, fetchExportRows } from './transactionService.js'

const TRANSACTION_COLUMNS = [
  { header: 'Date', value: (row) => row.transaction_date, raw: true },
  { header: 'Project', value: (row) => row.project?.name },
  { header: 'Category', value: (row) => row.category?.name },
  { header: 'Type', value: (row) => row.type },
  { header: 'Title', value: (row) => row.title },
  { header: 'Amount', value: (row) => minorToDecimalString(row.amount_minor, row.currency), raw: true },
  { header: 'Currency', value: (row) => row.currency, raw: true },
  { header: 'Payment method', value: (row) => paymentMethodLabel(row.payment_method) },
  { header: 'Notes', value: (row) => row.notes },
]

export async function transactionsCsv(userId, filters, sort) {
  const rows = await fetchExportRows(userId, filters, sort)
  return { csv: toCsv(rows, TRANSACTION_COLUMNS), count: rows.length }
}

// One row per project and currency. Currencies are never added together.
export async function projectSummaryCsv(userId, projects, filters) {
  const rows = await fetchAnalyticsRows(userId, filters)
  const names = new Map(projects.map((project) => [project.id, project.name]))
  const summary = groupTotals(rows, (row) => `${row.project_id}|${row.currency}`).map((group) => {
    const [projectId, currency] = group.key.split('|')
    return { ...group, project: names.get(projectId), currency }
  })
  const money = (key) => (row) => minorToDecimalString(row[key], row.currency)
  const csv = toCsv(summary, [
    { header: 'Project', value: (row) => row.project },
    { header: 'Currency', value: (row) => row.currency, raw: true },
    { header: 'Income', value: money('incomeMinor'), raw: true },
    { header: 'Expenses', value: money('expenseMinor'), raw: true },
    { header: 'Net balance', value: money('netMinor'), raw: true },
    { header: 'Transactions', value: (row) => row.count, raw: true },
  ])
  return { csv, count: summary.length, overall: totals(rows) }
}

const BACKUP_TABLES = ['projects', 'categories', 'transactions', 'budgets', 'recurring_rules']

export async function buildBackup(userId) {
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  const entries = await Promise.all(
    BACKUP_TABLES.map(async (table) => [
      table,
      await fetchAll(() => supabase.from(table).select('*').eq('user_id', userId).order('created_at').order('id')),
    ]),
  )
  return JSON.stringify(
    {
      app: 'SpendSpace',
      version: 1,
      exported_at: new Date().toISOString(),
      note: 'amount_minor values are integer minor units: 50025 BDT means 500.25.',
      profile,
      ...Object.fromEntries(entries),
    },
    null,
    2,
  )
}
