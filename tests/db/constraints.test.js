import { beforeAll, describe, expect, it } from 'vitest'
import {
  asUser,
  categoryId,
  createDatabase,
  createProject,
  createUser,
  insertTransaction,
} from './harness.js'

let db, user, university, travel, foodUni, foodTravel, salaryUni

beforeAll(async () => {
  db = await createDatabase()
  user = await createUser(db, 'user@example.test')
  await asUser(db, user, async (tx) => {
    university = await createProject(tx, 'University')
    travel = await createProject(tx, 'Travel')
    foodUni = await categoryId(tx, university.id)
    foodTravel = await categoryId(tx, travel.id)
    salaryUni = await categoryId(tx, university.id, 'Salary', 'income')
  })
}, 60_000)

const run = (fn) => asUser(db, user, fn)

describe('transaction constraints', () => {
  it('stores the amount exactly and takes the currency from the project', async () => {
    const row = await run((tx) =>
      insertTransaction(tx, { project_id: university.id, category_id: foodUni, amount_minor: 50025 }),
    )
    expect(Number(row.amount_minor)).toBe(50025)
    expect(row.currency).toBe('BDT')
    await db.query('delete from public.transactions where id = $1', [row.id])
  })

  it('ignores a currency sent by the client', async () => {
    const row = await run((tx) =>
      insertTransaction(tx, { project_id: university.id, category_id: foodUni, currency: 'USD' }),
    )
    expect(row.currency).toBe('BDT')
    await db.query('delete from public.transactions where id = $1', [row.id])
  })

  it.each([
    ['zero amount', { amount_minor: 0 }],
    ['negative amount', { amount_minor: -500 }],
    ['absurd amount', { amount_minor: 2_000_000_000_000 }],
    ['invalid type', { type: 'transfer' }],
    ['blank title', { title: '   ' }],
    ['invalid payment method', { payment_method: 'bitcoin' }],
  ])('rejects %s', async (_name, fields) => {
    await expect(
      run((tx) => insertTransaction(tx, { project_id: university.id, category_id: foodUni, ...fields })),
    ).rejects.toThrow()
  })

  it('rejects a fractional amount rather than rounding silently', async () => {
    await expect(
      run((tx) => insertTransaction(tx, { project_id: university.id, category_id: foodUni, amount_minor: '10.5' })),
    ).rejects.toThrow()
  })

  it('rejects a category from another project', async () => {
    await expect(
      run((tx) => insertTransaction(tx, { project_id: university.id, category_id: foodTravel })),
    ).rejects.toThrow(/foreign key/)
  })

  it('rejects an income category on an expense', async () => {
    await expect(
      run((tx) => insertTransaction(tx, { project_id: university.id, category_id: salaryUni })),
    ).rejects.toThrow(/foreign key/)
  })

  it('rejects a transaction without a project', async () => {
    await expect(
      run((tx) => tx.query(
        `insert into public.transactions (category_id, type, amount_minor, title, transaction_date)
         values ($1, 'expense', 100, 'Orphan', '2026-11-01')`, [foodUni])),
    ).rejects.toThrow()
  })

  it('rejects moving to another project while keeping the old category', async () => {
    const row = await run((tx) => insertTransaction(tx, { project_id: university.id, category_id: foodUni }))
    await expect(
      run((tx) => tx.query('update public.transactions set project_id = $1 where id = $2', [travel.id, row.id])),
    ).rejects.toThrow(/foreign key/)
    await db.query('delete from public.transactions where id = $1', [row.id])
  })

  it('allows moving between same-currency projects with a matching category', async () => {
    const row = await run((tx) => insertTransaction(tx, { project_id: university.id, category_id: foodUni }))
    const moved = await run(async (tx) =>
      (await tx.query(
        'update public.transactions set project_id = $1, category_id = $2 where id = $3 returning *',
        [travel.id, foodTravel, row.id],
      )).rows[0],
    )
    expect(moved.project_id).toBe(travel.id)
    await db.query('delete from public.transactions where id = $1', [row.id])
  })

  it('rejects moving to a project in another currency', async () => {
    const row = await run((tx) => insertTransaction(tx, { project_id: university.id, category_id: foodUni }))
    await expect(
      run(async (tx) => {
        const usd = await createProject(tx, 'USD Project', { currency: 'USD' })
        const usdFood = await categoryId(tx, usd.id)
        await tx.query(
          'update public.transactions set project_id = $1, category_id = $2 where id = $3',
          [usd.id, usdFood, row.id],
        )
      }),
    ).rejects.toThrow('currency_mismatch')
    await db.query('delete from public.transactions where id = $1', [row.id])
  })
})

