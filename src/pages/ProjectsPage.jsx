import { Archive, FolderPlus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/common/Button.jsx'
import { Card, EmptyState, ErrorState, Skeleton } from '../components/common/Card.jsx'
import { Segmented } from '../components/common/Controls.jsx'
import { ProjectCard } from '../components/projects/ProjectCard.jsx'
import { EditProjectDialog, NewProjectDialog } from '../components/projects/ProjectFormDialog.jsx'
import { DeleteProjectDialog } from '../components/projects/ProjectLifecycle.jsx'
import { useAnalyticsRows, useBudgets, useProjects } from '../hooks/useData.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { useParamState } from '../hooks/useParamState.js'
import { useArchiveProject } from '../hooks/useProjectActions.js'
import { totalsByProject } from '../utils/analytics.js'
import { utilization } from '../utils/budgets.js'

export default function ProjectsPage() {
  useDocumentTitle('Projects')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [view, setView] = useParamState('view', 'active')
  const { active, archived, isPending, error, refetch } = useProjects()
  const rows = useAnalyticsRows({ type: 'expense' })
  const budgets = useBudgets()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const archive = useArchiveProject()

  const creatingFromLink = params.get('new') === '1'
  const closeCreate = () => {
    setCreating(false)
    if (creatingFromLink) navigate('/projects', { replace: true })
  }

  const spent = useMemo(
    () => new Map(totalsByProject(rows.data ?? []).map((group) => [group.key, group.expenseMinor])),
    [rows.data],
  )
  const budgetFor = (project) =>
    utilization((budgets.data ?? []).filter((b) => b.project_id === project.id), rows.data ?? [])

  const list = view === 'archived' ? archived : active
  const newButton = (
    <Button variant="primary" onClick={() => setCreating(true)}>
      <Plus className="size-4" aria-hidden="true" /> New project
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Which projects to show"
          value={view}
          onChange={setView}
          options={[
            { value: 'active', label: `Active${isPending ? '' : ` (${active.length})`}` },
            { value: 'archived', label: `Archived${isPending ? '' : ` (${archived.length})`}` },
          ]}
        />
        {newButton}
      </div>

      {error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : isPending || rows.isPending || budgets.isPending ? (
        <div role="status" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <span className="sr-only">Loading projects…</span>
          {[0, 1, 2].map((key) => <Skeleton key={key} className="h-44 rounded-xl" />)}
        </div>
      ) : list.length === 0 ? (
        <Card>
          {view === 'archived' ? (
            <EmptyState icon={Archive} title="No archived projects" description="Archived projects are kept here, read-only, until you restore or delete them." />
          ) : (
            <EmptyState
              icon={FolderPlus}
              title="Create your first project"
              description="Projects keep your money separate: Personal, University, a trip, a savings goal. Each has its own transactions, categories and budgets."
              action={newButton}
            />
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {list.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              spentMinor={spent.get(project.id) ?? 0}
              budget={budgetFor(project)}
              onEdit={() => setEditing(project)}
              onArchive={(isArchived) => archive.mutate({ project, isArchived })}
              onDelete={() => setDeleting(project)}
            />
          ))}
        </div>
      )}

      {(creating || creatingFromLink) && <NewProjectDialog open onClose={closeCreate} />}
      {editing && <EditProjectDialog key={editing.id} project={editing} open onClose={() => setEditing(null)} />}
      {deleting && <DeleteProjectDialog key={deleting.id} project={deleting} open onClose={() => setDeleting(null)} />}
    </div>
  )
}
