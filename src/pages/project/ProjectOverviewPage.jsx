import { ArrowDownLeft, Plus, Receipt, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ButtonLink } from '../../components/common/Button.jsx'
import { Card, EmptyState, ErrorState, LoadingBlock, SectionCard, StatsSkeleton } from '../../components/common/Card.jsx'
import { RankedBars } from '../../components/charts/RankedBars.jsx'
import { TrendChart } from '../../components/charts/TrendChart.jsx'
import { TextareaField } from '../../components/common/Field.jsx'
import { DateRangeFilter, FilterBar } from '../../components/common/Filters.jsx'
import { StatCard } from '../../components/common/StatCard.jsx'
import { incomeExpenseNetCards } from '../../components/projects/TotalsRow.jsx'
import { TransactionList } from '../../components/transactions/TransactionList.jsx'
import { useQuickAdd } from '../../context/QuickAddContext.jsx'
import { useAnalyticsRows, useBudgetExpenses, useBudgets, useCategories, useDatePattern, useRecentTransactions, useWrite } from '../../hooks/useData.js'
import { useDateRange } from '../../hooks/useDateRange.js'
import { updateProject } from '../../services/projectService.js'
import { effectiveRange, shareByCategoryName, suggestGranularity, totals, trendSeries } from '../../utils/analytics.js'
import { utilization } from '../../utils/budgets.js'
import { formatMoney } from '../../utils/money.js'
import { useProjectContext } from './useProjectContext.js'

function ProjectNotes({ project }) {
  const [notes, setNotes] = useState(project.notes ?? '')
  const save = useWrite((userId, value) => updateProject(userId, project.id, { notes: value.trim() || null }), {
    success: 'Notes saved.',
  })
  const changed = notes !== (project.notes ?? '')
  return (
    <SectionCard title="Project notes">
      {project.is_archived ? (
        <p className="text-sm whitespace-pre-wrap text-ink-2">{project.notes || 'No notes.'}</p>
      ) : (
        <div className="space-y-2">
          <TextareaField label="Notes for this project" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={5000} />
          <div className="flex justify-end">
            <Button size="sm" disabled={!changed} loading={save.isPending} onClick={() => save.mutate(notes)}>Save notes</Button>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

function BudgetStat({ project }) {
  const { data: budgets, isPending } = useBudgets(project.id)
  const active = useMemo(() => (budgets ?? []).filter((budget) => !budget.is_archived), [budgets])
  const { data: rows, isPending: rowsPending } = useBudgetExpenses(active, project.id)
  const loading = isPending || (active.length > 0 && rowsPending)
  const current = useMemo(() => utilization(active, rows ?? []), [active, rows])

  if (loading) return <StatCard label="Current budget" icon={Target} value="…" />
  if (current.budgetCount === 0) {
    return <StatCard label="Current budget" icon={Target} value="—" sub={<Link to="budgets" className="text-link hover:underline">Set a budget</Link>} />
  }
  const over = current.spentMinor > current.amountMinor
  return (
    <StatCard
      label="Budget remaining"
      icon={Target}
      tone={over ? 'danger' : 'neutral'}
      value={formatMoney(current.remainingMinor, project.currency)}
      sub={`${current.percentUsed}% of ${formatMoney(current.amountMinor, project.currency)} · current period`}
    />
  )
}

export default function ProjectOverviewPage() {
  const project = useProjectContext()
  const quickAdd = useQuickAdd()
  const datePattern = useDatePattern()
  const range = useDateRange('this-month')
  const filters = { projectId: project.id, from: range.from, to: range.to }

  const rows = useAnalyticsRows(filters, { enabled: !range.isInverted })
  const recent = useRecentTransactions(filters, 5)
  const { data: categories } = useCategories(project.id)

  const summary = useMemo(() => totals(rows.data ?? []), [rows.data])
  const names = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c.name])), [categories])
  const shares = useMemo(
    () =>
      shareByCategoryName(rows.data ?? [], 'expense', (id) => names.get(id)).map((share) => ({
        ...share,
        key: share.name,
        label: share.name,
      })),
    [names, rows.data],
  )
  const span = useMemo(() => effectiveRange(rows.data ?? [], range.from, range.to), [range.from, range.to, rows.data])
  const series = useMemo(
    () => trendSeries(rows.data ?? [], suggestGranularity(span.from, span.to), span.from, span.to),
    [rows.data, span],
  )

  const rangeLabel = range.describe(datePattern)
  const addButtons = !project.is_archived && (
    <>
      <Button onClick={() => quickAdd.open({ type: 'income', projectId: project.id })}>
        <ArrowDownLeft className="size-4" aria-hidden="true" /> Add income
      </Button>
      <Button variant="primary" onClick={() => quickAdd.open({ type: 'expense', projectId: project.id })}>
        <Plus className="size-4" aria-hidden="true" /> Add expense
      </Button>
    </>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 sm:flex-1"><FilterBar label="Date filter" columns="stack"><DateRangeFilter range={range} /></FilterBar></div>
        <div className="grid grid-cols-2 gap-2 sm:flex">{addButtons}</div>
      </div>

      {rows.error ? (
        <Card><ErrorState error={rows.error} onRetry={rows.refetch} /></Card>
      ) : rows.isPending ? (
        <>
          <StatsSkeleton />
          <LoadingBlock rows={4} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {incomeExpenseNetCards({ totals: summary, currency: project.currency, sub: rangeLabel })}
            <BudgetStat project={project} />
          </div>

          {summary.count === 0 ? (
            <Card>
              <EmptyState
                icon={Receipt}
                title={`No transactions in ${rangeLabel.toLowerCase()}`}
                description={project.is_archived ? 'Try a different date range.' : 'Add your first one, or try a different date range.'}
                action={addButtons}
              />
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-5">
              <SectionCard className="lg:col-span-3" title="Spending over time" subtitle={rangeLabel}>
                <TrendChart data={series} currency={project.currency} />
              </SectionCard>
              <SectionCard className="lg:col-span-2" title="Spending by category" subtitle={rangeLabel}>
                {shares.length ? (
                  <RankedBars rows={shares} currency={project.currency} label="Spending by category" />
                ) : (
                  <EmptyState compact title="No expenses in this period" />
                )}
              </SectionCard>
            </div>
          )}

          {summary.count > 0 && (
            <SectionCard
              title="Recent transactions"
              subtitle={rangeLabel}
              action={<ButtonLink to="transactions" size="sm" variant="ghost">View all</ButtonLink>}
            >
              {recent.isPending ? <LoadingBlock rows={3} /> : <TransactionList rows={recent.data ?? []} showProject={false} compact />}
            </SectionCard>
          )}
        </>
      )}

      <ProjectNotes project={project} />
    </div>
  )
}
