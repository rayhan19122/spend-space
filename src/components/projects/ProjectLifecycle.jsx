import { useState } from 'react'
import { useWrite } from '../../hooks/useData.js'
import { useProjectRecordCounts } from '../../hooks/useProjectActions.js'
import { deleteProject } from '../../services/projectService.js'
import { ConfirmDialog } from '../common/Dialog.jsx'
import { LoadingBlock } from '../common/Card.jsx'

const plural = (count, singular, pluralForm = `${singular}s`) =>
  `${count.toLocaleString('en')} ${count === 1 ? singular : pluralForm}`

export function DeleteProjectDialog({ project, open, onClose, onDeleted }) {
  const [typed, setTyped] = useState('')
  const { data: counts } = useProjectRecordCounts(project.id, { enabled: open })

  const remove = useWrite((uid) => deleteProject(uid, project.id), {
    success: `${project.name} and its records were deleted.`,
    onSuccess: () => {
      onClose()
      onDeleted?.()
    },
  })

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => remove.mutate()}
      loading={remove.isPending}
      title={`Delete ${project.name}?`}
      confirmLabel="Delete permanently"
      requireText={project.name}
      typedText={typed}
      onTypedChange={setTyped}
    >
      {counts ? (
        <>
          <p>This permanently removes the project and everything inside it:</p>
          <ul className="list-disc pl-5">
            <li>{plural(counts.transactions, 'transaction')}</li>
            <li>{plural(counts.budgets, 'budget')}</li>
            <li>{plural(counts.categories, 'category', 'categories')}</li>
            <li>{plural(counts.rules, 'recurring rule')}</li>
          </ul>
          <p>This can't be undone. To keep the history, archive the project instead.</p>
        </>
      ) : (
        <LoadingBlock label="Counting records" rows={2} />
      )}
    </ConfirmDialog>
  )
}
