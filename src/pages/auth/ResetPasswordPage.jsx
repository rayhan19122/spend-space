import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button.jsx'
import { Banner, EmptyState } from '../../components/common/Card.jsx'
import { TextField } from '../../components/common/Field.jsx'
import { FullPageLoader } from '../../components/layout/RouteGuards.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { updatePassword } from '../../services/authService.js'
import { friendlyError } from '../../utils/errors.js'
import { validatePassword } from '../../utils/validation.js'
import { AuthLayout } from './AuthLayout.jsx'

// The emailed link signs the user in with a recovery session, then lands here.
export default function ResetPasswordPage() {
  useDocumentTitle('Set new password')
  const { user, loading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (loading) return <FullPageLoader />

  if (!user) {
    return (
      <AuthLayout title="Link not valid">
        <EmptyState
          compact
          icon={AlertTriangle}
          title="This reset link has expired or was already used"
          action={<Link to="/forgot-password" className="font-medium text-link hover:underline">Request a new link</Link>}
        />
      </AuthLayout>
    )
  }

  const submit = async (event) => {
    event.preventDefault()
    const found = {}
    const problem = validatePassword(password)
    if (problem) found.password = problem
    if (password !== confirm) found.confirm = "Passwords don't match."
    setErrors(found)
    if (Object.keys(found).length) return

    setError(null)
    setBusy(true)
    try {
      await updatePassword(password)
      toast.success('Password updated.')
      navigate('/', { replace: true })
    } catch (err) {
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Set a new password" subtitle={`For ${user.email}`}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <div role="alert"><Banner tone="danger">{error}</Banner></div>}
        <TextField label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <TextField label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <Button type="submit" variant="primary" className="w-full" loading={busy}>Update password</Button>
      </form>
    </AuthLayout>
  )
}
