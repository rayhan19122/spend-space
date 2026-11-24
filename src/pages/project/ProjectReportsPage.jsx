import { ReportView } from '../../components/reports/ReportView.jsx'
import { useProjectContext } from './useProjectContext.js'

export default function ProjectReportsPage() {
  return <ReportView project={useProjectContext()} />
}
