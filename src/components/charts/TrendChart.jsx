import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney, formatMoneyCompact } from '../../utils/money.js'
import { Segmented } from '../common/Controls.jsx'

const SERIES = {
  expense: { key: 'expenseMinor', label: 'Expenses', color: 'var(--chart-1)' },
  income: { key: 'incomeMinor', label: 'Income', color: 'var(--chart-2)' },
}

const AXIS_TICK = { fill: 'var(--chart-text)', fontSize: 12 }

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-float">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-ink-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
          {entry.name}
          <span className="tabular ml-auto pl-3 font-medium text-ink">{formatMoney(entry.value, currency)}</span>
        </p>
      ))}
    </div>
  )
}

const VIEWS = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
]

// Change over time for one or both series. Every chart has a table twin, so no value depends on hover
// or on telling colors apart. Amounts stay integer minor units all the way into the chart.
export function TrendChart({ data, currency, series = ['expense'], height = 240, summary }) {
  const [view, setView] = useState('chart')
  const active = series.map((name) => SERIES[name])
  const single = active.length === 1

  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
      <XAxis
        dataKey="label"
        tick={AXIS_TICK}
        tickLine={false}
        axisLine={{ stroke: 'var(--chart-axis)' }}
        minTickGap={28}
        interval="preserveStartEnd"
      />
      <YAxis
        tick={AXIS_TICK}
        tickLine={false}
        axisLine={false}
        width={62}
        allowDecimals={false}
        tickFormatter={(value) => formatMoneyCompact(value, currency)}
      />
    </>
  )
  const tooltip = <Tooltip content={<ChartTooltip currency={currency} />} cursor={single ? { fill: 'var(--surface-2)' } : { stroke: 'var(--chart-axis)' }} />

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {single ? (
          <span />
        ) : (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Legend">
            {active.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                {s.label}
              </li>
            ))}
          </ul>
        )}
        <Segmented label="Chart or table" size="sm" options={VIEWS} value={view} onChange={setView} />
      </div>

      {view === 'chart' ? (
        <div role="img" aria-label={summary ?? `${active.map((s) => s.label).join(' and ')} over time. Switch to Table for exact values.`} style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {single ? (
              <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
                {axes}
                {tooltip}
                <Bar dataKey={active[0].key} name={active[0].label} fill={active[0].color} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                {axes}
                {tooltip}
                {active.map((s) => (
                  <Line
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line text-left text-xs text-ink-3">
                <th scope="col" className="py-1.5 font-medium">Period</th>
                {active.map((s) => <th key={s.key} scope="col" className="py-1.5 text-right font-medium">{s.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((point) => (
                <tr key={point.key}>
                  <td className="py-1.5 text-ink-2">{point.label}</td>
                  {active.map((s) => (
                    <td key={s.key} className="tabular py-1.5 text-right text-ink">{formatMoney(point[s.key], currency)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
