import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile, useWrite } from '../../hooks/useData.js'
import { focusFirstError, useFieldSetter } from '../../hooks/useFieldSetter.js'
import { useCurrencyLock } from '../../hooks/useProjectActions.js'
import { createProject, updateProject } from '../../services/projectService.js'
import { CURRENCIES, currencySymbol, DEFAULT_CURRENCY } from '../../utils/currency.js'
import { rangeForPreset } from '../../utils/dates.js'
import { parseAmount } from '../../utils/money.js'
import { validateProject } from '../../utils/validation.js'
import { Button } from '../common/Button.jsx'
import { Dialog } from '../common/Dialog.jsx'
import { CheckboxField, SelectField, TextareaField, TextField } from '../common/Field.jsx'
import { ColorPicker, IconPicker } from '../common/Identity.jsx'
import { COLORS } from '../common/icons.js'

function CurrencySelect({ value, onChange, locked }) {
  return (
    <SelectField
      label="Currency"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={locked}
      hint={locked ? "Locked because this project has records. Stored amounts would change meaning." : undefined}
    >
      {CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} — {currency.name}</option>)}
    </SelectField>
  )
}

export function ProjectFields({ values, set, errors, currencyLocked }) {
  return (
    <div className="space-y-4">
      <TextField label="Name" placeholder="e.g. University" value={values.name} onChange={set('name')} error={errors.name} maxLength={80} />
      <TextareaField label="Description" optional rows={2} placeholder="e.g. Semester expenses" value={values.description} onChange={set('description')} error={errors.description} maxLength={280} />
      <IconPicker value={values.icon} color={values.color} onChange={set('icon')} />
      <ColorPicker value={values.color} onChange={set('color')} />
      <CurrencySelect value={values.currency} onChange={set('currency')} locked={currencyLocked} />
    </div>
  )
}

export function NewProjectDialog({ open, onClose }) {
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const formRef = useRef(null)
  const [values, setValues] = useState({
    name: '',
    description: '',
    icon: 'folder',
    color: COLORS[0],
    currency: null,
    budget: '',
    seedCategories: true,
  })
  const [errors, setErrors] = useState({})
  const set = useFieldSetter(setValues, setErrors)
  const currency = values.currency ?? profile?.default_currency ?? DEFAULT_CURRENCY

  const create = useWrite((userId, payload) => createProject(payload), {
    success: (project) => `${project.name} created.`,
    onSuccess: (project) => {
      onClose()
      navigate(`/projects/${project.id}`)
    },
  })

  const submit = (event) => {
    event.preventDefault()
    const found = validateProject({ ...values, currency })
    setErrors(found)
    if (Object.keys(found).length) {
      focusFirstError(formRef.current)
      return
    }
    create.mutate({
      ...values,
      currency,
      budgetMinor: values.budget.trim() ? parseAmount(values.budget, currency).minor : null,
      budgetStart: rangeForPreset('this-month').from,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New project"
      description="A separate space with its own transactions, categories, budgets and reports."
      onSubmit={submit}
      footer={
        <>
          <Button onClick={onClose} disabled={create.isPending}>Cancel</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>Create project</Button>
        </>
      }
    >
      <div ref={formRef} className="space-y-4">
        <ProjectFields values={{ ...values, currency }} set={set} errors={errors} />
        <TextField
          label="Starting monthly budget"
          optional
          inputMode="decimal"
          autoComplete="off"
          prefix={currencySymbol(currency)}
          value={values.budget}
          onChange={set('budget')}
          error={errors.budget}
        />
        <CheckboxField
          label="Add suggested categories"
          hint="Food, Transport, Salary and others. You can edit them later."
          checked={values.seedCategories}
          onChange={(event) => set('seedCategories')(event.target.checked)}
        />
      </div>
    </Dialog>
  )
}

export function EditProjectDialog({ project, open, onClose }) {
  const formRef = useRef(null)
  const [values, setValues] = useState({
    name: project.name,
    description: project.description ?? '',
    icon: project.icon,
    color: project.color,
    currency: project.currency,
  })
  const [errors, setErrors] = useState({})
  const set = useFieldSetter(setValues, setErrors)
  const locked = useCurrencyLock(project)

  const save = useWrite(
    (userId, changes) => updateProject(userId, project.id, changes),
    { success: 'Project updated.', onSuccess: onClose },
  )

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
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit project"
      onSubmit={submit}
      footer={
        <>
          <Button onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" variant="primary" loading={save.isPending}>Save changes</Button>
        </>
      }
    >
      <div ref={formRef}>
        <ProjectFields values={values} set={set} errors={errors} currencyLocked={locked} />
      </div>
    </Dialog>
  )
}
