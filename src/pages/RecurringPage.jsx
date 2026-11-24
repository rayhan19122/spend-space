import { CalendarClock, Check, MoreHorizontal, Pause, Pencil, Play, Plus, Repeat, SkipForward, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/common/Button.jsx'
import { Badge, Banner, Card, EmptyState, ErrorState, LoadingBlock, SectionCard } from '../components/common/Card.jsx'
import { Menu } from '../components/common/Controls.jsx'
import { ConfirmDialog } from '../components/common/Dialog.jsx'
import { ProjectBadge } from '../components/common/Identity.jsx'
import { RuleFormDialog } from '../components/recurring/RuleFormDialog.jsx'
import { useDateFormatter, useRecurringRules, useWrite } from '../hooks/useData.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { deleteRule, recordOccurrence, setRuleActive, skipOccurrence } from '../services/recurringService.js'
import { formatMoney } from '../utils/money.js'
import { FREQUENCY_LABELS, isDue } from '../utils/recurring.js'

function RuleRow({ rule, onEdit, onDelete, onToggle, onRecord, onSkip, recording }) {
  const formatDate = useDateFormatter()
  const due = isDue(rule) && !rule.project?.is_archived
  const finished = !rule.next_due_date

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 basis-56">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{rule.title}</span>
          {!rule.is_active && <Badge>Paused</Badge>}
          {finished && <Badge>Finished</Badge>}
        </p>
        <p className="mt-0.5 text-xs text-ink-3">
          <span className="tabular">{formatMoney(rule.amount_minor, rule.currency)}</span> {rule.type} · {FREQUENCY_LABELS[rule.frequency]} · {rule.category?.name}
          {!finished && ` · ${due ? 'Due' : 'Next'} ${formatDate(rule.next_due_date)}`}
        </p>
        <div className="mt-1.5 flex"><ProjectBadge project={rule.project} /></div>
      </div>
      <div className="flex items-center gap-1">
        {due && (
          <>
            <Button size="sm" variant="primary" loading={recording} onClick={onRecord}>
              <Check className="size-4" aria-hidden="true" /> Record
            </Button>
            <Button size="sm" variant="ghost" onClick={onSkip}>
              <SkipForward className="size-4" aria-hidden="true" /> Skip
            </Button>
          </>
        )}
        <Menu
          label={`Actions for ${rule.title}`}
          trigger={(props) => (
            <Button variant="ghost" size="icon" {...props}>
              <MoreHorizontal className="size-[18px]" aria-hidden="true" />
            </Button>
          )}
          items={[
            { label: 'Edit', icon: Pencil, onSelect: onEdit },
            rule.is_active
              ? { label: 'Pause', icon: Pause, onSelect: () => onToggle(false) }
              : { label: 'Resume', icon: Play, onSelect: () => onToggle(true) },
            { label: 'Delete', icon: Trash2, danger: true, onSelect: onDelete },
          ]}
        />
      </div>
    </li>
  )
}

export default function RecurringPage() {
  useDocumentTitle('Recurring rules')
  const { data, isPending, error, refetch } = useRecurringRules()
  const [dialog, setDialog] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const record = useWrite((userId, rule) => recordOccurrence(userId, rule), {
    success: (_data, rule) => `${rule.title} recorded as a transaction.`,
  })
  const skip = useWrite((userId, rule) => skipOccurrence(userId, rule), { success: 'Occurrence skipped. Nothing was recorded.' })
  const toggle = useWrite((userId, { id, isActive }) => setRuleActive(userId, id, isActive), { success: 'Rule updated.' })
  const remove = useWrite((userId, id) => deleteRule(userId, id), {
    success: 'Rule deleted. Recorded transactions were kept.',
    onSuccess: () => setDeleting(null),
  })

  const rules = data ?? []
  const due = rules.filter((rule) => isDue(rule) && !rule.project?.is_archived)
  const others = rules.filter((rule) => !due.includes(rule))
  const addButton = (
    <Button variant="primary" onClick={() => setDialog({ rule: null })}>
      <Plus className="size-4" aria-hidden="true" /> New rule
    </Button>
  )

  const row = (rule) => (
    <RuleRow
      key={rule.id}
      rule={rule}
      onEdit={() => setDialog({ rule })}
      onDelete={() => setDeleting(rule)}
      onToggle={(isActive) => toggle.mutate({ id: rule.id, isActive })}
      onRecord={() => record.mutate(rule)}
      onSkip={() => skip.mutate(rule)}
      recording={record.isPending && record.variables?.id === rule.id}
    />
  )

  return (
    <div className="space-y-4">
      <Banner tone="neutral" icon={CalendarClock} action={addButton}>
        A rule is a reminder, not a payment. Nothing is added to your totals until you choose Record.
      </Banner>

      {error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : isPending ? (
        <LoadingBlock label="Loading rules" rows={4} />
      ) : rules.length === 0 ? (
        <Card>
          <EmptyState icon={Repeat} title="No recurring rules" description="Add rent, subscriptions or an allowance, and get a reminder to record each one." action={addButton} />
        </Card>
      ) : (
        <>
          {due.length > 0 && (
            <SectionCard title="Due now" subtitle="Confirm each one that actually happened.">
              <ul className="divide-y divide-line">{due.map(row)}</ul>
            </SectionCard>
          )}
          {others.length > 0 && (
            <SectionCard title="All rules">
              <ul className="divide-y divide-line">{others.map(row)}</ul>
            </SectionCard>
          )}
        </>
      )}

      {dialog && <RuleFormDialog key={dialog.rule?.id ?? 'new'} rule={dialog.rule} open onClose={() => setDialog(null)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete this rule?"
        confirmLabel="Delete rule"
        description={deleting && `"${deleting.title}" will stop reminding you. Transactions already recorded from it stay in place.`}
      />
    </div>
  )
}
