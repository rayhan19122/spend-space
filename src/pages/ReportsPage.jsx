import { ReportView } from '../components/reports/ReportView.jsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'

export default function ReportsPage() {
  useDocumentTitle('Reports')
  return <ReportView />
}
