import { FolderKanban, LayoutDashboard, LogOut, Menu as MenuIcon, Plus, Receipt } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useQuickAdd } from '../../context/QuickAddContext.jsx'
import { useCurrentProjectId } from '../../hooks/useCurrentProject.js'
import { signOut } from '../../services/authService.js'
import { Dialog } from '../common/Dialog.jsx'
import { MORE_ITEMS } from './navigation.js'

const tabClass = ({ isActive }) =>
  `flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
    isActive ? 'text-primary [&>svg]:drop-shadow-[0_2px_6px_var(--primary)]' : 'text-ink-3 hover:text-ink'
  }`

export function BottomNav() {
  const quickAdd = useQuickAdd()
  const projectId = useCurrentProjectId()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-20 px-3 lg:hidden">
        <div className="liquid mx-auto mb-2 flex max-w-lg items-center rounded-[28px]">
          <NavLink to="/" end className={tabClass}>
            <LayoutDashboard className="size-5" aria-hidden="true" /> Dashboard
          </NavLink>
          <NavLink to="/projects" className={tabClass}>
            <FolderKanban className="size-5" aria-hidden="true" /> Projects
          </NavLink>
          <div className="flex flex-1 justify-center">
            <button
              type="button"
              aria-label="Add transaction"
              onClick={() => quickAdd.open({ projectId })}
              className="btn-glossy -mt-6 flex size-14 items-center justify-center rounded-full ring-1 ring-white/40 transition-transform active:scale-95"
            >
              <Plus className="size-6" aria-hidden="true" />
            </button>
          </div>
          <NavLink to="/transactions" className={tabClass}>
            <Receipt className="size-5" aria-hidden="true" /> Activity
          </NavLink>
          <button type="button" className={tabClass({ isActive: false })} onClick={() => setMoreOpen(true)}>
            <MenuIcon className="size-5" aria-hidden="true" /> More
          </button>
        </div>
      </nav>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <ul className="-mx-2 space-y-0.5">
          {MORE_ITEMS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className="flex h-12 items-center gap-3 rounded-xl px-2 text-sm font-medium text-ink hover:bg-surface-2"
              >
                <item.icon className="size-5 text-ink-2" aria-hidden="true" /> {item.label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => signOut()}
              className="flex h-12 w-full items-center gap-3 rounded-xl px-2 text-sm font-medium text-danger hover:bg-surface-2"
            >
              <LogOut className="size-5" aria-hidden="true" /> Sign out
            </button>
          </li>
        </ul>
      </Dialog>
    </>
  )
}
