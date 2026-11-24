import { useOutletContext } from 'react-router-dom'

export const useProjectContext = () => useOutletContext().project
