import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/common/Button.jsx'
import { Banner, EmptyState } from '../../components/common/Card.jsx'
import { TextField } from '../../components/common/Field.jsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { requestPasswordReset } from '../../services/authService.js'
import { friendlyError } from '../../utils/errors.js'
import { validateEmail } from '../../utils/validation.js'
import { AuthLayout } from './AuthLayout.jsx'

export default function ForgotPasswordPage() {
  useDocumentTitle('Reset password')
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const problem = validateEmail(email)
    setFieldError(problem)
    if (problem) return
    setError(null)
    setBusy(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const back = <Link to="/login" className="font-medium text-link hover:underline">Back to sign in</Link>

  if (sent) {
    return (
      <AuthLayout title="Check your email" footer={back}>
        <EmptyState
          compact
          icon={MailCheck}
          title="Reset link requested"
          description={`If an account exists for ${email.trim()}, a reset link is on its way.`}
        />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to set a new one." footer={back}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <div role="alert"><Banner tone="danger">{error}</Banner></div>}
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError} />
        <Button type="submit" variant="primary" className="w-full" loading={busy}>Send reset link</Button>
      </form>
    </AuthLayout>
  )
}
