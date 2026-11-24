import { Compass } from 'lucide-react'
import { ButtonLink } from '../components/common/Button.jsx'
import { EmptyState } from '../components/common/Card.jsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'

export default function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="That page doesn't exist or has moved."
      action={<ButtonLink variant="primary" to="/">Go to dashboard</ButtonLink>}
    />
  )
}
