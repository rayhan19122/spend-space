import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button.jsx'
import { SectionCard } from '../../components/common/Card.jsx'
import { ProjectFields } from '../../components/projects/ProjectFormDialog.jsx'
import { DeleteProjectDialog } from '../../components/projects/ProjectLifecycle.jsx'
import { ExportPanel } from '../../components/settings/ExportPanel.jsx'
import { useWrite } from '../../hooks/useData.js'
import { focusFirstError, useFieldSetter } from '../../hooks/useFieldSetter.js'
import { useArchiveProject, useCurrencyLock } from '../../hooks/useProjectActions.js'
import { updateProject } from '../../services/projectService.js'
import { validateProject } from '../../utils/validation.js'
import { useProjectContext } from './useProjectContext.js'

export default function ProjectSettingsPage() {
  const project = useProjectContext()
  const navigate = useNavigate()
  const formRef = useRef(null)
  const [values, setValues] = useState({
    name: project.name,
    description: project.description ?? '',
    icon: project.icon,
    color: project.color,
    currency: project.currency,
  })
  const [errors, setErrors] = useState({})
  const [deleting, setDeleting] = useState(false)
  const set = useFieldSetter(setValues, setErrors)
  const locked = useCurrencyLock(project)
  const archive = useArchiveProject()
  const save = useWrite((userId, changes) => updateProject(userId, project.id, changes), { success: 'Project updated.' })

  const submit = (event) => {
    event.preventDefault()
    const found = validateProject(values)
    setErrors(found)
    if (Object.keys(found).length) {
      focusFirstError(formRef.current)
      return
    }
    save.mutate({ ...values, name: values.name.trim(), description: values.description.trim() || null })
  }

  return (
    <div className="grid max-w-3xl gap-4">
      <SectionCard title="Project details">
        <form ref={formRef} onSubmit={submit} noValidate className="space-y-4">
          <ProjectFields values={values} set={set} errors={errors} currencyLocked={locked} />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={save.isPending}>Save changes</Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Export" subtitle={`Only ${project.name}'s records are included.`}>
        <ExportPanel project={project} />
      </SectionCard>

      <SectionCard title="Archive or delete">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-sm text-ink-2 sm:min-w-64">
              {project.is_archived
                ? 'Restoring returns this project to your active list and allows changes again.'
                : 'Archiving hides this project from active lists and combined totals, and makes it read-only. Nothing is deleted.'}
            </p>
            <Button loading={archive.isPending} onClick={() => archive.mutate({ project, isArchived: !project.is_archived })}>
              {project.is_archived ? <ArchiveRestore className="size-4" aria-hidden="true" /> : <Archive className="size-4" aria-hidden="true" />}
              {project.is_archived ? 'Restore project' : 'Archive project'}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="min-w-0 flex-1 text-sm text-ink-2 sm:min-w-64">
              Deleting permanently removes this project and all of its transactions, categories, budgets and rules.
            </p>
            <Button variant="dangerOutline" onClick={() => setDeleting(true)}>
              <Trash2 className="size-4" aria-hidden="true" /> Delete project
            </Button>
          </div>
        </div>
      </SectionCard>

      {deleting && (
        <DeleteProjectDialog
          project={project}
          open
          onClose={() => setDeleting(false)}
          onDeleted={() => navigate('/projects', { replace: true })}
        />
      )}
    </div>
  )
}
