// Builds PostgREST `or` filter values from user text. Without quoting, a comma or bracket in a
// search would change the filter's meaning, and % or _ would act as wildcards.
export function ilikeTerm(text) {
  const literal = text.trim().replace(/[\\%_]/g, '\\$&')
  const quoted = `%${literal}%`.replace(/[\\"]/g, '\\$&')
  return `"${quoted}"`
}

export function transactionSearchFilter(text, { projectIds = [], categoryIds = [] } = {}) {
  const term = ilikeTerm(text)
  const clauses = [`title.ilike.${term}`, `notes.ilike.${term}`]
  if (projectIds.length) clauses.push(`project_id.in.(${projectIds.join(',')})`)
  if (categoryIds.length) clauses.push(`category_id.in.(${categoryIds.join(',')})`)
  return clauses.join(',')
}
