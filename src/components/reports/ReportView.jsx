import { CalendarDays, CircleDollarSign, Gauge, Repeat2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAllCategories, useAnalyticsRows, useCategories, useDateFormatter, useDatePattern, useProfile, useProjects } from '../../hooks/useData.js'
import { useCurrencyScope } from '../../hooks/useCurrencyScope.js'
import { useDateRange } from '../../hooks/useDateRange.js'
import { useParamState } from '../../hooks/useParamState.js'
import {
  averageDailySpending,
  effectiveRange,
  highestSpendingDay,
  largestExpense,
  mostFrequentCategory,
  shareByCategoryName,
  suggestGranularity,
  totals,
  totalsByProject,
  trendSeries,
} from '../../utils/analytics.js'
import { DEFAULT_CURRENCY } from '../../utils/currency.js'
import { formatMoney } from '../../utils/money.js'
import { RankedBars } from '../charts/RankedBars.jsx'
import { TrendChart } from '../charts/TrendChart.jsx'
import { Card, EmptyState, ErrorState, LoadingBlock, SectionCard, StatsSkeleton } from '../common/Card.jsx'
import { Segmented } from '../common/Controls.jsx'
import { SelectField } from '../common/Field.jsx'
import { CurrencyScope, DateRangeFilter, FilterBar, ProjectFilter, TypeFilter } from '../common/Filters.jsx'
import { StatCard } from '../common/StatCard.jsx'
import { incomeExpenseNetCards } from '../projects/TotalsRow.jsx'

const GRANULARITIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const NOT_ENOUGH = 'Not enough data yet'

function Insight({ icon: Icon, label, value, detail }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
        <Icon className="size-3.5" aria-hidden="true" /> {label}
      </p>
      <p className={`mt-1 truncate text-sm ${value ? 'font-semibold text-ink' : 'text-ink-3'}`}>{value ?? NOT_ENOUGH}</p>
      {detail && <p className="truncate text-xs text-ink-3">{detail}</p>}
    </div>
  )
}

