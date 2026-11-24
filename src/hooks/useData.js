// React Query hooks. Every key starts with the user ID and includes the project ID where relevant,
// so one user's or one project's cache can never answer for another. Previous data is deliberately
// not kept across key changes: switching projects shows a skeleton, never the last project's numbers.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useUserId } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { listBudgets } from '../services/budgetService.js'
import { listAllCategories, listCategories } from '../services/categoryService.js'
import { getProfile } from '../services/profileService.js'
import { getProject, listProjects } from '../services/projectService.js'
import { listRules } from '../services/recurringService.js'
import { fetchAnalyticsRows, listTransactions, recentTransactions } from '../services/transactionService.js'
import { windowSpan } from '../utils/budgets.js'
import { friendlyError } from '../utils/errors.js'
import { DEFAULT_DATE_FORMAT, formatDate } from '../utils/dates.js'

export function useProfile() {
  const userId = useUserId()
  return useQuery({ queryKey: [userId, 'profile'], queryFn: () => getProfile(userId), enabled: Boolean(userId) })
}

export function useDatePattern() {
  const { data: profile } = useProfile()
  return profile?.date_format ?? DEFAULT_DATE_FORMAT
}

export function useDateFormatter() {
  const pattern = useDatePattern()
  return useMemo(() => (iso) => formatDate(iso, pattern), [pattern])
}

export function useProjects() {
  const userId = useUserId()
  const query = useQuery({ queryKey: [userId, 'projects'], queryFn: () => listProjects(userId) })
  const all = query.data
  const split = useMemo(
    () => ({
      projects: all ?? [],
      active: (all ?? []).filter((project) => !project.is_archived),
      archived: (all ?? []).filter((project) => project.is_archived),
    }),
    [all],
  )
  return { ...query, ...split }
}

export function useProject(projectId) {
  const userId = useUserId()
  return useQuery({
    queryKey: [userId, 'project', projectId],
    queryFn: () => getProject(userId, projectId),
    retry: false,
  })
}

export function useCategories(projectId) {
  const userId = useUserId()
  return useQuery({
    queryKey: [userId, 'project', projectId, 'categories'],
    queryFn: () => listCategories(userId, projectId),
    enabled: Boolean(projectId),
  })
}

export function useAllCategories() {
  const userId = useUserId()
  return useQuery({ queryKey: [userId, 'categories'], queryFn: () => listAllCategories(userId) })
}

export function useCategoryLookup() {
  const { data } = useAllCategories()
  return useMemo(() => new Map((data ?? []).map((category) => [category.id, category])), [data])
}

export function useTransactionPage(params) {
  const userId = useUserId()
  return useQuery({
    queryKey: [userId, 'transactions', 'page', params],
    queryFn: () => listTransactions(userId, params),
  })
}

export function useRecentTransactions(filters, limit = 6) {
  const userId = useUserId()
  return useQuery({
    queryKey: [userId, 'transactions', 'recent', filters, limit],
    queryFn: () => recentTransactions(userId, filters, limit),
  })
}

export function useAnalyticsRows(filters = {}, { enabled = true } = {}) {
  const userId = useUserId()
  return useQuery({
    queryKey: [userId, 'transactions', 'analytics', filters],
    queryFn: () => fetchAnalyticsRows(userId, filters),
    enabled,
  })
}

export function useBudgets(projectId) {
  const userId = useUserId()
  return useQuery({
    queryKey: projectId ? [userId, 'project', projectId, 'budgets'] : [userId, 'budgets'],
    queryFn: () => listBudgets(userId, projectId),
  })
}

// The expenses needed to calculate these budgets' current windows, and nothing older.
export function useBudgetExpenses(budgets, projectId) {
  const span = useMemo(() => windowSpan(budgets ?? []), [budgets])
  return useAnalyticsRows(
    { projectId, type: 'expense', from: span.from, to: span.to },
    { enabled: Boolean(budgets?.length) },
  )
}

export function useRecurringRules() {
  const userId = useUserId()
  return useQuery({ queryKey: [userId, 'recurring'], queryFn: () => listRules(userId) })
}

// All writes go through here. Anything can affect totals, so the user's whole cache is refreshed.
export function useWrite(mutationFn, { success, onSuccess } = {}) {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (variables) => mutationFn(userId, variables),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: [userId] })
      const message = typeof success === 'function' ? success(data, variables) : success
      if (message) toast.success(message)
      onSuccess?.(data, variables)
    },
    onError: (error) => toast.error(friendlyError(error)),
  })
}
