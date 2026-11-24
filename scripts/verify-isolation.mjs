// Checks user isolation against a real Supabase project, using only the public key, exactly as a
// browser would. Run after applying the migrations. Use two throwaway test users, not real accounts.
//
//   cp .env.isolation.example .env.isolation   (then fill it in)
//   npm run verify:isolation
//
// It creates a project for each test user, runs the checks, and deletes what it created.
import { createClient } from '@supabase/supabase-js'

const env = process.env
const required = [
  'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY',
  'TEST_USER_A_EMAIL', 'TEST_USER_A_PASSWORD', 'TEST_USER_B_EMAIL', 'TEST_USER_B_PASSWORD',
]
const missing = required.filter((name) => !env[name])
if (missing.length) {
  console.error(`Missing in .env.isolation: ${missing.join(', ')}`)
  process.exit(2)
}

const newClient = () =>
  createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

async function signIn(email, password) {
  const client = newClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Could not sign in ${email}: ${error.message}`)
  return { client, id: data.user.id }
}

let failures = 0
const check = (name, passed, detail = '') => {
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${!passed && detail ? ` (${detail})` : ''}`)
  if (!passed) failures += 1
}

const a = await signIn(env.TEST_USER_A_EMAIL, env.TEST_USER_A_PASSWORD)
const b = await signIn(env.TEST_USER_B_EMAIL, env.TEST_USER_B_PASSWORD)
const anon = newClient()
const suffix = Date.now()
const created = []

async function setUpUser(user, label) {
  const { data: project, error } = await user.client
    .rpc('create_project', { p_name: `Isolation check ${label} ${suffix}` })
    .single()
  if (error) throw new Error(`create_project failed for user ${label}: ${error.message}`)
  created.push({ user, id: project.id })
  const { data: category } = await user.client
    .from('categories').select('id').eq('project_id', project.id).eq('name', 'Food').eq('type', 'expense').single()
  const { data: transaction, error: txError } = await user.client
    .from('transactions')
    .insert({
      user_id: user.id, project_id: project.id, category_id: category.id, type: 'expense',
      amount_minor: 50000, title: `Secret of ${label}`, transaction_date: '2026-01-15',
    })
    .select().single()
  if (txError) throw new Error(`Transaction insert failed for user ${label}: ${txError.message}`)
  return { project, category, transaction }
}

try {
  const dataA = await setUpUser(a, 'A')
  const dataB = await setUpUser(b, 'B')

  const profile = await a.client.from('profiles').select('id').eq('id', a.id).maybeSingle()
  check('Sign-up trigger created a profile', profile.data?.id === a.id, profile.error?.message)
  check('Transaction currency was set by the database', dataA.transaction.currency === 'BDT')

  for (const table of ['profiles', 'projects', 'categories', 'transactions', 'budgets', 'recurring_rules']) {
    const { data, error } = await anon.from(table).select('*').limit(1)
    check(`Anonymous visitor cannot read ${table}`, Boolean(error) || data.length === 0, 'rows were returned')
  }

  const list = async (client, table, column, value) =>
    (await client.from(table).select('id').eq(column, value)).data ?? []

  check("A cannot read B's project by ID", (await list(a.client, 'projects', 'id', dataB.project.id)).length === 0)
  check("A cannot read B's transactions by project", (await list(a.client, 'transactions', 'project_id', dataB.project.id)).length === 0)
  check("A cannot read B's transaction by ID", (await list(a.client, 'transactions', 'id', dataB.transaction.id)).length === 0)
  check("A cannot read B's categories", (await list(a.client, 'categories', 'project_id', dataB.project.id)).length === 0)
  check("A cannot read B's profile", (await list(a.client, 'profiles', 'id', b.id)).length === 0)

  const all = (await a.client.from('transactions').select('user_id')).data ?? []
  check("A's unfiltered query returns only A's rows", all.every((row) => row.user_id === a.id))

  const insert = (fields) => a.client.from('transactions').insert({
    type: 'expense', amount_minor: 100, title: 'Forged', transaction_date: '2026-01-15', ...fields,
  })
  check("A cannot add a transaction to B's project",
    Boolean((await insert({ user_id: a.id, project_id: dataB.project.id, category_id: dataB.category.id })).error))
  check('A cannot forge a transaction as B',
    Boolean((await insert({ user_id: b.id, project_id: dataB.project.id, category_id: dataB.category.id })).error))
  check("A cannot use B's category in A's project",
    Boolean((await insert({ user_id: a.id, project_id: dataA.project.id, category_id: dataB.category.id })).error))

  const updated = await a.client.from('transactions').update({ amount_minor: 1 }).eq('id', dataB.transaction.id).select()
  check("A cannot edit B's transaction", (updated.data ?? []).length === 0)
  const deleted = await a.client.from('transactions').delete().eq('id', dataB.transaction.id).select()
  check("A cannot delete B's transaction", (deleted.data ?? []).length === 0)
  const deletedProject = await a.client.from('projects').delete().eq('id', dataB.project.id).select()
  check("A cannot delete B's project", (deletedProject.data ?? []).length === 0)
  const stolen = await a.client.from('projects').update({ user_id: b.id }).eq('id', dataA.project.id).select()
  check('A cannot transfer a project to B', Boolean(stolen.error) || (stolen.data ?? []).length === 0)

  const intact = await b.client.from('transactions').select('amount_minor').eq('id', dataB.transaction.id).single()
  check("B's transaction is unchanged after all attempts", intact.data?.amount_minor === 50000)
} finally {
  for (const { user, id } of created) await user.client.from('projects').delete().eq('id', id)
}

console.log(failures ? `\n${failures} check(s) FAILED. Do not use this project until fixed.` : '\nAll isolation checks passed.')
process.exit(failures ? 1 : 0)
