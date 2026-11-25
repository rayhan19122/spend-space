import { ArrowDownLeft, CalendarClock, FolderKanban, FolderPlus, Plus, Receipt, Target, Trophy } from 'lucide-react'
import { format } from 'date-fns'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { RankedBars } from '../components/charts/RankedBars.jsx'
import { TrendChart } from '../components/charts/TrendChart.jsx'
import { Button, ButtonLink } from '../components/common/Button.jsx'
import { Banner, Card, EmptyState, ErrorState, LoadingBlock, SectionCard, StatsSkeleton } from '../components/common/Card.jsx'
import { CurrencyScope, DateRangeFilter, FilterBar, ProjectFilter, TypeFilter } from '../components/common/Filters.jsx'
import { ColorIcon } from '../components/common/Identity.jsx'
import { StatCard } from '../components/common/StatCard.jsx'
import { BalanceHero } from '../components/projects/BalanceHero.jsx'
import { TransactionList } from '../components/transactions/TransactionList.jsx'
import { useQuickAdd } from '../context/QuickAddContext.jsx'
import { useCurrencyScope } from '../hooks/useCurrencyScope.js'
import {
  useAllCategories,
  useAnalyticsRows,
  useBudgetExpenses,
  useBudgets,
  useDatePattern,
  useProfile,
  useProjects,
  useRecentTransactions,
  useRecurringRules,
} from '../hooks/useData.js'
import { useDateRange } from '../hooks/useDateRange.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { useParamState } from '../hooks/useParamState.js'
import { shareByCategoryName, totals, totalsByProject, trendSeries } from '../utils/analytics.js'
import { utilization } from '../utils/budgets.js'
import { DEFAULT_CURRENCY } from '../utils/currency.js'
import { lastNMonthsRange } from '../utils/dates.js'
import { formatMoney, percentOf, sumMinor } from '../utils/money.js'
import { dueRules } from '../utils/recurring.js'

function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 5) return 'Good evening'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// The name to greet someone by: the first word that is not a title or a prefix such as "Md.".
const NAME_PREFIXES = /^(md|mohd|muhammad|mohammad|mohammed|mr|mrs|ms|miss|dr|engr|prof|sk|sheikh)\.?$/i
function givenName(displayName) {
  const words = displayName?.trim().split(/\s+/).filter(Boolean) ?? []
  return words.find((word) => !NAME_PREFIXES.test(word)) ?? words[0]
}

function QuickActions({ projectId }) {
  const quickAdd = useQuickAdd()
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <Button variant="primary" onClick={() => quickAdd.open({ type: 'expense', projectId })}>
        <Plus className="size-4" aria-hidden="true" /> Add expense
      </Button>
      <Button onClick={() => quickAdd.open({ type: 'income', projectId })}>
        <ArrowDownLeft className="size-4" aria-hidden="true" /> Add income
      </Button>
      <ButtonLink to="/projects?new=1" className="max-sm:hidden">
        <FolderPlus className="size-4" aria-hidden="true" /> Create project
      </ButtonLink>
    </div>
  )
}

function DueRulesBanner() {
  const { data } = useRecurringRules()
  const due = useMemo(() => dueRules((data ?? []).filter((rule) => !rule.project?.is_archived)), [data])
  if (!due.length) return null
  return (
    <Banner
      icon={CalendarClock}
      action={<ButtonLink to="/recurring" size="sm">Review</ButtonLink>}
    >
      {due.length} recurring {due.length === 1 ? 'item is' : 'items are'} due. Nothing is recorded until you confirm.
    </Banner>
  )
}

function BudgetUtilizationCard({ projects, projectIds, currency }) {
  const { data: budgets, isPending } = useBudgets()
  const scoped = useMemo(
    () => (budgets ?? []).filter((b) => projectIds.has(b.project_id) && !b.is_archived),
    [budgets, projectIds],
  )
  const { data: rows, isPending: rowsPending } = useBudgetExpenses(scoped)
  const current = useMemo(() => utilization(scoped, rows ?? []), [scoped, rows])

  if (isPending || (scoped.length > 0 && rowsPending)) return <StatCard label="Budget used" icon={Target} value="…" />
  if (current.budgetCount === 0) {
    return <StatCard label="Budget used" icon={Target} value="—" sub={projects.length ? 'No budget running today' : undefined} />
  }
  return (
    <StatCard
      label="Budget used"
      icon={Target}
      tone={current.spentMinor > current.amountMinor ? 'danger' : 'neutral'}
      value={`${current.percentUsed}%`}
      sub={`${formatMoney(current.spentMinor, currency)} of ${formatMoney(current.amountMinor, currency)} · current periods`}
    />
  )
}

