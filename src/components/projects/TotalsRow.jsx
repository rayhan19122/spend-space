import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react'
import { formatMoney } from '../../utils/money.js'
import { StatCard } from '../common/StatCard.jsx'

// Income, expenses and net as stat cards. When a type filter hides one side, it says so
// rather than showing a misleading ৳0.
export function incomeExpenseNetCards({ totals, currency, type, sub }) {
  const hiddenNote = 'Hidden by the type filter'
  return [
    <StatCard
      key="income"
      label="Income"
      icon={ArrowDownLeft}
      value={type === 'expense' ? '—' : formatMoney(totals.incomeMinor, currency)}
      tone={type === 'expense' ? 'neutral' : 'income'}
      sub={type === 'expense' ? hiddenNote : sub}
    />,
    <StatCard
      key="expense"
      label="Expenses"
      icon={ArrowUpRight}
      value={type === 'income' ? '—' : formatMoney(totals.expenseMinor, currency)}
      sub={type === 'income' ? hiddenNote : sub}
    />,
    <StatCard
      key="net"
      label="Net balance"
      icon={Scale}
      value={type ? '—' : formatMoney(totals.netMinor, currency)}
      tone={!type && totals.netMinor < 0 ? 'danger' : 'neutral'}
      sub={type ? hiddenNote : 'Income minus expenses'}
    />,
  ]
}
