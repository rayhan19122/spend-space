import { useRef, useState } from 'react'
import { useProjects, useWrite } from '../../hooks/useData.js'
import { focusFirstError, useFieldSetter } from '../../hooks/useFieldSetter.js'
import { createRule, updateRule } from '../../services/recurringService.js'
import { currencySymbol, DEFAULT_CURRENCY } from '../../utils/currency.js'
import { todayISO } from '../../utils/dates.js'
import { minorToDecimalString, parseAmount } from '../../utils/money.js'
import { PAYMENT_METHODS, validateRecurringRule } from '../../utils/validation.js'
import { Button } from '../common/Button.jsx'
import { Segmented } from '../common/Controls.jsx'
import { Dialog } from '../common/Dialog.jsx'
import { SelectField, TextareaField, TextField } from '../common/Field.jsx'
import { ProjectCategoryFields } from '../transactions/ProjectCategoryFields.jsx'

const TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
]

export function RuleFormDialog({ rule, open, onClose }) {
  const { active, projects } = useProjects()
  const formRef = useRef(null)
  const [values, setValues] = useState(() =>
    rule
      ? {
          type: rule.type,
          amount: minorToDecimalString(rule.amount_minor, rule.currency),
          title: rule.title,
          projectId: rule.project_id,
          categoryId: rule.category_id,
          paymentMethod: rule.payment_method,
          notes: rule.notes ?? '',
          frequency: rule.frequency,
          startDate: rule.start_date,
          endDate: rule.end_date ?? '',
        }
      : {
          type: 'expense',
          amount: '',
          title: '',
          projectId: '',
          categoryId: '',
          paymentMethod: 'cash',
          notes: '',
          frequency: 'monthly',
          startDate: todayISO(),
          endDate: '',
        },
  )
  const [errors, setErrors] = useState({})
  const set = useFieldSetter(setValues, setErrors)

  const project = projects.find((p) => p.id === values.projectId)
  const currency = project?.currency ?? DEFAULT_CURRENCY
  // A rule's project and type are fixed once created; its recorded history depends on them.
  const selectable = rule ? projects.filter((p) => p.id === rule.project_id) : active

  const save = useWrite(
    (userId, payload) => (rule ? updateRule(userId, rule, payload) : createRule(userId, payload)),
    { success: rule ? 'Rule updated.' : 'Rule created. No transaction has been recorded yet.', onSuccess: onClose },
  )

  const submit = (event) => {
    event.preventDefault()
    const found = validateRecurringRule(values, currency)
    setErrors(found)
    if (Object.keys(found).length) {
      focusFirstError(formRef.current)
      return
    }
    save.mutate({ ...values, amountMinor: parseAmount(values.amount, currency).minor })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={rule ? 'Edit recurring rule' : 'New recurring rule'}
      description="A rule is a reminder. It only becomes a transaction when you record it."
      onSubmit={submit}
      footer={
        <>
          <Button onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" variant="primary" loading={save.isPending}>{rule ? 'Save changes' : 'Create rule'}</Button>
        </>
      }
    >
      <div ref={formRef} className="space-y-4">
        {!rule && (
          <Segmented
            label="Rule type"
            options={TYPES}
            value={values.type}
            onChange={(type) => setValues((current) => ({ ...current, type, categoryId: '' }))}
            className="w-full"
          />
        )}
        <TextField label="Amount" inputMode="decimal" autoComplete="off" prefix={currencySymbol(currency)} value={values.amount} onChange={set('amount')} error={errors.amount} />
        <TextField label="Description" placeholder="e.g. Room rent" value={values.title} onChange={set('title')} error={errors.title} maxLength={120} />
        <ProjectCategoryFields
          projects={selectable}
          projectId={values.projectId}
          categoryId={values.categoryId}
          type={values.type}
          keepCategoryId={rule?.category_id}
          errors={errors}
          onProject={(id) => {
            setValues((current) => ({ ...current, projectId: id, categoryId: '' }))
            setErrors((current) => ({ ...current, projectId: undefined, categoryId: undefined }))
          }}
          onCategory={set('categoryId')}
          onNavigate={onClose}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Repeats" value={values.frequency} onChange={set('frequency')}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </SelectField>
          <SelectField label="Payment method" value={values.paymentMethod} onChange={set('paymentMethod')}>
            {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
          </SelectField>
          <TextField label="Start date" type="date" value={values.startDate} onChange={set('startDate')} error={errors.startDate} />
          <TextField label="End date" type="date" optional value={values.endDate} onChange={set('endDate')} error={errors.endDate} />
        </div>
        <TextareaField label="Notes" optional rows={2} value={values.notes} onChange={set('notes')} maxLength={2000} />
      </div>
    </Dialog>
  )
}
