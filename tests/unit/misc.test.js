import { describe, expect, it } from 'vitest'
import { escapeCell, toCsv } from '../../src/utils/csv.js'
import { currencySymbol, minorDigits } from '../../src/utils/currency.js'
import { friendlyError, isSessionError, OFFLINE_MESSAGE, FALLBACK_MESSAGE } from '../../src/utils/errors.js'
import { dueRules, isDue, nextOccurrenceAfter } from '../../src/utils/recurring.js'
import { ilikeTerm, transactionSearchFilter } from '../../src/utils/search.js'
import {
  validateBudget,
  validateEmail,
  validatePassword,
  validateProject,
  validateRecurringRule,
  validateTransaction,
} from '../../src/utils/validation.js'

describe('currency', () => {
  it('knows minor digits', () => {
    expect(minorDigits('BDT')).toBe(2)
    expect(minorDigits('JPY')).toBe(0)
    expect(minorDigits('KWD')).toBe(3)
  })

  it('finds symbols', () => {
    expect(currencySymbol('BDT')).toBe('৳')
    expect(currencySymbol('USD')).toBe('$')
  })
})

describe('recurring rules', () => {
  const rule = (overrides) => ({
    frequency: 'monthly',
    start_date: '2026-01-31',
    end_date: null,
    is_active: true,
    next_due_date: '2026-01-31',
    ...overrides,
  })

  it('monthly returns to the original day after a short month', () => {
    const r = rule()
    expect(nextOccurrenceAfter(r, '2026-01-31')).toBe('2026-02-28')
    expect(nextOccurrenceAfter(r, '2026-02-28')).toBe('2026-03-31')
  })

  it('weekly adds seven days', () => {
    expect(nextOccurrenceAfter(rule({ frequency: 'weekly', start_date: '2026-11-01' }), '2026-11-01')).toBe('2026-11-08')
  })

  it('yearly handles a leap day', () => {
    const r = rule({ frequency: 'yearly', start_date: '2028-02-29' })
    expect(nextOccurrenceAfter(r, '2028-02-29')).toBe('2029-02-28')
    expect(nextOccurrenceAfter(r, '2031-12-31')).toBe('2032-02-29')
  })

  it('stops at the end date', () => {
    const r = rule({ start_date: '2026-11-01', end_date: '2026-12-15' })
    expect(nextOccurrenceAfter(r, '2026-11-01')).toBe('2026-12-01')
    expect(nextOccurrenceAfter(r, '2026-12-01')).toBeNull()
  })

  it('returns the start date when asked from before it', () => {
    expect(nextOccurrenceAfter(rule({ start_date: '2026-11-01' }), '2026-01-01')).toBe('2026-11-01')
  })

  it('is due only when active and on or past the date', () => {
    expect(isDue(rule({ next_due_date: '2026-11-01' }), '2026-11-01')).toBe(true)
    expect(isDue(rule({ next_due_date: '2026-11-02' }), '2026-11-01')).toBe(false)
    expect(isDue(rule({ next_due_date: '2026-11-01', is_active: false }), '2026-11-01')).toBe(false)
    expect(isDue(rule({ next_due_date: null }), '2026-11-01')).toBe(false)
  })

  it('sorts due rules oldest first', () => {
    const rules = [rule({ next_due_date: '2026-10-05' }), rule({ next_due_date: '2026-09-01' }), rule({ next_due_date: '2027-01-01' })]
    expect(dueRules(rules, '2026-11-01').map((r) => r.next_due_date)).toEqual(['2026-09-01', '2026-10-05'])
  })
})

