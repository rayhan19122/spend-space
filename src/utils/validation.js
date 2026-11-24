// Form validation returns { field: message } and is pure, so it can be tested. It is here for
// fast feedback only: the database enforces the same rules independently.
import { isValidISO } from './dates.js'
import { parseAmount } from './money.js'

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'mobile_banking', label: 'Mobile banking' },
  { value: 'other', label: 'Other' },
]

export const paymentMethodLabel = (value) =>
  PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value

const hasText = (value) => Boolean(value && value.trim())

export function validateTransaction(values, currency) {
  const errors = {}
  if (!values.projectId) errors.projectId = 'Choose a project.'
  if (!values.categoryId) errors.categoryId = 'Choose a category.'
  if (!hasText(values.title)) errors.title = 'Enter a title.'
  else if (values.title.trim().length > 120) errors.title = 'Keep the title under 120 characters.'
  if (!isValidISO(values.date)) errors.date = 'Enter a valid date.'
  if (values.notes && values.notes.length > 2000) errors.notes = 'Keep notes under 2,000 characters.'
  const amount = parseAmount(values.amount, currency)
  if (!amount.ok) errors.amount = amount.error
  return errors
}

export function validateProject(values) {
  const errors = {}
  if (!hasText(values.name)) errors.name = 'Enter a project name.'
  else if (values.name.trim().length > 80) errors.name = 'Keep the name under 80 characters.'
  if (values.description && values.description.length > 280) {
    errors.description = 'Keep the description under 280 characters.'
  }
  if (hasText(values.budget)) {
    const amount = parseAmount(values.budget, values.currency)
    if (!amount.ok) errors.budget = amount.error
  }
  return errors
}

export function validateCategory(values) {
  const errors = {}
  if (!hasText(values.name)) errors.name = 'Enter a category name.'
  else if (values.name.trim().length > 60) errors.name = 'Keep the name under 60 characters.'
  return errors
}

export function validateBudget(values, currency) {
  const errors = {}
  if (!hasText(values.name)) errors.name = 'Enter a budget name.'
  const amount = parseAmount(values.amount, currency)
  if (!amount.ok) errors.amount = amount.error
  if (!isValidISO(values.startDate)) errors.startDate = 'Enter a valid start date.'
  if (values.period === 'custom' && !isValidISO(values.endDate)) errors.endDate = 'Enter an end date.'
  if (values.endDate && isValidISO(values.startDate) && values.endDate < values.startDate) {
    errors.endDate = 'The end date must be after the start date.'
  }
  return errors
}

export function validateRecurringRule(values, currency) {
  const errors = validateTransaction({ ...values, date: values.startDate }, currency)
  if (errors.date) {
    errors.startDate = errors.date
    delete errors.date
  }
  if (values.endDate && values.endDate < values.startDate) {
    errors.endDate = 'The end date must be after the start date.'
  }
  return errors
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? null : 'Enter a valid email address.'
}

export function validatePassword(password) {
  return password.length >= 8 ? null : 'Use at least 8 characters.'
}
