// True for keys that bypass Row Level Security and must never reach a browser.
export function isSecretKey(key) {
  if (!key) return false
  if (key.startsWith('sb_secret_')) return true
  const parts = key.split('.')
  if (parts.length !== 3) return false
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

export function configProblem(url, key) {
  if (!url || !key) return 'missing'
  if (isSecretKey(key)) return 'secret-key'
  return null
}
