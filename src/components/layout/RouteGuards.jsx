import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { LogoMark } from './Logo.jsx'

export function FullPageLoader() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center bg-bg">
      <LogoMark className="size-10 animate-pulse motion-reduce:animate-none" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

// A user-experience guard: RLS is what actually protects the data.
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (user) return <Navigate to={location.state?.from ?? '/'} replace />
  return <Outlet />
}
