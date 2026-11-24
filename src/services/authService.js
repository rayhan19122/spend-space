import { supabase } from '../lib/supabase.js'

const fail = (error) => {
  if (error) throw error
}

const redirectTo = (path) => `${window.location.origin}${path}`

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  fail(error)
  return data.session
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    // Deferred: calling Supabase inside this callback can deadlock its auth lock.
    setTimeout(() => callback(session), 0)
  })
  return () => data.subscription.unsubscribe()
}

export async function signIn({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  fail(error)
}

// Returns whether the user must confirm their email before they can sign in.
export async function signUp({ email, password, displayName }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: redirectTo('/'),
      data: { display_name: displayName.trim() },
    },
  })
  fail(error)
  return { needsConfirmation: !data.session }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  // If the server can't be reached or the session is already gone, still end it on this device.
  if (error) await supabase.auth.signOut({ scope: 'local' })
}

export const endLocalSession = () => supabase.auth.signOut({ scope: 'local' })

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectTo('/reset-password'),
  })
  fail(error)
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password })
  fail(error)
}
