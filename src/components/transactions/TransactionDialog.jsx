import { FolderPlus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useProjects, useWrite } from '../../hooks/useData.js'
import { createTransaction, updateTransaction } from '../../services/transactionService.js'
import { currencySymbol, DEFAULT_CURRENCY } from '../../utils/currency.js'
import { todayISO } from '../../utils/dates.js'
import { minorToDecimalString, parseAmount } from '../../utils/money.js'
import { PAYMENT_METHODS, validateTransaction } from '../../utils/validation.js'
import { Button, ButtonLink } from '../common/Button.jsx'
import { EmptyState } from '../common/Card.jsx'
import { Segmented } from '../common/Controls.jsx'
import { Dialog } from '../common/Dialog.jsx'
import { focusFirstError } from '../../hooks/useFieldSetter.js'
import { SelectField, TextareaField, TextField } from '../common/Field.jsx'
import { ProjectCategoryFields } from './ProjectCategoryFields.jsx'

const LAST_PROJECT_KEY = 'spendspace-last-project'

function rememberedProject() {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY)
  } catch {
    return null
  }
}

function rememberProject(id) {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, id)
  } catch {
    // Only a convenience for the next quick add.
  }
}

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
]

function initialValues(options) {
  const { transaction, type = 'expense', projectId } = options
  if (transaction) {
    return {
      type: transaction.type,
      amount: minorToDecimalString(transaction.amount_minor, transaction.currency),
      title: transaction.title,
      projectId: transaction.project_id,
      categoryId: transaction.category_id,
      date: transaction.transaction_date,
      paymentMethod: transaction.payment_method,
      notes: transaction.notes ?? '',
    }
  }
  return {
    type,
    amount: '',
    title: '',
    projectId: projectId ?? rememberedProject() ?? '',
    categoryId: '',
    date: todayISO(),
    paymentMethod: 'cash',
    notes: '',
  }
}

export function TransactionDialog({ open, options, onClose }) {
  const { transaction } = options
  const isEdit = Boolean(transaction)
  const { active, projects, isPending: projectsPending } = useProjects()
  const formRef = useRef(null)
  const [values, setValues] = useState(() => initialValues(options))
  const [errors, setErrors] = useState({})

  // An edit may move a record, but only to a project with the same currency:
  // 50000 minor units in BDT would mean something else in JPY.
  const selectable = isEdit
    ? active.filter((project) => project.currency === transaction.currency)
    : active
  const project = projects.find((p) => p.id === values.projectId)
  const projectId = selectable.some((p) => p.id === values.projectId) ? values.projectId : ''
  const currency = project?.currency ?? transaction?.currency ?? DEFAULT_CURRENCY

  const set = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const changeType = (type) => setValues((current) => ({ ...current, type, categoryId: '' }))
  const changeProject = (id) => {
    setValues((current) => ({ ...current, projectId: id, categoryId: '' }))
    setErrors((current) => ({ ...current, projectId: undefined, categoryId: undefined }))
  }

  const save = useWrite(
    (userId, payload) =>
      isEdit
        ? updateTransaction(userId, transaction.id, payload, { movedProject: payload.projectId !== transaction.project_id })
        : createTransaction(userId, payload),
    {
      success: isEdit ? 'Transaction updated.' : `${values.type === 'income' ? 'Income' : 'Expense'} added to ${project?.name}.`,
      onSuccess: () => {
        if (!isEdit) rememberProject(projectId)
        onClose()
      },
    },
  )

  const submit = (event) => {
    event.preventDefault()
    const checked = { ...values, projectId }
    const found = validateTransaction(checked, currency)
    setErrors(found)
    if (Object.keys(found).length) {
      focusFirstError(formRef.current)
      return
    }
    save.mutate({ ...checked, amountMinor: parseAmount(values.amount, currency).minor })
  }

  const noProjects = !projectsPending && active.length === 0
  const title = isEdit ? 'Edit transaction' : `Add ${values.type}`

  if (noProjects) {
    return (
      <Dialog open={open} onClose={onClose} title={title}>
        <EmptyState
          compact
          icon={FolderPlus}
          title="Create a project first"
          description="Every transaction belongs to a project, such as Personal or University."
          action={<ButtonLink variant="primary" to="/projects?new=1" onClick={onClose}>Create a project</ButtonLink>}
        />
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      onSubmit={submit}
      footer={
        <>
          <Button onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" variant="primary" loading={save.isPending}>
            {isEdit ? 'Save changes' : `Add ${values.type}`}
          </Button>
        </>
      }
    >
      <div ref={formRef} className="space-y-4">
        <Segmented label="Transaction type" options={TYPE_OPTIONS} value={values.type} onChange={changeType} className="w-full" />

        <TextField
          label="Amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          prefix={currencySymbol(currency)}
          className="tabular text-lg font-semibold lg:text-lg"
          value={values.amount}
          onChange={set('amount')}
          error={errors.amount}
          hint={project ? undefined : 'Currency follows the project you choose.'}
        />

        <TextField
          label="Title"
          placeholder={values.type === 'income' ? 'e.g. Tutoring payment' : 'e.g. Lunch at campus'}
          value={values.title}
          onChange={set('title')}
          error={errors.title}
          maxLength={120}
        />

        <ProjectCategoryFields
          projects={selectable}
          projectId={projectId}
          categoryId={values.categoryId}
          type={values.type}
          keepCategoryId={transaction?.category_id}
          errors={errors}
          onProject={changeProject}
          onCategory={set('categoryId')}
          onNavigate={onClose}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Date" type="date" value={values.date} onChange={set('date')} error={errors.date} />
          <SelectField label="Payment method" value={values.paymentMethod} onChange={set('paymentMethod')}>
            {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
          </SelectField>
        </div>

        <TextareaField label="Notes" optional rows={2} value={values.notes} onChange={set('notes')} error={errors.notes} maxLength={2000} />
      </div>
    </Dialog>
  )
}
