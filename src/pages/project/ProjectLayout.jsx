import { ArchiveRestore, ChevronsUpDown, FolderX, Info } from 'lucide-react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { Button, ButtonLink } from '../../components/common/Button.jsx'
import { Badge, Banner, Card, EmptyState, ErrorState, Skeleton } from '../../components/common/Card.jsx'
import { Menu } from '../../components/common/Controls.jsx'
import { ColorIcon } from '../../components/common/Identity.jsx'
import { useProject, useProjects } from '../../hooks/useData.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { useArchiveProject } from '../../hooks/useProjectActions.js'

const TABS = [
  { to: '', label: 'Overview', end: true },
  { to: 'transactions', label: 'Transactions' },
  { to: 'categories', label: 'Categories' },
  { to: 'budgets', label: 'Budgets' },
  { to: 'reports', label: 'Reports' },
  { to: 'settings', label: 'Settings' },
]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const tabClass = ({ isActive }) =>
  `flex h-10 shrink-0 items-center rounded-xl px-3.5 text-sm font-medium transition-colors lg:h-9 ${
    isActive ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:text-ink'
  }`

function ProjectSwitcher({ current }) {
  const { active } = useProjects()
  const navigate = useNavigate()
  const others = active.filter((project) => project.id !== current.id)
  if (!others.length) return null
  return (
    <Menu
      label="Switch project"
      align="left"
      trigger={(props) => (
        <Button variant="ghost" size="icon" title="Switch project" {...props}>
          <ChevronsUpDown className="size-4" aria-hidden="true" />
        </Button>
      )}
      items={others.map((project) => ({ label: project.name, onSelect: () => navigate(`/projects/${project.id}`) }))}
    />
  )
}

export default function ProjectLayout() {
  const { projectId } = useParams()
  const validId = UUID.test(projectId)
  const { data: project, isPending, error, refetch } = useProject(validId ? projectId : '')
  const archive = useArchiveProject()
  useDocumentTitle(project?.name ?? 'Project')

  if (!validId || (!isPending && !error && !project)) {
    // Identical for a project that doesn't exist and one belonging to someone else.
    return (
      <Card>
        <EmptyState
          icon={FolderX}
          title="Project not found"
          description="It may have been deleted, or the link may be wrong."
          action={<ButtonLink variant="primary" to="/projects">View your projects</ButtonLink>}
        />
      </Card>
    )
  }
  if (error) return <Card><ErrorState error={error} onRetry={refetch} /></Card>
  if (isPending) {
    return (
      <div role="status" className="space-y-4">
        <span className="sr-only">Loading project…</span>
        <Skeleton className="h-11 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* z-20 keeps the project switcher menu above the tabs and cards that follow. */}
      <header className="fade-up relative z-20">
        <div
          className="relative flex min-w-0 items-center gap-4 rounded-3xl border border-line p-4 lg:p-5"
          style={{ background: `linear-gradient(120deg, color-mix(in srgb, ${project.color} 16%, var(--surface)), var(--surface) 70%)` }}
        >
          <ColorIcon icon={project.icon} color={project.color} size="lg" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1">
              <h2 className="truncate text-xl font-bold tracking-tight text-ink lg:text-2xl">{project.name}</h2>
              <ProjectSwitcher current={project} />
              {project.is_archived && <Badge>Archived</Badge>}
            </div>
            {project.description && <p className="truncate text-sm text-ink-2">{project.description}</p>}
          </div>
        </div>
        <nav aria-label={`${project.name} sections`} className="scroll-x-hidden mt-3 flex gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1 lg:inline-flex lg:max-w-full">
          {TABS.map((tab) => (
            <NavLink key={tab.label} to={tab.to} end={tab.end} className={tabClass}>{tab.label}</NavLink>
          ))}
        </nav>
      </header>

      {project.is_archived && (
        <Banner
          tone="neutral"
          icon={Info}
          action={
            <Button size="sm" loading={archive.isPending} onClick={() => archive.mutate({ project, isArchived: false })}>
              <ArchiveRestore className="size-4" aria-hidden="true" /> Restore
            </Button>
          }
        >
          This project is archived and read-only. Restore it to make changes.
        </Banner>
      )}

      {/* The key discards all page state when the project changes, including open dialogs. */}
      <Outlet key={project.id} context={{ project }} />
    </div>
  )
}