function HighestSpendingProject({ group, project, share, currency }) {
  return (
    <Link to={`/projects/${project.id}`} className="-m-2 flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2">
      <ColorIcon icon={project.icon} color={project.color} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{project.name}</p>
        <p className="text-xs text-ink-3">{share}% of expenses in this view</p>
      </div>
      <p className="tabular shrink-0 text-sm font-semibold text-ink">{formatMoney(group.expenseMinor, currency)}</p>
    </Link>
  )
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard')
  const datePattern = useDatePattern()
  const { active, archived, projects, isPending: projectsPending, error: projectsError, refetch } = useProjects()
  const { data: profile } = useProfile()
  const { data: categories } = useAllCategories()
  const range = useDateRange('this-month')
  const [projectParam, setProjectParam] = useParamState('project')
  const [type, setType] = useParamState('type')

  const selected = projects.find((p) => p.id === projectParam)
  const inScope = useMemo(() => (selected ? [selected] : active), [active, selected])
  const scope = useCurrencyScope(inScope, profile?.default_currency ?? DEFAULT_CURRENCY)
  const projectIds = useMemo(() => new Set(scope.scopedProjects.map((p) => p.id)), [scope.scopedProjects])
  const sortedIds = useMemo(() => [...projectIds].sort(), [projectIds])
  const hasScope = sortedIds.length > 0

  const filters = { projectIds: sortedIds, type: type || undefined }
  const rowsQuery = useAnalyticsRows({ ...filters, from: range.from, to: range.to }, { enabled: hasScope && !range.isInverted })
  const months = lastNMonthsRange(12)
  const trendQuery = useAnalyticsRows({ ...filters, ...months }, { enabled: hasScope })
  const recent = useRecentTransactions({ ...filters, from: range.from, to: range.to }, 6)
  const rows = useMemo(() => rowsQuery.data ?? [], [rowsQuery.data])

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const names = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c.name])), [categories])
  const metric = type === 'income' ? 'income' : 'expense'
  const metricKey = metric === 'income' ? 'incomeMinor' : 'expenseMinor'
  const metricLabel = metric === 'income' ? 'Income' : 'Spending'

  const view = useMemo(() => {
    const byProject = totalsByProject(rows)
    const whole = sumMinor(byProject.map((group) => group[metricKey]))
    return {
      summary: totals(rows),
      byProject,
      projectBars: byProject
        .filter((group) => group[metricKey] > 0)
        .sort((a, b) => b[metricKey] - a[metricKey])
        .map((group) => {
          const project = projectsById.get(group.key)
          return {
            key: group.key,
            label: project?.name ?? 'Project',
            color: project?.color,
            to: `/projects/${group.key}`,
            amountMinor: group[metricKey],
            percent: percentOf(group[metricKey], whole),
          }
        }),
      categoryBars: shareByCategoryName(rows, metric, (id) => names.get(id)).map((share) => ({
        ...share,
        key: share.name,
        label: share.name,
      })),
    }
  }, [metric, metricKey, names, projectsById, rows])

  const trend = useMemo(
    () => trendSeries(trendQuery.data ?? [], 'monthly', months.from, months.to),
    [months.from, months.to, trendQuery.data],
  )

  const top = view.byProject[0]
  const topProject = top && top.expenseMinor > 0 ? projectsById.get(top.key) : null
  const totalExpense = view.summary.expenseMinor
  const rangeLabel = range.describe(datePattern)
  const scopeLabel = selected ? `Project: ${selected.name}` : 'Combined totals · all active projects'

  if (projectsError) return <Card><ErrorState error={projectsError} onRetry={refetch} /></Card>
  if (projectsPending) {
    return (
      <div className="space-y-4">
        <StatsSkeleton />
        <LoadingBlock rows={4} />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={FolderPlus}
          title="Welcome to SpendSpace"
          description="Start with a project: a separate space for one part of your money, such as Personal, University or a trip. Every transaction lives in exactly one project."
          action={<ButtonLink variant="primary" to="/projects?new=1">Create your first project</ButtonLink>}
        />
      </Card>
    )
  }

  const firstName = givenName(profile?.display_name)

  return (
    <div className="space-y-5">
      <div className="fade-up flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="glass-control inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-ink-2">
            <span className="size-1.5 rounded-full bg-income shadow-[0_0_0_3px_color-mix(in_srgb,var(--income)_25%,transparent)]" aria-hidden="true" />
            {format(new Date(), 'EEEE, d MMMM')}
          </p>
          <h2 className="mt-3 text-[28px] leading-tight font-extrabold tracking-tight text-ink lg:text-4xl">
            {greeting()}{firstName ? <>, <span className="text-brand">{firstName}</span></> : ''}
          </h2>
          <p className="mt-1.5 text-sm text-ink-2">Here’s where your money stands · <span className="font-medium text-ink">{rangeLabel}</span></p>
        </div>
        <QuickActions projectId={selected && !selected.is_archived ? selected.id : undefined} />
      </div>

      <div className="flex flex-col gap-3">
        <FilterBar label="Dashboard filters" collapsible activeCount={[projectParam, type].filter(Boolean).length} summary={rangeLabel}>
          <DateRangeFilter range={range} />
          <ProjectFilter active={active} archived={archived} value={projectParam} onChange={setProjectParam} />
          <TypeFilter value={type} onChange={setType} />
        </FilterBar>
      </div>

      <DueRulesBanner />
      <CurrencyScope scope={scope} />

      {rowsQuery.error ? (
        <Card><ErrorState error={rowsQuery.error} onRetry={rowsQuery.refetch} /></Card>
      ) : rowsQuery.isPending && hasScope && !range.isInverted ? (
        <>
          <StatsSkeleton count={5} />
          <LoadingBlock rows={4} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
            <div className="min-w-0 lg:col-span-2">
              <BalanceHero totals={view.summary} currency={scope.currency} type={type} eyebrow={scopeLabel} caption={rangeLabel} />
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
            <StatCard
              label="Active projects"
              icon={FolderKanban}
              value={active.length}
              sub={archived.length ? `${archived.length} archived` : 'None archived'}
            />
            <BudgetUtilizationCard projects={scope.scopedProjects} projectIds={projectIds} currency={scope.currency} />
            </div>
          </div>

          {view.summary.count === 0 ? (
            <Card>
              <EmptyState
                icon={Receipt}
                title={`No transactions in ${rangeLabel.toLowerCase()}`}
                description="Add one, or choose a wider date range."
              />
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title={`${metricLabel} by project`} subtitle={`${rangeLabel}. Select a project to open it.`}>
                {view.projectBars.length ? (
                  <RankedBars rows={view.projectBars} currency={scope.currency} label={`${metricLabel} by project`} />
                ) : (
                  <EmptyState compact title="Nothing in this selection" />
                )}
              </SectionCard>
              <SectionCard title={`${metricLabel} by category`} subtitle={`${rangeLabel}. Same-named categories are combined.`}>
                {view.categoryBars.length ? (
                  <RankedBars rows={view.categoryBars} currency={scope.currency} label={`${metricLabel} by category`} />
                ) : (
                  <EmptyState compact title="Nothing in this selection" />
                )}
              </SectionCard>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard className="lg:col-span-2" title={`Monthly ${metricLabel.toLowerCase()} trend`} subtitle="Last 12 months">
              {trendQuery.isPending ? (
                <LoadingBlock rows={4} />
              ) : (
                <TrendChart data={trend} currency={scope.currency} series={[metric]} />
              )}
            </SectionCard>
            <SectionCard title="Highest spending project" subtitle={rangeLabel}>
              {topProject ? (
                <HighestSpendingProject
                  group={top}
                  project={topProject}
                  currency={scope.currency}
                  share={percentOf(top.expenseMinor, totalExpense)}
                />
              ) : (
                <EmptyState compact icon={Trophy} title="No expenses in this selection" />
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Recent transactions"
            subtitle={`${scopeLabel} · ${rangeLabel}`}
            action={<ButtonLink to="/transactions" size="sm" variant="ghost">View all</ButtonLink>}
          >
            {recent.isPending ? (
              <LoadingBlock rows={3} />
            ) : recent.data?.length ? (
              <TransactionList rows={recent.data} compact />
            ) : (
              <EmptyState compact title="No transactions in this selection" />
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}
