import { MailCheck } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/common/Button.jsx'
import { Banner, EmptyState } from '../../components/common/Card.jsx'
import { TextField } from '../../components/common/Field.jsx'
import { focusFirstError } from '../../hooks/useFieldSetter.js'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { signUp } from '../../services/authService.js'
import { friendlyError } from '../../utils/errors.js'
import { validateEmail, validatePassword } from '../../utils/validation.js'
import { AuthLayout } from './AuthLayout.jsx'

export default function SignupPage() {
  useDocumentTitle('Create account')
  const formRef = useRef(null)
  const [values, setValues] = useState({ displayName: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState(null)

  const set = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    const found = {}
    const emailError = validateEmail(values.email)
    const passwordError = validatePassword(values.password)
    if (emailError) found.email = emailError
    if (passwordError) found.password = passwordError
    if (values.password !== values.confirm) found.confirm = "Passwords don't match."
    setErrors(found)
    if (Object.keys(found).length) {
      focusFirstError(formRef.current)
      return
    }

    setError(null)
    setBusy(true)
    try {
      const { needsConfirmation } = await signUp(values)
      if (needsConfirmation) setSentTo(values.email.trim())
      // Otherwise a session now exists and the route guard moves on to the dashboard.
    } catch (err) {
      setError(friendlyError(err, "Couldn't create your account. Please try again."))
    } finally {
      setBusy(false)
    }
  }

  const signInLink = <Link to="/login" className="font-medium text-link hover:underline">Sign in</Link>

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" footer={<>Already confirmed? {signInLink}</>}>
        <EmptyState
          compact
          icon={MailCheck}
          title="Confirm your address"
          description={`If this address can be used, a confirmation link has been sent to ${sentTo}. Open it to finish signing up.`}
        />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Separate spaces for every part of your money."
      footer={<>Already have an account? {signInLink}</>}
    >
      <form ref={formRef} onSubmit={submit} noValidate className="space-y-4">
        {error && <div role="alert"><Banner tone="danger">{error}</Banner></div>}
        <TextField label="Name" optional autoComplete="name" value={values.displayName} onChange={set('displayName')} maxLength={80} />
        <TextField label="Email" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
        <TextField label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." value={values.password} onChange={set('password')} error={errors.password} />
        <TextField label="Confirm password" type="password" autoComplete="new-password" value={values.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" variant="primary" className="w-full" loading={busy}>Create account</Button>
      </form>
    </AuthLayout>
  )
}
