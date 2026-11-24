import { LogOut, Monitor, Moon, Search, Settings, Sun } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useProfile, useWrite } from '../../hooks/useData.js'
import { signOut } from '../../services/authService.js'
import { updateProfile } from '../../services/profileService.js'
import { Button, IconButton } from '../common/Button.jsx'
import { Menu } from '../common/Controls.jsx'
import { LogoMark } from './Logo.jsx'
import { pageTitle } from './navigation.js'

const THEME_ORDER = ['light', 'dark', 'system']
const THEME_META = {
  light: { icon: Sun, label: 'Theme: light. Switch to dark' },
  dark: { icon: Moon, label: 'Theme: dark. Switch to system' },
  system: { icon: Monitor, label: 'Theme: system. Switch to light' },
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const save = useWrite((userId, value) => updateProfile(userId, { theme: value }))
  const { icon, label } = THEME_META[theme]
  return (
    <IconButton
      label={label}
      icon={icon}
      onClick={() => {
        const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length]
        setTheme(next)
        save.mutate(next)
      }}
    />
  )
}

function initials(name, email) {
  const source = name?.trim() || email || '?'
  const parts = source.split(/\s+/)
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2)).toUpperCase()
}

export function TopBar({ onSearch }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: profile } = useProfile()

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 lg:px-8">
        <LogoMark className="size-7 shrink-0 lg:hidden" />
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-ink lg:text-lg">
          {pageTitle(pathname)}
        </h1>

        <Button variant="secondary" aria-label="Search and quick actions" className="hidden w-60 justify-start font-normal text-ink-3 lg:flex" onClick={onSearch}>
          <Search className="size-4" aria-hidden="true" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border border-line px-1.5 font-sans text-[11px]">⌘K</kbd>
        </Button>
        <IconButton label="Search and quick actions" icon={Search} className="lg:hidden" onClick={onSearch} />

        <ThemeToggle />

        <Menu
          label="Account menu"
          trigger={(props) => (
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-full lg:size-9"
              {...props}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-ink">
                {initials(profile?.display_name, user?.email)}
              </span>
            </button>
          )}
          items={[
            { heading: user?.email },
            { label: 'Settings', icon: Settings, onSelect: () => navigate('/settings') },
            { label: 'Sign out', icon: LogOut, onSelect: () => signOut() },
          ]}
        />
      </div>
    </header>
  )
}
