import { useRef, useState } from 'react'
import { useCategories, useProjects, useWrite } from '../../hooks/useData.js'
import { focusFirstError, useFieldSetter } from '../../hooks/useFieldSetter.js'
import { createBudget, updateBudget } from '../../services/budgetService.js'
import { currencySymbol, DEFAULT_CURRENCY } from '../../utils/currency.js'
import { rangeForPreset, todayISO } from '../../utils/dates.js'
import { minorToDecimalString, parseAmount } from '../../utils/money.js'
import { validateBudget } from '../../utils/validation.js'
import { Button } from '../common/Button.jsx'
import { Dialog } from '../common/Dialog.jsx'
import { SelectField, TextField } from '../common/Field.jsx'

const defaultStart = (period) =>
  ({
    monthly: rangeForPreset('this-month').from,
    weekly: rangeForPreset('this-week').from,
    custom: todayISO(),
  })[period]

const PERIOD_HINTS = {
  monthly: 'Repeats each month from the start date. Only the current month counts.',
  weekly: 'Repeats every seven days from the start date. Only the current week counts.',
  custom: 'Counts expenses between the two dates.',
}

export function BudgetFormDialog({ budget, projectId, open, onClose }) {
  const { active, projects } = useProjects()
  const formRef = useRef(null)
  const [values, setValues] = useState(() =>
    budget
      ? {
          projectId: budget.project_id,
          categoryId: budget.category_id ?? '',
          name: budget.name,
          amount: minorToDecimalString(budget.amount_minor, budget.currency),
          period: budget.period,
          startDate: budget.start_date,
          endDate: budget.end_date ?? '',
        }
      : {
          projectId: projectId ?? '',
          categoryId: '',
          name: '',
          amount: '',
          period: 'monthly',
          startDate: defaultStart('monthly'),
          endDate: '',
        },
  )
  const [errors, setErrors] = useState({})
  const set = useFieldSetter(setValues, setErrors)

  const project = projects.find((p) => p.id === values.projectId)
  const currency = project?.currency ?? DEFAULT_CURRENCY
  const { data: categories } = useCategories(values.projectId || undefined)
  const expenseCategories = (categories ?? []).filter(
    (category) => category.type === 'expense' && (!category.is_archived || category.id === budget?.category_id),
  )

  const changePeriod = (event) => {
    const period = event.target.value
    setValues((current) => ({
      ...current,
      period,
      startDate: budget ? current.startDate : defaultStart(period),
      endDate: period === 'custom' ? current.endDate : '',
    }))
  }

  const save = useWrite(
    (userId, payload) => (budget ? updateBudget(userId, budget.id, payload) : createBudget(userId, payload)),
    { success: budget ? 'Budget updated.' : 'Budget created.', onSuccess: onClose },
  )

  const submit = (event) => {
    event.preventDefault()
    const found = validateBudget(values, currency)
    if (!values.projectId) found.projectId = 'Choose a project.'
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
      title={budget ? 'Edit budget' : 'New budget'}
      description="Budgets count expenses only."
      onSubmit={submit}
      footer={
        <>
          <Button onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" variant="primary" loading={save.isPending}>{budget ? 'Save changes' : 'Create budget'}</Button>
        </>
      }
    >
      <div ref={formRef} className="space-y-4">
        {!projectId && !budget && (
          <SelectField
            label="Project"
            value={values.projectId}
            onChange={(event) => setValues((current) => ({ ...current, projectId: event.target.value, categoryId: '' }))}
            error={errors.projectId}
          >
            <option value="">Choose a project</option>
            {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SelectField>
        )}

        <SelectField
          label="Applies to"
          value={values.categoryId}
          onChange={set('categoryId')}
          disabled={!values.projectId}
          hint="A whole-project budget counts every category."
        >
          <option value="">Whole project</option>
          {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </SelectField>

        <TextField label="Name" placeholder="e.g. Monthly budget" value={values.name} onChange={set('name')} error={errors.name} maxLength={80} />

        <TextField
          label="Amount"
          inputMode="decimal"
          autoComplete="off"
          prefix={currencySymbol(currency)}
          value={values.amount}
          onChange={set('amount')}
          error={errors.amount}
        />

        <SelectField label="Period" value={values.period} onChange={changePeriod} hint={PERIOD_HINTS[values.period]}>
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
          <option value="custom">Custom date range</option>
        </SelectField>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Start date" type="date" value={values.startDate} onChange={set('startDate')} error={errors.startDate} />
          <TextField
            label="End date"
            type="date"
            optional={values.period !== 'custom'}
            value={values.endDate}
            onChange={set('endDate')}
            error={errors.endDate}
          />
        </div>
      </div>
    </Dialog>
  )
}