describe('CSV', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(escapeCell('a,b')).toBe('"a,b"')
    expect(escapeCell('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCell('a\nb')).toBe('"a\nb"')
  })

  it('neutralizes spreadsheet formulas in text', () => {
    expect(escapeCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`)
    expect(escapeCell('+1')).toBe("'+1")
    expect(escapeCell('-1')).toBe("'-1")
    expect(escapeCell('@cmd')).toBe("'@cmd")
  })

  it('leaves numeric columns untouched', () => {
    expect(escapeCell('-500.25', { raw: true })).toBe('-500.25')
  })

  it('handles empty values', () => {
    expect(escapeCell(null)).toBe('')
    expect(escapeCell(undefined)).toBe('')
    expect(escapeCell(0)).toBe('0')
  })

  it('writes a header and rows', () => {
    const csv = toCsv(
      [{ title: 'Tea, milk', amount: '50.00' }],
      [{ header: 'Title', value: (r) => r.title }, { header: 'Amount', value: (r) => r.amount, raw: true }],
    )
    expect(csv).toBe('Title,Amount\r\n"Tea, milk",50.00')
  })
})

describe('search filter', () => {
  it('wraps plain text', () => {
    expect(ilikeTerm('tea')).toBe('"%tea%"')
  })

  it('cannot break out of the filter with punctuation', () => {
    expect(ilikeTerm('a,user_id.eq.x)')).toBe('"%a,user\\\\_id.eq.x)%"')
    expect(ilikeTerm('say "hi"')).toBe('"%say \\"hi\\"%"')
  })

  it('treats wildcards as literal characters', () => {
    expect(ilikeTerm('100%')).toBe('"%100\\\\%%"')
    expect(ilikeTerm('a_b')).toBe('"%a\\\\_b%"')
  })

  it('searches title and notes, plus matched projects and categories', () => {
    expect(transactionSearchFilter('tea')).toBe('title.ilike."%tea%",notes.ilike."%tea%"')
    expect(transactionSearchFilter('tea', { projectIds: ['p1', 'p2'], categoryIds: ['c1'] })).toBe(
      'title.ilike."%tea%",notes.ilike."%tea%",project_id.in.(p1,p2),category_id.in.(c1)',
    )
  })
})

describe('friendlyError', () => {
  it('translates known tokens', () => {
    expect(friendlyError({ message: 'project_archived' })).toMatch(/archived/)
  })

  it('never reveals database wording', () => {
    const raw = {
      code: 'XX000',
      message: 'relation "public.transactions" violates something secret at line 42',
    }
    expect(friendlyError(raw)).toBe(FALLBACK_MESSAGE)
  })

  it('names the duplicate without exposing the constraint', () => {
    const text = friendlyError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "projects_user_name_key"',
    })
    expect(text).toBe('You already have a project with this name.')
    expect(text).not.toContain('projects_user_name_key')
  })

  it('recognizes offline and expired-session errors', () => {
    expect(friendlyError(new TypeError('Failed to fetch'))).toBe(OFFLINE_MESSAGE)
    expect(isSessionError({ code: 'PGRST303' })).toBe(true)
    expect(friendlyError({ code: 'PGRST303', message: 'JWT expired' })).toMatch(/session has expired/)
    expect(isSessionError({ code: '23505' })).toBe(false)
  })

  it('does not reveal whether an email exists on failed sign-in', () => {
    expect(friendlyError({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('Incorrect email or password.')
  })
})

describe('validation', () => {
  const tx = { projectId: 'p', categoryId: 'c', title: 'Tea', date: '2026-11-01', amount: '50', notes: '' }

  it('accepts a complete transaction', () => {
    expect(validateTransaction(tx, 'BDT')).toEqual({})
  })

  it('reports each missing field', () => {
    const errors = validateTransaction({ projectId: '', categoryId: '', title: '  ', date: '', amount: '', notes: '' }, 'BDT')
    expect(Object.keys(errors).sort()).toEqual(['amount', 'categoryId', 'date', 'projectId', 'title'])
  })

  it('rejects a non-positive amount', () => {
    expect(validateTransaction({ ...tx, amount: '-5' }, 'BDT').amount).toBeTruthy()
    expect(validateTransaction({ ...tx, amount: '0' }, 'BDT').amount).toBeTruthy()
  })

  it('validates decimals against the project currency', () => {
    expect(validateTransaction({ ...tx, amount: '1.5' }, 'BDT').amount).toBeUndefined()
    expect(validateTransaction({ ...tx, amount: '1.5' }, 'JPY').amount).toBeTruthy()
  })

  it('checks a project name and optional budget', () => {
    expect(validateProject({ name: '', currency: 'BDT' }).name).toBeTruthy()
    expect(validateProject({ name: 'Uni', currency: 'BDT', budget: '' })).toEqual({})
    expect(validateProject({ name: 'Uni', currency: 'BDT', budget: 'x' }).budget).toBeTruthy()
  })

  it('requires an end date only for custom budgets', () => {
    const b = { name: 'B', amount: '100', startDate: '2026-11-01', endDate: '', period: 'monthly' }
    expect(validateBudget(b, 'BDT')).toEqual({})
    expect(validateBudget({ ...b, period: 'custom' }, 'BDT').endDate).toBeTruthy()
    expect(validateBudget({ ...b, period: 'custom', endDate: '2026-10-01' }, 'BDT').endDate).toBeTruthy()
  })

  it('validates recurring rules using their start date', () => {
    const r = { ...tx, startDate: '2026-11-01', endDate: '' }
    expect(validateRecurringRule(r, 'BDT')).toEqual({})
    expect(validateRecurringRule({ ...r, startDate: 'nope' }, 'BDT').startDate).toBeTruthy()
    expect(validateRecurringRule({ ...r, endDate: '2026-10-01' }, 'BDT').endDate).toBeTruthy()
  })

  it('checks email and password', () => {
    expect(validateEmail('a@b.co')).toBeNull()
    expect(validateEmail('nope')).toBeTruthy()
    expect(validatePassword('12345678')).toBeNull()
    expect(validatePassword('short')).toBeTruthy()
  })
})
