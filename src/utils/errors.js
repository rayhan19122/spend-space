// Turns any thrown error into text safe to show a user. Raw database messages can contain table
// and constraint names, so nothing is passed through unless it is on this list.
const TOKEN_MESSAGES = {
  project_archived: 'This project is archived. Restore it before making changes.',
  currency_locked: "This project already has records, so its currency can't be changed.",
  currency_mismatch: "This can't be moved to a project that uses a different currency.",
  budget_category_not_expense: 'Budgets can only track expense categories.',
  project_not_found: "That project couldn't be found.",
}

const CONSTRAINT_MESSAGES = [
  ['projects_user_name_key', 'You already have a project with this name.'],
  ['categories_project_type_name_key', 'This project already has a category with this name.'],
  ['budgets_one_active_per_scope_key', 'An active budget with this scope and period already exists. Edit or archive it first.'],
  ['transactions_recurring_rule_id_occurrence_date_key', 'This occurrence has already been recorded.'],
]

const AUTH_MESSAGES = {
  invalid_credentials: 'Incorrect email or password.',
  email_not_confirmed: 'Please confirm your email first. Check your inbox for the link.',
  user_already_exists: 'An account with this email already exists. Try signing in.',
  weak_password: 'Please choose a stronger password.',
  over_email_send_rate_limit: 'Too many emails sent. Please wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a few minutes and try again.',
  same_password: 'Your new password must be different from your current one.',
}

export const FALLBACK_MESSAGE = 'Something went wrong. Please try again.'
export const OFFLINE_MESSAGE = "Can't reach the server. Check your connection and try again."

export const isDuplicateError = (error) => error?.code === '23505'

export function isSessionError(error) {
  return ['PGRST301', 'PGRST302', 'PGRST303'].includes(error?.code) || error?.status === 401
}

export function friendlyError(error, fallback = FALLBACK_MESSAGE) {
  if (!error) return fallback
  const message = String(error.message ?? '')

  if (TOKEN_MESSAGES[message]) return TOKEN_MESSAGES[message]
  if (AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code]
  for (const [constraint, text] of CONSTRAINT_MESSAGES) {
    if (message.includes(constraint)) return text
  }
  if (isSessionError(error)) return 'Your session has expired. Please sign in again.'
  if (error.code === '23503') return 'This is still in use by other records, so it cannot be removed.'
  if (error.code === '23505') return 'That already exists.'
  if (error.code === '23514') return 'One of the values is not valid. Please check the form.'
  if (error.code === '42501') return "You don't have access to that."
  if (error.name === 'TypeError' || /failed to fetch|network/i.test(message)) return OFFLINE_MESSAGE
  return fallback
}
