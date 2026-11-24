// Runs the real migrations on PGlite (Postgres compiled to WebAssembly).
// The stub below reproduces the parts of Supabase the migrations depend on: its default
// privileges, which grant anon table access unless the migrations revoke it, and an owner that
// is not a superuser, so RLS and the security definer sign-up trigger behave as they do there.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const MIGRATIONS_DIR = join(import.meta.dirname, '../../supabase/migrations')

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create role project_owner nologin nosuperuser;

  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
  $$;

  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  grant all on schema public to project_owner;
  grant usage on schema auth to project_owner;
  grant select, references, trigger on auth.users to project_owner;
  grant execute on function auth.uid() to project_owner;
  grant anon, authenticated to project_owner;

  alter default privileges for role project_owner in schema public
    grant all on tables to anon, authenticated, service_role;
  alter default privileges for role project_owner in schema public
    grant all on functions to anon, authenticated, service_role;
`

export const migrationFiles = () =>
  readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()

export async function createDatabase() {
  const db = new PGlite()
  await db.exec(SUPABASE_STUB)
  await db.exec('set role project_owner')
  for (const file of migrationFiles()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  }
  await db.exec('reset role')
  return db
}

export async function createUser(db, email) {
  const { rows } = await db.query('insert into auth.users (email) values ($1) returning id', [email])
  return rows[0].id
}

// Runs fn as an API request from this user, and rolls back on error.
export async function asUser(db, userId, fn) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ])
    await tx.exec('set local role authenticated')
    return fn(tx)
  })
}

export async function asAnon(db, fn) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claims', '', true)`)
    await tx.exec('set local role anon')
    return fn(tx)
  })
}

export const createProject = async (tx, name, opts = {}) => {
  const { rows } = await tx.query(
    `select * from public.create_project(p_name => $1, p_currency => $2, p_seed_categories => $3)`,
    [name, opts.currency ?? 'BDT', opts.seed ?? true],
  )
  return rows[0]
}

export const categoryId = async (tx, projectId, name = 'Food', type = 'expense') => {
  const { rows } = await tx.query(
    `select id from public.categories where project_id = $1 and name = $2 and type = $3`,
    [projectId, name, type],
  )
  return rows[0]?.id
}

export const insertTransaction = async (tx, fields) => {
  const row = {
    type: 'expense',
    title: 'Test',
    amount_minor: 50000,
    transaction_date: '2026-11-01',
    ...fields,
  }
  const keys = Object.keys(row)
  const { rows } = await tx.query(
    `insert into public.transactions (${keys.join(', ')})
     values (${keys.map((_, i) => `$${i + 1}`).join(', ')}) returning *`,
    keys.map((k) => row[k]),
  )
  return rows[0]
}
