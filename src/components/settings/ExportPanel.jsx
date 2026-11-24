import { Download } from 'lucide-react'
import { useState } from 'react'
import { useUserId } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { projectSummaryCsv, transactionsCsv } from '../../services/exportService.js'
import { downloadFile } from '../../utils/csv.js'
import { DATE_PRESETS, rangeForPreset, todayISO } from '../../utils/dates.js'
import { friendlyError } from '../../utils/errors.js'
import { Button } from '../common/Button.jsx'
import { SelectField, TextField } from '../common/Field.jsx'

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// CSV exports for a chosen project and date range. With `project` set, it's locked to that project.
export function ExportPanel({ project, projects = [] }) {
  const userId = useUserId()
  const toast = useToast()
  const [projectId, setProjectId] = useState('')
  const [preset, setPreset] = useState('all')
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [busy, setBusy] = useState(null)

  const chosen = project ?? projects.find((p) => p.id === projectId)
  const range = preset === 'custom' ? { from: custom.from || null, to: custom.to || null } : rangeForPreset(preset)
  const filters = { projectId: chosen?.id, ...range }
  const scopeName = chosen ? slug(chosen.name) : 'all-projects'
  const inverted = Boolean(range.from && range.to && range.from > range.to)

  const run = async (name, work) => {
    setBusy(name)
    try {
      const { csv, count } = await work()
      if (!count) {
        toast.error('Nothing to export for this selection.')
        return
      }
      downloadFile(`spendspace-${name}-${scopeName}-${todayISO()}.csv`, csv, 'text/csv;charset=utf-8')
      toast.success('Export ready.')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {!project && (
          <SelectField label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_archived ? ' (archived)' : ''}</option>)}
          </SelectField>
        )}
        <SelectField label="Date range" value={preset} onChange={(event) => setPreset(event.target.value)}>
          {DATE_PRESETS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectField>
        {preset === 'custom' && (
          <>
            <TextField label="From" type="date" value={custom.from} onChange={(event) => setCustom((c) => ({ ...c, from: event.target.value }))} error={inverted ? 'Must be before the end date.' : undefined} />
            <TextField label="To" type="date" value={custom.to} onChange={(event) => setCustom((c) => ({ ...c, to: event.target.value }))} />
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={inverted} loading={busy === 'transactions'} onClick={() => run('transactions', () => transactionsCsv(userId, filters))}>
          <Download className="size-4" aria-hidden="true" /> Transactions CSV
        </Button>
        <Button disabled={inverted} loading={busy === 'summary'} onClick={() => run('summary', () => projectSummaryCsv(userId, projects.length ? projects : [project], filters))}>
          <Download className="size-4" aria-hidden="true" /> Project summary CSV
        </Button>
      </div>
    </div>
  )
}