describe('project scenario from the brief', () => {
  it('a ৳500 University expense appears only in University', async () => {
    const counts = await run(async (tx) => {
      const personal = await createProject(tx, 'Scenario Personal')
      const scenarioTravel = await createProject(tx, 'Scenario Travel')
      const scenarioUni = await createProject(tx, 'Scenario University')
      await insertTransaction(tx, {
        project_id: scenarioUni.id,
        category_id: await categoryId(tx, scenarioUni.id),
        amount_minor: 50000,
      })
      const count = async (id) =>
        (await tx.query('select count(*)::int as n from public.transactions where project_id = $1', [id])).rows[0].n
      return { uni: await count(scenarioUni.id), personal: await count(personal.id), travel: await count(scenarioTravel.id) }
    })
    expect(counts).toEqual({ uni: 1, personal: 0, travel: 0 })
  })
})

describe('project currency lock', () => {
  it('allows changing currency while the project is empty', async () => {
    const updated = await run(async (tx) => {
      const p = await createProject(tx, 'Empty Project')
      return (await tx.query(`update public.projects set currency = 'USD' where id = $1 returning currency`, [p.id])).rows[0]
    })
    expect(updated.currency).toBe('USD')
  })

  it('blocks changing currency once a transaction exists', async () => {
    await expect(
      run(async (tx) => {
        const p = await createProject(tx, 'Has Records')
        await insertTransaction(tx, { project_id: p.id, category_id: await categoryId(tx, p.id) })
        await tx.query(`update public.projects set currency = 'USD' where id = $1`, [p.id])
      }),
    ).rejects.toThrow('currency_locked')
  })
})

describe('archived projects', () => {
  it('are read-only for new and edited transactions, and can be restored', async () => {
    const { project, category, existing } = await run(async (tx) => {
      const p = await createProject(tx, 'To Archive')
      const c = await categoryId(tx, p.id)
      const t = await insertTransaction(tx, { project_id: p.id, category_id: c })
      await tx.query('update public.projects set is_archived = true where id = $1', [p.id])
      return { project: p, category: c, existing: t }
    })

    await expect(
      run((tx) => insertTransaction(tx, { project_id: project.id, category_id: category })),
    ).rejects.toThrow('project_archived')
    await expect(
      run((tx) => tx.query('update public.transactions set title = $1 where id = $2', ['Edited', existing.id])),
    ).rejects.toThrow('project_archived')

    const { rows } = await run((tx) => tx.query('select id from public.transactions where project_id = $1', [project.id]))
    expect(rows).toHaveLength(1)

    await run((tx) => tx.query('update public.projects set is_archived = false where id = $1', [project.id]))
    const added = await run((tx) => insertTransaction(tx, { project_id: project.id, category_id: category }))
    expect(added.id).toBeTruthy()
  })
})

