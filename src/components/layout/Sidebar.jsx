import { Plus } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useQuickAdd } from '../../context/QuickAddContext.jsx'
import { useCurrentProjectId } from '../../hooks/useCurrentProject.js'
import { useProjects } from '../../hooks/useData.js'
import { Button } from '../common/Button.jsx'
import { Logo } from './Logo.jsx'
import { NAV_ITEMS } from './navigation.js'

const navClass = ({ isActive }) =>
  `flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
  }`

export function Sidebar() {
  const quickAdd = useQuickAdd()
  const projectId = useCurrentProjectId()
  const { active } = useProjects()

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
      <div className="px-4 pt-4 pb-3">
        <Link to="/" className="block rounded-lg" aria-label="SpendSpace home">
          <Logo tagline />
        </Link>
      </div>

      <div className="px-3 pb-2">
        <Button variant="primary" className="w-full" onClick={() => quickAdd.open({ projectId })}>
          <Plus className="size-4" aria-hidden="true" /> Add transaction
        </Button>
      </div>

      <nav aria-label="Main" className="px-3 py-1">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className={navClass}>
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Active projects" className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-line px-3 py-3">
        <p className="px-2.5 pb-1.5 text-xs font-medium text-ink-3">Your projects</p>
        {active.length === 0 ? (
          <p className="px-2.5 text-xs text-ink-3">None yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {active.map((project) => (
              <li key={project.id}>
                <NavLink to={`/projects/${project.id}`} className={navClass} title={project.name}>
                  <span className="ml-1 size-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} aria-hidden="true" />
                  <span className="truncate font-normal">{project.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  )
}
