import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext.jsx'
import { QuickAddProvider } from '../../context/QuickAddContext.jsx'
import { useProfile } from '../../hooks/useData.js'
import { LoadingBlock } from '../common/Card.jsx'
import { BottomNav } from './BottomNav.jsx'
import { Sidebar } from './Sidebar.jsx'
import { TopBar } from './TopBar.jsx'

const CommandPalette = lazy(() => import('../search/CommandPalette.jsx'))

// Applies saved settings once per app load: the theme from the profile (so it follows the user
// across devices), and the chosen landing page on a fresh visit to the root URL.
function useProfilePreferences() {
  const { data: profile } = useProfile()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const startedAtRoot = useRef(pathname === '/')
  const applied = useRef(false)

  useEffect(() => {
    if (!profile || applied.current) return
    applied.current = true
    if (profile.theme !== theme) setTheme(profile.theme)
    if (startedAtRoot.current && profile.landing_page !== '/') {
      navigate(profile.landing_page, { replace: true })
    }
  }, [navigate, profile, setTheme, theme])
}

export function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false)
  useProfilePreferences()

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <QuickAddProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-ink"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="lg:pl-60">
        <TopBar onSearch={() => setSearchOpen(true)} />
        <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none lg:px-8 lg:pt-6 lg:pb-10">
          <Suspense fallback={<LoadingBlock rows={5} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
      {searchOpen && (
        <Suspense fallback={null}>
          <CommandPalette onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
    </QuickAddProvider>
  )
}