describe('deleting', () => {
  it('deleting a project removes everything inside it, and nothing else', async () => {
    const remaining = await run(async (tx) => {
      const keep = await createProject(tx, 'Keep')
      const keepCat = await categoryId(tx, keep.id)
      await insertTransaction(tx, { project_id: keep.id, category_id: keepCat })

      const gone = await createProject(tx, 'Gone')
      const goneCat = await categoryId(tx, gone.id)
      await insertTransaction(tx, { project_id: gone.id, category_id: goneCat })
      await tx.query(
        `insert into public.budgets (project_id, category_id, name, amount_minor, currency, period, start_date)
         values ($1, $2, 'B', 100, 'BDT', 'monthly', '2026-11-01')`,
        [gone.id, goneCat],
      )
      await tx.query(
        `insert into public.recurring_rules
           (project_id, category_id, type, amount_minor, currency, title, frequency, start_date)
         values ($1, $2, 'expense', 100, 'BDT', 'Rent', 'monthly', '2026-11-01')`,
        [gone.id, goneCat],
      )

      await tx.query('delete from public.projects where id = $1', [gone.id])

      const count = async (table, id) =>
        (await tx.query(`select count(*)::int as n from public.${table} where project_id = $1`, [id])).rows[0].n
      return {
        goneTx: await count('transactions', gone.id),
        goneCat: await count('categories', gone.id),
        goneBudget: await count('budgets', gone.id),
        goneRule: await count('recurring_rules', gone.id),
        keepTx: await count('transactions', keep.id),
      }
    })
    expect(remaining).toEqual({ goneTx: 0, goneCat: 0, goneBudget: 0, goneRule: 0, keepTx: 1 })
  })

  it('a category in use cannot be deleted', async () => {
    await expect(
      run(async (tx) => {
        const p = await createProject(tx, 'Category In Use')
        const c = await categoryId(tx, p.id)
        await insertTransaction(tx, { project_id: p.id, category_id: c })
        await tx.query('delete from public.categories where id = $1', [c])
      }),
    ).rejects.toThrow(/foreign key/)
  })

  it('deleting the auth user removes all of their data', async () => {
    const leaving = await createUser(db, 'leaving@example.test')
    await asUser(db, leaving, async (tx) => {
      const p = await createProject(tx, 'Mine')
      await insertTransaction(tx, { project_id: p.id, category_id: await categoryId(tx, p.id) })
    })
    await db.query('delete from auth.users where id = $1', [leaving])
    const { rows } = await db.query(
      `select
         (select count(*)::int from public.projects where user_id = $1) as projects,
         (select count(*)::int from public.transactions where user_id = $1) as transactions,
         (select count(*)::int from public.profiles where id = $1) as profiles`,
      [leaving],
    )
    expect(rows[0]).toEqual({ projects: 0, transactions: 0, profiles: 0 })
  })
})

describe('categories', () => {
  it('a new project starts with the suggested categories', async () => {
    const { rows } = await run((tx) =>
      tx.query(
        `select type, count(*)::int as n from public.categories where project_id = $1 group by type order by type`,
        [university.id],
      ),
    )
    expect(rows).toEqual([{ type: 'expense', n: 12 }, { type: 'income', n: 6 }])
  })

  it('can start with no categories', async () => {
    const { rows } = await run(async (tx) => {
      const p = await createProject(tx, 'Bare', { seed: false })
      return tx.query('select id from public.categories where project_id = $1', [p.id])
    })
    expect(rows).toEqual([])
  })

  it('the same name is fine across projects but not twice in one project', async () => {
    expect(foodUni).not.toBe(foodTravel)
    await expect(
      run((tx) =>
        tx.query(`insert into public.categories (project_id, name, type) values ($1, 'FOOD', 'expense')`, [university.id]),
      ),
    ).rejects.toThrow(/duplicate key/)
  })
})

