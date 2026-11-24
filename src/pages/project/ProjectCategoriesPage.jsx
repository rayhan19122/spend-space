import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Button } from '../../components/common/Button.jsx'
import { Badge, Card, EmptyState, ErrorState, LoadingBlock } from '../../components/common/Card.jsx'
import { Menu, Segmented } from '../../components/common/Controls.jsx'
import { ConfirmDialog, Dialog } from '../../components/common/Dialog.jsx'
import { TextField } from '../../components/common/Field.jsx'
import { COLORS } from '../../components/common/icons.js'
import { ColorIcon, ColorPicker, IconPicker } from '../../components/common/Identity.jsx'
import { useAnalyticsRows, useCategories, useWrite } from '../../hooks/useData.js'
import { focusFirstError, useFieldSetter } from '../../hooks/useFieldSetter.js'
import { useParamState } from '../../hooks/useParamState.js'
import { createCategory, deleteCategory, updateCategory } from '../../services/categoryService.js'
import { validateCategory } from '../../utils/validation.js'
import { useProjectContext } from './useProjectContext.js'

const TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
]

function CategoryDialog({ project, category, type, onClose }) {
  const formRef = useRef(null)
  const [values, setValues] = useState({
    name: category?.name ?? '',
    icon: category?.icon ?? 'tag',
    color: category?.color ?? COLORS[0],
  })
  const [errors, setErrors] = useState({})
  const set = useFieldSetter(setValues, setErrors)

  const save = useWrite(
    (userId, payload) =>
      category
        ? updateCategory(userId, category.id, { ...payload, name: payload.name.trim() })
        : createCategory(userId, { ...payload, projectId: project.id, type }),
    { success: category ? 'Category updated.' : 'Category added.', onSuccess: onClose },
  )

  const submit = (event) => {
    event.preventDefault()
    const found = validateCategory(values)
    setErrors(found)
    if (Object.keys(found).length) {
      focusFirstError(formRef.current)
      return
    }
    save.mutate(values)
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={category ? 'Edit category' : `New ${type} category`}
      description={`Only available in ${project.name}.`}
      onSubmit={submit}
      footer={
        <>
          <Button onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" variant="primary" loading={save.isPending}>{category ? 'Save changes' : 'Add category'}</Button>
        </>
      }
    >
      <div ref={formRef} className="space-y-4">
        <TextField label="Name" value={values.name} onChange={set('name')} error={errors.name} maxLength={60} />
        <IconPicker value={values.icon} color={values.color} onChange={set('icon')} />
        <ColorPicker value={values.color} onChange={set('color')} />
      </div>
    </Dialog>
  )
}

export default function ProjectCategoriesPage() {
  const project = useProjectContext()
  const [type, setType] = useParamState('type', 'expense')
  const { data, isPending, error, refetch } = useCategories(project.id)
  const { data: rows } = useAnalyticsRows({ projectId: project.id })
  const [dialog, setDialog] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const usage = useMemo(() => {
    const counts = new Map()
    for (const row of rows ?? []) counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1)
    return counts
  }, [rows])

  const archive = useWrite(
    (userId, { category, isArchived }) => updateCategory(userId, category.id, { is_archived: isArchived }),
    { success: (_data, { category, isArchived }) => `${category.name} ${isArchived ? 'archived' : 'restored'}.` },
  )
  const remove = useWrite((userId, id) => deleteCategory(userId, id), {
    success: 'Category deleted.',
    onSuccess: () => setDeleting(null),
    // A failed delete leaves the dialog open, with the reason shown as a toast.
  })

  const list = (data ?? [])
    .filter((category) => category.type === type)
    .sort((a, b) => Number(a.is_archived) - Number(b.is_archived))

  const addButton = !project.is_archived && (
    <Button variant="primary" onClick={() => setDialog({ category: null })}>
      <Plus className="size-4" aria-hidden="true" /> Add category
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Category type" options={TYPES} value={type} onChange={setType} />
        {addButton}
      </div>
      <p className="text-sm text-ink-2">
        Categories belong to this project. Other projects have their own, even with the same name.
      </p>

      <Card className="p-4">
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : isPending ? (
          <LoadingBlock label="Loading categories" rows={5} />
        ) : list.length === 0 ? (
          <EmptyState compact icon={Tags} title={`No ${type} categories`} description="Add one to start organizing this project." action={addButton} />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((category) => {
              const used = usage.get(category.id) ?? 0
              return (
                <li key={category.id} className={`flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 ${category.is_archived ? 'opacity-60' : ''}`}>
                  <ColorIcon icon={category.icon} color={category.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{category.name}</p>
                    <p className="text-xs text-ink-3">{used.toLocaleString('en')} transaction{used === 1 ? '' : 's'}</p>
                  </div>
                  {category.is_archived && <Badge>Archived</Badge>}
                  {!project.is_archived && (
                    <Menu
                      label={`Actions for ${category.name}`}
                      trigger={(props) => (
                        <Button variant="ghost" size="icon" {...props}>
                          <MoreHorizontal className="size-[18px]" aria-hidden="true" />
                        </Button>
                      )}
                      items={[
                        { label: 'Edit', icon: Pencil, onSelect: () => setDialog({ category }) },
                        category.is_archived
                          ? { label: 'Restore', icon: ArchiveRestore, onSelect: () => archive.mutate({ category, isArchived: false }) }
                          : { label: 'Archive', icon: Archive, onSelect: () => archive.mutate({ category, isArchived: true }) },
                        ...(used === 0 ? [{ label: 'Delete', icon: Trash2, danger: true, onSelect: () => setDeleting(category) }] : []),
                      ]}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {dialog && (
        <CategoryDialog key={dialog.category?.id ?? 'new'} project={project} category={dialog.category} type={type} onClose={() => setDialog(null)} />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete this category?"
        confirmLabel="Delete"
        description={deleting && `"${deleting.name}" has no transactions and will be removed.`}
      />
    </div>
  )
}
