import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/common/Button.jsx'
import { Banner } from '../../components/common/Card.jsx'
import { TextField } from '../../components/common/Field.jsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { signIn } from '../../services/authService.js'
import { friendlyError } from '../../utils/errors.js'
import { AuthLayout } from './AuthLayout.jsx'

const linkClass = 'font-medium text-link hover:underline'

export default function LoginPage() {
  useDocumentTitle('Sign in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn({ email, password })
      // The auth listener and route guard take it from here.
    } catch (err) {
      setError(friendlyError(err, "Couldn't sign in. Please try again."))
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your spaces."
      footer={<>New to SpendSpace? <Link to="/signup" className={linkClass}>Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <div role="alert"><Banner tone="danger">{error}</Banner></div>}
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <TextField label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="mt-2 text-right text-sm">
            <Link to="/forgot-password" className={linkClass}>Forgot password?</Link>
          </div>
        </div>
        <Button type="submit" variant="primary" className="w-full" loading={busy}>Sign in</Button>
      </form>
    </AuthLayout>
  )
}
