import { useMatch } from 'react-router-dom'

// The project being viewed, if any, so Quick Add can default to it.
export function useCurrentProjectId() {
  const match = useMatch('/projects/:projectId/*')
  return match?.params.projectId
}
