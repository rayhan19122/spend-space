import { useQueryClient } from '@tanstack/react-query'
import { Database, KeyRound, LogOut, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/common/Button.jsx'
import { Card, ErrorState, LoadingBlock, SectionCard } from '../components/common/Card.jsx'
import { ConfirmDialog } from '../components/common/Dialog.jsx'
import { SelectField, TextField } from '../components/common/Field.jsx'
import { ExportPanel } from '../components/settings/ExportPanel.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useProfile, useProjects, useWrite } from '../hooks/useData.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { requestPasswordReset, signOut } from '../services/authService.js'
import { buildBackup } from '../services/exportService.js'
import { updateProfile } from '../services/profileService.js'
import { resetAllData } from '../services/projectService.js'
import { downloadFile } from '../utils/csv.js'
import { CURRENCIES } from '../utils/currency.js'
import { DATE_FORMATS, todayISO } from '../utils/dates.js'
import { friendlyError } from '../utils/errors.js'

const RESET_PHRASE = 'DELETE MY DATA'

function ProfileSection({ profile, email }) {
  const [name, setName] = useState(profile.display_name ?? '')
  const save = useWrite((userId, value) => updateProfile(userId, { display_name: value.trim() || null }), { success: 'Profile saved.' })
  const changed = name !== (profile.display_name ?? '')
  return (
    <SectionCard title="Profile">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate(name)
        }}
      >
        <TextField label="Display name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" />
        <TextField label="Email" value={email ?? ''} readOnly disabled hint="Your sign-in address." />
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={!changed} loading={save.isPending}>Save profile</Button>
        </div>
      </form>
    </SectionCard>
  )
}

// Each choice saves immediately, so there's no way to leave with unsaved changes.
function PreferencesSection({ profile }) {
  const { theme, setTheme } = useTheme()
  const save = useWrite((userId, changes) => updateProfile(userId, changes), { success: 'Preferences saved.' })
  const change = (column) => (event) => save.mutate({ [column]: event.target.value })

  return (
    <SectionCard title="Preferences">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Default currency"
          value={profile.default_currency}
          onChange={change('default_currency')}
          hint="Used for new projects. Existing projects keep their own."
        >
          {CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} — {currency.name}</option>)}
        </SelectField>
        <SelectField label="Date format" value={profile.date_format} onChange={change('date_format')}>
          {DATE_FORMATS.map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}
        </SelectField>
        <SelectField
          label="Theme"
          value={theme}
          onChange={(event) => {
            setTheme(event.target.value)
            save.mutate({ theme: event.target.value })
          }}
        >
          <option value="system">Match system</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </SelectField>
        <SelectField label="Default landing page" value={profile.landing_page} onChange={change('landing_page')} hint="Where SpendSpace opens.">
          <option value="/">Dashboard</option>
          <option value="/projects">Projects</option>
          <option value="/transactions">Transactions</option>
        </SelectField>
      </div>
    </SectionCard>
  )
}

function DataSection({ userId }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { projects } = useProjects()
  const [backingUp, setBackingUp] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [typed, setTyped] = useState('')

  const backup = async () => {
    setBackingUp(true)
    try {
      downloadFile(`spendspace-backup-${todayISO()}.json`, await buildBackup(userId), 'application/json')
      toast.success('Backup downloaded.')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setBackingUp(false)
    }
  }

  const reset = useWrite(() => resetAllData(), {
    success: 'All your financial data was deleted.',
    onSuccess: () => {
      setResetOpen(false)
      setTyped('')
      queryClient.removeQueries({ queryKey: [userId, 'project'] })
    },
  })

  return (
    <SectionCard title="Data">
      <div className="space-y-5">
        <div>
          <h3 className="mb-3 text-sm font-medium text-ink">Export to CSV</h3>
          <ExportPanel projects={projects} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="min-w-0 flex-1 sm:min-w-64">
            <h3 className="text-sm font-medium text-ink">Full backup</h3>
            <p className="text-sm text-ink-2">Everything in your account as one JSON file.</p>
          </div>
          <Button onClick={backup} loading={backingUp}>
            <Database className="size-4" aria-hidden="true" /> Download backup
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="min-w-0 flex-1 sm:min-w-64">
            <h3 className="text-sm font-medium text-ink">Delete all data</h3>
            <p className="text-sm text-ink-2">Removes every project and record. Your account and preferences stay.</p>
          </div>
          <Button variant="dangerOutline" onClick={() => setResetOpen(true)}>
            <Trash2 className="size-4" aria-hidden="true" /> Delete all data
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => reset.mutate()}
        loading={reset.isPending}
        title="Delete all your data?"
        confirmLabel="Delete everything"
        requireText={RESET_PHRASE}
        typedText={typed}
        onTypedChange={setTyped}
        description={`This permanently deletes ${projects.length} project${projects.length === 1 ? '' : 's'} and all their transactions, categories, budgets and rules. It can't be undone, so download a backup first.`}
      />
    </SectionCard>
  )
}

function SecuritySection({ email }) {
  const toast = useToast()
  const [sending, setSending] = useState(false)

  const sendReset = async () => {
    setSending(true)
    try {
      await requestPasswordReset(email)
      toast.success(`Password reset link sent to ${email}.`)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <SectionCard title="Security">
      <div className="flex flex-wrap gap-2">
        <Button onClick={sendReset} loading={sending}>
          <KeyRound className="size-4" aria-hidden="true" /> Email me a password reset link
        </Button>
        <Button onClick={() => signOut()}>
          <LogOut className="size-4" aria-hidden="true" /> Sign out
        </Button>
      </div>
    </SectionCard>
  )
}

export default function SettingsPage() {
  useDocumentTitle('Settings')
  const { user } = useAuth()
  const { data: profile, isPending, error, refetch } = useProfile()
  const { setTheme } = useTheme()

  // Keeps this device in step if the theme was changed on another one.
  useEffect(() => {
    if (profile?.theme) setTheme(profile.theme)
  }, [profile?.theme, setTheme])

  if (error) return <Card><ErrorState error={error} onRetry={refetch} /></Card>
  if (isPending) return <LoadingBlock label="Loading settings" rows={6} />

  return (
    <div className="grid max-w-3xl gap-4">
      <ProfileSection profile={profile} email={user.email} />
      <PreferencesSection profile={profile} />
      <DataSection userId={user.id} />
      <SecuritySection email={user.email} />
    </div>
  )
}
