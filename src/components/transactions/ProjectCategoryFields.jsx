import { Link } from 'react-router-dom'
import { useCategories } from '../../hooks/useData.js'
import { SelectField } from '../common/Field.jsx'

// Project and category pickers shared by the transaction and recurring-rule forms. The category list
// is always loaded from the chosen project, and the parent clears the category when the project
// changes, so a cross-project category can't be chosen by accident. The database rejects it anyway.
export function ProjectCategoryFields({ projects, projectId, categoryId, type, keepCategoryId, errors, onProject, onCategory, onNavigate }) {
  const { data: categories, isPending } = useCategories(projectId || undefined)
  const options = (categories ?? []).filter(
    (category) => category.type === type && (!category.is_archived || category.id === keepCategoryId),
  )
  const loading = Boolean(projectId) && isPending

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Project" value={projectId} onChange={(event) => onProject(event.target.value)} error={errors.projectId}>
          <option value="">Choose a project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </SelectField>

        <SelectField
          label="Category"
          value={categoryId}
          onChange={(event) => onCategory(event.target.value)}
          error={errors.categoryId}
          disabled={!projectId || loading}
          hint={projectId ? undefined : 'Choose a project first.'}
        >
          <option value="">{loading ? 'Loading…' : 'Choose a category'}</option>
          {options.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </SelectField>
      </div>

      {projectId && !loading && !options.length && (
        <p className="text-sm text-ink-2">
          This project has no {type} categories yet.{' '}
          <Link to={`/projects/${projectId}/categories`} onClick={onNavigate} className="font-medium text-link underline">
            Add one
          </Link>
        </p>
      )}
    </>
  )
}
