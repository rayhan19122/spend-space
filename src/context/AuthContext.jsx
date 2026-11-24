import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { getSession, onAuthChange } from '../services/authService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const currentUser = useRef(null)

  useEffect(() => {
    if (!supabase) return undefined

    const apply = (next) => {
      const nextUser = next?.user?.id ?? null
      // Cached finances must not survive a sign-out or a change of user on this browser.
      if (nextUser !== currentUser.current) queryClient.clear()
      currentUser.current = nextUser
      setSession(next)
      setLoading(false)
    }

    getSession()
      .then(apply)
      .catch(() => apply(null))
    return onAuthChange(apply)
  }, [queryClient])

  const value = useMemo(() => ({ session, user: session?.user ?? null, loading }), [session, loading])
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  return use(AuthContext)
}

// For hooks and pages inside a protected route, where a user is guaranteed.
export function useUserId() {
  return use(AuthContext).user?.id
}
