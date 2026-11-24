import { Download, Plus, Receipt, Search, SearchX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../common/Button.jsx'
import { Card, EmptyState, ErrorState, LoadingBlock } from '../common/Card.jsx'
import { Pagination } from '../common/Controls.jsx'
import { SelectField, TextField } from '../common/Field.jsx'
import { DateRangeFilter, FilterBar, ProjectFilter, TypeFilter } from '../common/Filters.jsx'
import { useQuickAdd } from '../../context/QuickAddContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useUserId } from '../../context/AuthContext.jsx'
import { useAllCategories, useCategories, useProjects, useTransactionPage } from '../../hooks/useData.js'
import { useDateRange } from '../../hooks/useDateRange.js'
import { useParamState } from '../../hooks/useParamState.js'
import { transactionsCsv } from '../../services/exportService.js'
import { downloadFile } from '../../utils/csv.js'
import { friendlyError } from '../../utils/errors.js'
import { todayISO } from '../../utils/dates.js'
import { PAYMENT_METHODS } from '../../utils/validation.js'
import { TransactionList } from './TransactionList.jsx'

const PAGE_SIZE = 25
const SEARCH_DELAY_MS = 300

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'amount-desc', label: 'Largest amount' },
  { value: 'amount-asc', label: 'Smallest amount' },
]

// A search box backed by the URL. While typing, a local draft is shown and written to the URL after
// a pause. It only writes when the text really differs, because any filter change resets the page.
function useSearchDraft() {
  const [searchParam, setSearchParam] = useParamState('q')
  const [draft, setDraft] = useState(null)
  if (draft !== null && draft === searchParam) setDraft(null)

  useEffect(() => {
    if (draft === null) return undefined
    const timer = setTimeout(() => {
      if (draft.trim() !== searchParam) setSearchParam(draft.trim())
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draft, searchParam, setSearchParam])

  return { search: searchParam, text: draft ?? searchParam, setText: setDraft }
}

// The filterable list used by both the global page and a single project's page.
// With `project` set, every query is locked to that project and the project filter is removed.
export function TransactionBrowser({ project }) {
  const userId = useUserId()
  const quickAdd = useQuickAdd()
  const toast = useToast()
  const range = useDateRange('all')
  const { active, archived } = useProjects()

  const { search, text: searchText, setText: setSearchText } = useSearchDraft()

  const [projectParam, setProjectParam] = useParamState('project')
  const [categoryName, setCategoryName] = useParamState('category')
  const [type, setType] = useParamState('type')
  const [paymentMethod, setPaymentMethod] = useParamState('method')
  const [sort, setSort] = useParamState('sort', 'date-desc')
  const [pageParam, setPageParam] = useParamState('page', '1')
  const [exporting, setExporting] = useState(false)

  const projectId = project?.id ?? projectParam
  const scoped = useCategories(project?.id)
  const all = useAllCategories()
  const allCategories = useMemo(() => (project ? scoped.data : all.data) ?? [], [all.data, project, scoped.data])

  // Categories belong to a project, so a global filter on "Food" means Food in every project.
  const visibleCategories = useMemo(
    () => allCategories.filter((c) => (!projectId || c.project_id === projectId) && (!type || c.type === type)),
    [allCategories, projectId, type],
  )
  const categoryNames = useMemo(() => [...new Set(visibleCategories.map((c) => c.name))].sort(), [visibleCategories])
  const categoryIds = useMemo(
    () => (categoryName ? visibleCategories.filter((c) => c.name === categoryName).map((c) => c.id) : undefined),
    [categoryName, visibleCategories],
  )

  const filters = {
    projectId: projectId || undefined,
    categoryIds,
    type: type || undefined,
    paymentMethod: paymentMethod || undefined,
    from: range.from,
    to: range.to,
    search: search || undefined,
  }
  const page = Math.max(1, Number.parseInt(pageParam, 10) || 1)
  const { data, isPending, error, refetch } = useTransactionPage({ filters, page, pageSize: PAGE_SIZE, sort })

  const hasFilters = Boolean(search || projectParam || categoryName || type || paymentMethod || range.preset !== 'all')
  const isReadOnly = project?.is_archived

  const exportCsv = async () => {
    setExporting(true)
    try {
      const { csv, count } = await transactionsCsv(userId, filters, sort)
      const scope = project ? project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'all-projects'
      downloadFile(`spendspace-${scope}-${todayISO()}.csv`, csv, 'text/csv;charset=utf-8')
      toast.success(`Exported ${count.toLocaleString('en')} transaction${count === 1 ? '' : 's'}.`)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <TextField
            label={project ? `Search ${project.name}` : 'Search transactions'}
            hideLabel
            type="search"
            placeholder="Search title and notes…"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button onClick={exportCsv} loading={exporting} disabled={!data?.total}>
            <Download className="size-4" aria-hidden="true" /> Export
          </Button>
          {!isReadOnly && (
            <Button variant="primary" onClick={() => quickAdd.open({ projectId: project?.id })}>
              <Plus className="size-4" aria-hidden="true" /> Add transaction
            </Button>
          )}
        </div>
      </div>

      <FilterBar
        label="Transaction filters"
        collapsible
        activeCount={[projectParam && !project, categoryName, type, paymentMethod, range.preset !== 'all'].filter(Boolean).length}
        summary={SORT_OPTIONS.find((option) => option.value === sort)?.label}
      >
        {!project && <ProjectFilter active={active} archived={archived} value={projectParam} onChange={setProjectParam} allLabel="All projects" />}
        <SelectField label="Category" value={categoryName} onChange={(event) => setCategoryName(event.target.value)}>
          <option value="">All categories</option>
          {categoryNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </SelectField>
        <TypeFilter value={type} onChange={setType} />
        <SelectField label="Payment method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
        </SelectField>
        <SelectField label="Sort by" value={sort} onChange={(event) => setSort(event.target.value)}>
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectField>
        <DateRangeFilter range={range} />
      </FilterBar>

      <Card className="p-4 lg:p-5">
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : isPending ? (
          <LoadingBlock label="Loading transactions" rows={6} />
        ) : data.rows.length === 0 ? (
          hasFilters ? (
            <EmptyState icon={search ? Search : SearchX} title="No matching transactions" description="Try removing a filter or searching for something else." />
          ) : (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description={project ? `Nothing has been recorded in ${project.name}.` : 'Your income and expenses will appear here.'}
              action={!isReadOnly && <Button variant="primary" onClick={() => quickAdd.open({ projectId: project?.id })}>Add a transaction</Button>}
            />
          )
        ) : (
          <div className="space-y-4">
            <TransactionList rows={data.rows} showProject={!project} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={(next) => setPageParam(String(next))} />
          </div>
        )}
      </Card>
    </div>
  )
}
