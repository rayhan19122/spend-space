import { beforeAll, describe, expect, it } from 'vitest'
import {
  asAnon,
  asUser,
  categoryId,
  createDatabase,
  createProject,
  createUser,
  insertTransaction,
} from './harness.js'

const USER_TABLES = ['profiles', 'projects', 'categories', 'transactions', 'budgets', 'recurring_rules']

let db, userA, userB
let projectA, projectB, categoryA, categoryB, transactionB, budgetB

beforeAll(async () => {
  db = await createDatabase()
  userA = await createUser(db, 'a@example.test')
  userB = await createUser(db, 'b@example.test')

  await asUser(db, userA, async (tx) => {
    projectA = await createProject(tx, 'A Personal')
    categoryA = await categoryId(tx, projectA.id)
    await insertTransaction(tx, { project_id: projectA.id, category_id: categoryA, title: 'A coffee' })
  })
  await asUser(db, userB, async (tx) => {
    projectB = await createProject(tx, 'B Personal')
    categoryB = await categoryId(tx, projectB.id)
    transactionB = await insertTransaction(tx, {
      project_id: projectB.id,
      category_id: categoryB,
      title: 'B secret',
      notes: 'private',
    })
    const { rows } = await tx.query(
      `insert into public.budgets (project_id, name, amount_minor, currency, period, start_date)
       values ($1, 'B budget', 100000, 'BDT', 'monthly', '2026-11-01') returning *`,
      [projectB.id],
    )
    budgetB = rows[0]
  })
}, 60_000)

describe('RLS configuration', () => {
  it('is enabled on every user-owned table', async () => {
    const { rows } = await db.query(
      `select relname, relrowsecurity from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r'`,
    )
    expect(rows.map((r) => r.relname).sort()).toEqual([...USER_TABLES].sort())
    for (const row of rows) expect(row.relrowsecurity, row.relname).toBe(true)
  })

  it('API roles do not own any table, so RLS always applies to them', async () => {
    const { rows } = await db.query(
      `select tablename from pg_tables
       where schemaname = 'public' and tableowner in ('anon', 'authenticated')`,
    )
    expect(rows).toEqual([])
  })

  it('has a policy for each operation on each owned table', async () => {
    const { rows } = await db.query(
      `select tablename, cmd from pg_policies where schemaname = 'public'`,
    )
    for (const table of USER_TABLES.filter((t) => t !== 'profiles')) {
      const cmds = rows.filter((r) => r.tablename === table).map((r) => r.cmd).sort()
      expect(cmds, table).toEqual(['DELETE', 'INSERT', 'SELECT', 'UPDATE'])
    }
    const profileCmds = rows.filter((r) => r.tablename === 'profiles').map((r) => r.cmd).sort()
    expect(profileCmds).toEqual(['SELECT', 'UPDATE'])
  })

  it('has no security definer function callable from the API', async () => {
    const { rows } = await db.query(
      `select proname from pg_proc
       where pronamespace = 'public'::regnamespace and prosecdef
         and (has_function_privilege('anon', oid, 'execute')
              or has_function_privilege('authenticated', oid, 'execute'))`,
    )
    expect(rows).toEqual([])
  })

  it('pins search_path on every function', async () => {
    const { rows } = await db.query(
      `select proname from pg_proc
       where pronamespace = 'public'::regnamespace
         and not exists (select 1 from unnest(coalesce(proconfig, '{}')) c where c like 'search_path=%')`,
    )
    expect(rows).toEqual([])
  })
})

describe('anonymous access', () => {
  it.each(USER_TABLES)('cannot read %s', async (table) => {
    await expect(asAnon(db, (tx) => tx.query(`select * from public.${table}`))).rejects.toThrow(
      /permission denied/,
    )
  })

  it('cannot call create_project or reset_my_data', async () => {
    await expect(asAnon(db, (tx) => createProject(tx, 'Nope'))).rejects.toThrow(/permission denied/)
    await expect(asAnon(db, (tx) => tx.query('select public.reset_my_data()'))).rejects.toThrow(
      /permission denied/,
    )
  })
})

describe('reading another user\'s data', () => {
  it.each(['projects', 'categories', 'transactions', 'budgets'])(
    'user A sees only their own %s',
    async (table) => {
      const rows = await asUser(db, userA, async (tx) => (await tx.query(`select user_id from public.${table}`)).rows)
      expect(rows.every((r) => r.user_id === userA)).toBe(true)
    },
  )

  it('user A cannot see user B\'s profile', async () => {
    const { rows } = await asUser(db, userA, (tx) => tx.query('select id from public.profiles'))
    expect(rows).toEqual([{ id: userA }])
  })

  it('user A cannot open user B\'s project by guessing its ID', async () => {
    const results = await asUser(db, userA, async (tx) => ({
      project: (await tx.query('select * from public.projects where id = $1', [projectB.id])).rows,
      transactions: (await tx.query('select * from public.transactions where project_id = $1', [projectB.id])).rows,
      categories: (await tx.query('select * from public.categories where project_id = $1', [projectB.id])).rows,
      budgets: (await tx.query('select * from public.budgets where project_id = $1', [projectB.id])).rows,
    }))
    expect(results).toEqual({ project: [], transactions: [], categories: [], budgets: [] })
  })

  it('aggregates cover only the caller\'s rows', async () => {
    const { rows } = await asUser(db, userA, (tx) =>
      tx.query('select count(*)::int as n, sum(amount_minor)::int as total from public.transactions'),
    )
    expect(rows[0]).toEqual({ n: 1, total: 50000 })
  })
})

