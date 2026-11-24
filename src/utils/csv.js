const FORMULA_TRIGGER = /^[=+\-@\t\r]/

// Spreadsheets run cells starting with these characters as formulas, so a transaction titled
// =HYPERLINK(...) could execute when the export is opened. Numeric columns pass `raw`.
export function escapeCell(value, { raw = false } = {}) {
  let text = value === null || value === undefined ? '' : String(value)
  if (!raw && FORMULA_TRIGGER.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

// columns: [{ header, value: (row) => cell, raw?: boolean }]
export function toCsv(rows, columns) {
  const head = columns.map((column) => escapeCell(column.header)).join(',')
  const body = rows.map((row) =>
    columns.map((column) => escapeCell(column.value(row), { raw: column.raw })).join(','),
  )
  return [head, ...body].join('\r\n')
}

// The byte-order mark makes Excel read ৳ and non-English titles as UTF-8.
export function downloadFile(filename, content, type) {
  const prefix = type.startsWith('text/csv') ? '﻿' : ''
  const url = URL.createObjectURL(new Blob([prefix + content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
