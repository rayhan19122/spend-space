import { useQuery } from '@tanstack/react-query'
import { useUserId } from '../context/AuthContext.jsx'
import { getProjectRecordCounts, updateProject } from '../services/projectService.js'
import { useWrite } from './useData.js'

export function useProjectRecordCounts(projectId, { enabled = true } = {}) {
  const userId = useUserId()
  return useQuery({
    queryKey: [userId, 'project', projectId, 'counts'],
    queryFn: () => getProjectRecordCounts(userId, projectId),
    enabled: Boolean(projectId) && enabled,
  })
}

// A project's currency locks once it has records, because stored amounts would change meaning.
export function useCurrencyLock(project) {
  const { data } = useProjectRecordCounts(project?.id)
  return Boolean(data && (data.transactions || data.budgets || data.rules))
}

export function useArchiveProject() {
  return useWrite(
    (userId, { project, isArchived }) => updateProject(userId, project.id, { is_archived: isArchived }),
    { success: (_data, { project, isArchived }) => `${project.name} ${isArchived ? 'archived' : 'restored'}.` },
  )
}
