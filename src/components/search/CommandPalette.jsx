import { useQuery } from '@tanstack/react-query'
import { ArrowDownLeft, FolderPlus, PieChart, Plus, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserId } from '../../context/AuthContext.jsx'
import { useQuickAdd } from '../../context/QuickAddContext.jsx'
import { useCurrentProjectId } from '../../hooks/useCurrentProject.js'
import { useDateFormatter } from '../../hooks/useData.js'
import { globalSearch } from '../../services/searchService.js'
import { friendlyError } from '../../utils/errors.js'
import { Dialog } from '../common/Dialog.jsx'
import { ColorIcon } from '../common/Identity.jsx'
import { SignedAmount } from '../transactions/TransactionList.jsx'

const MIN_LENGTH = 2

function Group({ title, children }) {
  return (
    <div>
      <p className="px-2 pt-2 pb-1 text-xs font-medium text-ink-3">{title}</p>
      <ul>{children}</ul>
    </div>
  )
}

function Item({ onSelect, children }) {
  return (
    <li>
      <button
        type="button"
        data-palette-item
        onClick={onSelect}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm text-ink hover:bg-surface-2 focus-visible:bg-surface-2"
      >
        {children}
      </button>
    </li>
  )
}

export default function CommandPalette({ onClose }) {
  const userId = useUserId()
  const navigate = useNavigate()
  const quickAdd = useQuickAdd()
  const currentProject = useCurrentProjectId()
  const formatDate = useDateFormatter()
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const [text, setText] = useState('')
  const [term, setTerm] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setTerm(text.trim()), 200)
    return () => clearTimeout(timer)
  }, [text])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const searching = term.length >= MIN_LENGTH
  const { data, isFetching, error } = useQuery({
    queryKey: [userId, 'search', term],
    queryFn: () => globalSearch(userId, term),
    enabled: searching,
  })

  const go = (path) => {
    onClose()
    navigate(path)
  }
  const add = (type) => {
    onClose()
    quickAdd.open({ type, projectId: currentProject })
  }

  const onKeyDown = (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    const items = [...listRef.current.querySelectorAll('[data-palette-item]')]
    if (!items.length) return
    const index = items.indexOf(document.activeElement)
    if (event.key === 'ArrowDown') items[index + 1 >= items.length ? 0 : index + 1].focus()
    else if (index <= 0) inputRef.current.focus()
    else items[index - 1].focus()
  }

  const empty = searching && data && !data.projects.length && !data.categories.length && !data.transactions.length

  return (
    <Dialog open onClose={onClose} title="Search and quick actions" width="36rem">
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Arrow keys bubble from the input and buttons inside. */}
      <div onKeyDown={onKeyDown}>
        <label className="relative block">
          <span className="sr-only">Search transactions, notes, projects and categories</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Search transactions, notes, projects, categories…"
            className="block h-11 w-full rounded-lg border border-line-strong bg-surface pr-3 pl-9 text-base text-ink placeholder:text-ink-3 lg:text-sm"
          />
        </label>

        <div ref={listRef} className="mt-2 min-h-40" aria-live="polite">
          {!searching && (
            <Group title="Quick actions">
              <Item onSelect={() => add('expense')}><Plus className="size-4 text-ink-2" aria-hidden="true" /> Add expense</Item>
              <Item onSelect={() => add('income')}><ArrowDownLeft className="size-4 text-ink-2" aria-hidden="true" /> Add income</Item>
              <Item onSelect={() => go('/projects?new=1')}><FolderPlus className="size-4 text-ink-2" aria-hidden="true" /> Create project</Item>
              <Item onSelect={() => go('/reports')}><PieChart className="size-4 text-ink-2" aria-hidden="true" /> View reports</Item>
            </Group>
          )}

          {searching && error && <p className="px-2 py-6 text-center text-sm text-danger">{friendlyError(error)}</p>}
          {searching && !data && !error && <p className="px-2 py-6 text-center text-sm text-ink-3">{isFetching ? 'Searching…' : ''}</p>}
          {empty && <p className="px-2 py-6 text-center text-sm text-ink-2">No results for "{term}".</p>}

          {searching && data && (
            <>
              {data.projects.length > 0 && (
                <Group title="Projects">
                  {data.projects.map((project) => (
                    <Item key={project.id} onSelect={() => go(`/projects/${project.id}`)}>
                      <ColorIcon icon={project.icon} color={project.color} size="sm" />
                      <span className="truncate">{project.name}</span>
                    </Item>
                  ))}
                </Group>
              )}
              {data.categories.length > 0 && (
                <Group title="Categories">
                  {data.categories.map((category) => (
                    <Item key={category.id} onSelect={() => go(`/projects/${category.project_id}/categories?type=${category.type}`)}>
                      <ColorIcon icon={category.icon} color={category.color} size="sm" />
                      <span className="truncate">{category.name}</span>
                      <span className="ml-auto text-xs text-ink-3">{category.type}</span>
                    </Item>
                  ))}
                </Group>
              )}
              {data.transactions.length > 0 && (
                <Group title="Transactions">
                  {data.transactions.map((row) => (
                    <Item key={row.id} onSelect={() => go(`/projects/${row.project_id}/transactions?q=${encodeURIComponent(row.title)}`)}>
                      <ColorIcon icon={row.category?.icon} color={row.category?.color ?? '#64748b'} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{row.title}</span>
                        <span className="block truncate text-xs text-ink-3">{row.project?.name} · {formatDate(row.transaction_date)}</span>
                      </span>
                      <SignedAmount row={row} />
                    </Item>
                  ))}
                </Group>
              )}
            </>
          )}
        </div>
      </div>
    </Dialog>
  )
}