describe('budgets', () => {
  const insertBudget = (tx, fields) => {
    const row = { name: 'B', amount_minor: 1000, period: 'monthly', start_date: '2026-11-01', ...fields }
    const keys = Object.keys(row)
    return tx.query(
      `insert into public.budgets (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')}) returning *`,
      keys.map((k) => row[k]),
    )
  }

  it('create_project can add a starting budget atomically', async () => {
    const { rows } = await run(async (tx) => {
      const { rows: created } = await tx.query(
        `select * from public.create_project(p_name => 'With Budget', p_budget_minor => 1200000,
           p_budget_start => '2026-11-01')`,
      )
      return tx.query('select name, amount_minor, currency, period from public.budgets where project_id = $1', [created[0].id])
    })
    expect(rows).toHaveLength(1)
    expect(Number(rows[0].amount_minor)).toBe(1200000)
    expect(rows[0]).toMatchObject({ name: 'Monthly budget', currency: 'BDT', period: 'monthly' })
  })

  it('a failed starting budget rolls back the whole project', async () => {
    await expect(
      run((tx) => tx.query(`select * from public.create_project(p_name => 'Rolled Back', p_budget_minor => -5)`)),
    ).rejects.toThrow()
    const { rows } = await run((tx) => tx.query(`select id from public.projects where name = 'Rolled Back'`))
    expect(rows).toEqual([])
  })

  it('rejects an income category', async () => {
    await expect(
      run((tx) => insertBudget(tx, { project_id: university.id, category_id: salaryUni })),
    ).rejects.toThrow('budget_category_not_expense')
  })

  it('rejects a category from another project', async () => {
    await expect(
      run((tx) => insertBudget(tx, { project_id: university.id, category_id: foodTravel })),
    ).rejects.toThrow(/foreign key/)
  })

  it('rejects a custom budget without an end date', async () => {
    await expect(
      run((tx) => insertBudget(tx, { project_id: university.id, period: 'custom' })),
    ).rejects.toThrow()
  })

  it('rejects an end date before the start', async () => {
    await expect(
      run((tx) => insertBudget(tx, { project_id: university.id, period: 'custom', end_date: '2026-10-01' })),
    ).rejects.toThrow()
  })

  it('rejects a second active budget for the same scope and period', async () => {
    await expect(
      run(async (tx) => {
        await insertBudget(tx, { project_id: university.id, category_id: foodUni })
        await insertBudget(tx, { project_id: university.id, category_id: foodUni })
      }),
    ).rejects.toThrow(/duplicate key/)
  })

  it('allows a new budget for that scope once the old one is archived', async () => {
    const { rows } = await run(async (tx) => {
      const first = await insertBudget(tx, { project_id: university.id, name: 'First' })
      await tx.query('update public.budgets set is_archived = true where id = $1', [first.rows[0].id])
      return insertBudget(tx, { project_id: university.id, name: 'Second' })
    })
    expect(rows).toHaveLength(1)
  })
})

describe('recurring rules', () => {
  it('one occurrence cannot be recorded twice', async () => {
    await expect(
      run(async (tx) => {
        const { rows } = await tx.query(
          `insert into public.recurring_rules
             (project_id, category_id, type, amount_minor, currency, title, frequency, start_date)
           values ($1, $2, 'expense', 100, 'BDT', 'Rent', 'monthly', '2026-11-01') returning id`,
          [university.id, foodUni],
        )
        const fields = {
          project_id: university.id,
          category_id: foodUni,
          recurring_rule_id: rows[0].id,
          occurrence_date: '2026-11-01',
        }
        await insertTransaction(tx, fields)
        await insertTransaction(tx, fields)
      }),
    ).rejects.toThrow(/duplicate key/)
  })

  it('a rule by itself creates no transaction, and deleting it keeps recorded ones', async () => {
    const result = await run(async (tx) => {
      const p = await createProject(tx, 'Rule Project')
      const c = await categoryId(tx, p.id)
      const { rows } = await tx.query(
        `insert into public.recurring_rules
           (project_id, category_id, type, amount_minor, currency, title, frequency, start_date)
         values ($1, $2, 'expense', 100, 'BDT', 'Rent', 'monthly', '2026-11-01') returning id`,
        [p.id, c],
      )
      const count = async () =>
        (await tx.query('select count(*)::int as n from public.transactions where project_id = $1', [p.id])).rows[0].n
      const afterRule = await count()
      const recorded = await insertTransaction(tx, {
        project_id: p.id, category_id: c, recurring_rule_id: rows[0].id, occurrence_date: '2026-11-01',
      })
      await tx.query('delete from public.recurring_rules where id = $1', [rows[0].id])
      const { rows: kept } = await tx.query('select recurring_rule_id from public.transactions where id = $1', [recorded.id])
      return { afterRule, afterDelete: await count(), link: kept[0].recurring_rule_id }
    })
    expect(result).toEqual({ afterRule: 0, afterDelete: 1, link: null })
  })
})
