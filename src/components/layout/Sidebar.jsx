import { Plus } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useQuickAdd } from '../../context/QuickAddContext.jsx'
import { useCurrentProjectId } from '../../hooks/useCurrentProject.js'
import { useProjects } from '../../hooks/useData.js'
import { Button } from '../common/Button.jsx'
import { Logo } from './Logo.jsx'
import { NAV_ITEMS } from './navigation.js'

const navClass = ({ isActive }) =>
  `group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
    isActive
      ? 'glass-thumb text-ink [&>svg]:text-primary'
      : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
  }`

export function Sidebar() {
  const quickAdd = useQuickAdd()
  const projectId = useCurrentProjectId()
  const { active } = useProjects()

  return (
    <aside className="liquid fixed inset-y-3 left-3 z-20 hidden w-60 flex-col rounded-[28px] lg:flex">
      <div className="px-5 pt-5 pb-4">
        <Link to="/" className="block rounded-lg" aria-label="SpendSpace home">
          <Logo />
        </Link>
      </div>

      <div className="px-3 pb-3">
        <Button variant="primary" className="w-full lg:h-10" onClick={() => quickAdd.open({ projectId })}>
          <Plus className="size-4" aria-hidden="true" /> Add transaction
        </Button>
      </div>

      <nav aria-label="Main" className="px-3 py-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className={navClass}>
                <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Active projects" className="mx-3 mt-4 min-h-0 flex-1 overflow-y-auto border-t border-line py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-ink-3 uppercase">Your projects</p>
        {active.length === 0 ? (
          <p className="px-3 text-xs text-ink-3">None yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {active.map((project) => (
              <li key={project.id}>
                <NavLink to={`/projects/${project.id}`} className={navClass} title={project.name}>
                  <span className="ml-0.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color, boxShadow: `0 0 0 3px color-mix(in srgb, ${project.color} 22%, transparent)` }} aria-hidden="true" />
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