function ProjectTable({ groups, projectsById, currency }) {
  const money = (minor) => formatMoney(minor, currency)
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-3">
            <th scope="col" className="py-1.5 font-medium">Project</th>
            <th scope="col" className="py-1.5 text-right font-medium">Income</th>
            <th scope="col" className="py-1.5 text-right font-medium">Expenses</th>
            <th scope="col" className="py-1.5 text-right font-medium">Net</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {groups.map((group) => {
            const project = projectsById.get(group.key)
            return (
              <tr key={group.key}>
                <td className="max-w-40 truncate py-2 pr-3">
                  <Link to={`/projects/${group.key}`} className="font-medium text-ink hover:underline">{project?.name}</Link>
                </td>
                <td className="tabular py-2 text-right text-ink">{money(group.incomeMinor)}</td>
                <td className="tabular py-2 text-right text-ink">{money(group.expenseMinor)}</td>
                <td className={`tabular py-2 text-right font-medium ${group.netMinor < 0 ? 'text-danger' : 'text-ink'}`}>{money(group.netMinor)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Reports for all projects, or for one when `project` is set. Everything here is computed from
// the filtered rows, so a filter applies to every figure on the page at once.
export function ReportView({ project }) {
  const formatDate = useDateFormatter()
  const datePattern = useDatePattern()
  const { active, archived, projects, isPending: projectsPending } = useProjects()
  const { data: profile } = useProfile()
  const range = useDateRange('this-month')

  const [projectParam, setProjectParam] = useParamState('project')
  const [categoryName, setCategoryName] = useParamState('category')
  const [type, setType] = useParamState('type')
  const [granularityChoice, setGranularity] = useState(null)

  const selected = project ?? projects.find((p) => p.id === projectParam)
  const inScope = useMemo(() => (selected ? [selected] : active), [active, selected])
  const scope = useCurrencyScope(inScope, profile?.default_currency ?? DEFAULT_CURRENCY)

  const projectCategories = useCategories(project?.id)
  const allCategories = useAllCategories()
  const categories = useMemo(() => (project ? projectCategories.data : allCategories.data) ?? [], [allCategories.data, project, projectCategories.data])
  const lookup = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const scopeIds = useMemo(() => new Set(scope.scopedProjects.map((p) => p.id)), [scope.scopedProjects])
  const scopedCategories = useMemo(
    () => categories.filter((c) => scopeIds.has(c.project_id) && (!type || c.type === type)),
    [categories, scopeIds, type],
  )
  const categoryNames = useMemo(() => [...new Set(scopedCategories.map((c) => c.name))].sort(), [scopedCategories])
  const categoryIds = useMemo(
    () => (categoryName ? scopedCategories.filter((c) => c.name === categoryName).map((c) => c.id) : undefined),
    [categoryName, scopedCategories],
  )

  const rowsQuery = useAnalyticsRows(
    {
      projectIds: [...scopeIds].sort(),
      categoryIds,
      type: type || undefined,
      from: range.from,
      to: range.to,
    },
    { enabled: scopeIds.size > 0 && !range.isInverted },
  )
  const rows = useMemo(() => rowsQuery.data ?? [], [rowsQuery.data])

  const report = useMemo(() => {
    const span = effectiveRange(rows, range.from, range.to)
    const metric = type === 'income' ? 'income' : 'expense'
    return {
      span,
      metric,
      summary: totals(rows),
      average: averageDailySpending(rows, span.from, span.to),
      byProject: totalsByProject(rows),
      byCategory: shareByCategoryName(rows, metric, (id) => lookup.get(id)?.name).map((share) => ({
        ...share,
        key: share.name,
        label: share.name,
      })),
      largest: largestExpense(rows),
      frequent: mostFrequentCategory(rows),
      highestDay: highestSpendingDay(rows),
    }
  }, [lookup, range.from, range.to, rows, type])

  const granularity = granularityChoice ?? suggestGranularity(report.span.from, report.span.to)
  const series = useMemo(
    () => trendSeries(rows, granularity, report.span.from, report.span.to),
    [granularity, report.span, rows],
  )

  const money = (minor) => formatMoney(minor, scope.currency)
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const rangeLabel = range.describe(datePattern)
  const scopeLabel = project ? project.name : selected ? selected.name : 'All active projects'
  const seriesNames = type ? [type] : ['expense', 'income']
  const loading = projectsPending || (rowsQuery.isPending && scopeIds.size > 0 && !range.isInverted)

  return (
    <div className="space-y-4">
      <FilterBar
        label="Report filters"
        collapsible
        activeCount={[projectParam && !project, categoryName, type].filter(Boolean).length}
        summary={rangeLabel}
      >
        <DateRangeFilter range={range} />
        {!project && <ProjectFilter active={active} archived={archived} value={projectParam} onChange={setProjectParam} />}
        <SelectField label="Category" value={categoryName} onChange={(event) => setCategoryName(event.target.value)}>
          <option value="">All categories</option>
          {categoryNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </SelectField>
        <TypeFilter value={type} onChange={setType} />
      </FilterBar>

      {!project && <CurrencyScope scope={scope} />}

      {rowsQuery.error ? (
        <Card><ErrorState error={rowsQuery.error} onRetry={rowsQuery.refetch} /></Card>
      ) : loading ? (
        <>
          <StatsSkeleton />
          <LoadingBlock rows={4} />
        </>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon={Gauge} title="Nothing to report" description={`No transactions match these filters for ${scopeLabel} in ${rangeLabel.toLowerCase()}.`} />
        </Card>
      ) : (
        <>
          <p className="text-xs text-ink-3">{project ? 'This project' : selected ? `Project: ${selected.name}` : 'Combined totals, all active projects'} · {rangeLabel} · {report.summary.count.toLocaleString('en')} transaction{report.summary.count === 1 ? '' : 's'}</p>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {incomeExpenseNetCards({ totals: report.summary, currency: scope.currency, type, sub: rangeLabel })}
            <StatCard
              label="Average daily spending"
              icon={CalendarDays}
              value={type === 'income' ? '—' : money(report.average)}
              sub={type === 'income' ? 'Hidden by the type filter' : 'Per day so far in this range'}
            />
          </div>

          <SectionCard
            title="Trend"
            subtitle={rangeLabel}
            action={<Segmented label="Trend grouping" size="sm" options={GRANULARITIES} value={granularity} onChange={setGranularity} />}
          >
            <TrendChart data={series} currency={scope.currency} series={seriesNames} height={260} />
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title={report.metric === 'income' ? 'Income by category' : 'Spending by category'} subtitle="Share of the total shown">
              {report.byCategory.length ? (
                <RankedBars rows={report.byCategory} currency={scope.currency} label="Totals by category" />
              ) : (
                <EmptyState compact title="No expenses in this selection" />
              )}
            </SectionCard>

            <SectionCard title="Highlights" subtitle="Only shown when the data supports them">
              <div className="grid gap-4 sm:grid-cols-2">
                <Insight
                  icon={CircleDollarSign}
                  label="Largest expense"
                  value={report.largest && `${money(report.largest.amount_minor)} · ${report.largest.title}`}
                  detail={report.largest && formatDate(report.largest.transaction_date)}
                />
                <Insight
                  icon={Repeat2}
                  label="Most frequent category"
                  value={report.frequent && lookup.get(report.frequent.categoryId)?.name}
                  detail={report.frequent && `${report.frequent.count} expenses`}
                />
                <Insight
                  icon={CalendarDays}
                  label="Highest spending day"
                  value={report.highestDay && formatDate(report.highestDay.date)}
                  detail={report.highestDay && money(report.highestDay.amountMinor)}
                />
              </div>
            </SectionCard>
          </div>

          {!project && !selected && (
            <SectionCard title="By project" subtitle="Income, expenses and net balance">
              <ProjectTable groups={report.byProject} projectsById={projectsById} currency={scope.currency} />
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