describe('writing as or into another user', () => {
  it('cannot insert a project owned by someone else', async () => {
    await expect(
      asUser(db, userA, (tx) =>
        tx.query(`insert into public.projects (user_id, name) values ($1, 'Forged')`, [userB]),
      ),
    ).rejects.toThrow(/row-level security/)
  })

  it('cannot attach a transaction to another user\'s project', async () => {
    await expect(
      asUser(db, userA, (tx) =>
        insertTransaction(tx, { project_id: projectB.id, category_id: categoryB }),
      ),
    ).rejects.toThrow()
    const { rows } = await db.query('select count(*)::int as n from public.transactions where project_id = $1', [projectB.id])
    expect(rows[0].n).toBe(1)
  })

  it('gets the same error for a real foreign project as for a made-up ID', async () => {
    const attempt = (projectId) =>
      asUser(db, userA, (tx) => insertTransaction(tx, { project_id: projectId, category_id: categoryA }))
        .catch((e) => e.message)
    expect(await attempt(projectB.id)).toBe(await attempt('00000000-0000-4000-8000-000000000000'))
  })

  it('cannot forge user_id on a transaction', async () => {
    await expect(
      asUser(db, userA, (tx) =>
        insertTransaction(tx, { user_id: userB, project_id: projectB.id, category_id: categoryB }),
      ),
    ).rejects.toThrow()
  })

  it('cannot use another user\'s category in their own project', async () => {
    await expect(
      asUser(db, userA, (tx) =>
        insertTransaction(tx, { project_id: projectA.id, category_id: categoryB }),
      ),
    ).rejects.toThrow(/foreign key/)
  })

  it('cannot create a category in another user\'s project', async () => {
    await expect(
      asUser(db, userA, (tx) =>
        tx.query(`insert into public.categories (project_id, name, type) values ($1, 'Forged', 'expense')`, [projectB.id]),
      ),
    ).rejects.toThrow()
  })

  it('cannot create a budget in another user\'s project', async () => {
    await expect(
      asUser(db, userA, (tx) =>
        tx.query(
          `insert into public.budgets (project_id, name, amount_minor, currency, period, start_date)
           values ($1, 'Forged', 100, 'BDT', 'weekly', '2026-11-01')`,
          [projectB.id],
        ),
      ),
    ).rejects.toThrow()
  })

  it('updates to another user\'s rows affect nothing', async () => {
    const affected = await asUser(db, userA, async (tx) => [
      (await tx.query(`update public.transactions set amount_minor = 1 where id = $1`, [transactionB.id])).affectedRows,
      (await tx.query(`update public.projects set name = 'Hacked' where id = $1`, [projectB.id])).affectedRows,
      (await tx.query(`update public.budgets set amount_minor = 1 where id = $1`, [budgetB.id])).affectedRows,
      (await tx.query(`update public.profiles set display_name = 'Hacked' where id = $1`, [userB])).affectedRows,
    ])
    expect(affected).toEqual([0, 0, 0, 0])
    const { rows } = await db.query('select amount_minor from public.transactions where id = $1', [transactionB.id])
    expect(Number(rows[0].amount_minor)).toBe(50000)
  })

  it('deletes of another user\'s rows affect nothing', async () => {
    const affected = await asUser(db, userA, async (tx) => [
      (await tx.query(`delete from public.transactions where id = $1`, [transactionB.id])).affectedRows,
      (await tx.query(`delete from public.projects where id = $1`, [projectB.id])).affectedRows,
      (await tx.query(`delete from public.budgets where id = $1`, [budgetB.id])).affectedRows,
    ])
    expect(affected).toEqual([0, 0, 0])
  })

  it('cannot hand their own project to another user', async () => {
    await expect(
      asUser(db, userA, (tx) => tx.query('update public.projects set user_id = $1 where id = $2', [userB, projectA.id])),
    ).rejects.toThrow()
  })

  it('cannot hand their own transaction to another user', async () => {
    await expect(
      asUser(db, userA, (tx) => tx.query('update public.transactions set user_id = $1 where user_id = $2', [userB, userA])),
    ).rejects.toThrow()
  })

  it('reset_my_data removes only the caller\'s data', async () => {
    const scratch = await createUser(db, 'scratch@example.test')
    await asUser(db, scratch, async (tx) => {
      const p = await createProject(tx, 'Scratch')
      await insertTransaction(tx, { project_id: p.id, category_id: await categoryId(tx, p.id) })
      await tx.query('select public.reset_my_data()')
    })
    const { rows } = await db.query(
      `select
         (select count(*)::int from public.projects where user_id = $1) as mine,
         (select count(*)::int from public.projects where user_id = $2) as other`,
      [scratch, userB],
    )
    expect(rows[0]).toEqual({ mine: 0, other: 1 })
  })
})

describe('profile privileges', () => {
  it('a sign-up creates a profile through the trigger', async () => {
    const { rows } = await db.query(`select id from public.profiles where id = $1`, [userA])
    expect(rows).toHaveLength(1)
  })

  it('a user cannot insert or delete profile rows directly', async () => {
    const other = await createUser(db, 'noprofile@example.test')
    await expect(
      asUser(db, userA, (tx) => tx.query('insert into public.profiles (id) values ($1)', [other])),
    ).rejects.toThrow(/permission denied/)
    await expect(
      asUser(db, userA, (tx) => tx.query('delete from public.profiles where id = $1', [userA])),
    ).rejects.toThrow(/permission denied/)
  })

  it('a user cannot change their profile ID', async () => {
    await expect(
      asUser(db, userA, (tx) => tx.query('update public.profiles set id = $1 where id = $2', [userB, userA])),
    ).rejects.toThrow(/permission denied/)
  })
})
