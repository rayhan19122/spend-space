# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SpendSpace is a personal, manual expense tracker organised around **Projects** (spaces). Every transaction
belongs to exactly one project. It is built with React 19, Vite, Tailwind CSS 4, React Router 7, TanStack
Query and Recharts. The backend is Supabase (Postgres, Auth and RLS) and the site is deployed on Vercel.
It is written in JavaScript, not TypeScript. Product decisions and the schema are described in
`docs/ARCHITECTURE.md`.

## Commands

```bash
npm run dev                # Vite dev server (needs .env; without it the app shows "Setup required")
npm run lint               # ESLint (react, hooks, jsx-a11y, react-refresh)
npm test                   # Vitest: unit + database tests (tests/**/*.test.js)
npx vitest run tests/unit/money.test.js     # single file
npx vitest run -t "name of test"            # single test by name
npm run build              # production build into dist/
npm run verify:isolation   # two-user RLS check against the real Supabase project (needs .env.isolation)
```

Before pushing, run `lint`, `test` and `build`, and make sure all three pass. Vercel auto-deploys `main`.

## Architecture

**Layering is one-way: pages → hooks → services → Supabase.** Components and pages never import the
Supabase client.
- `src/services/*` is the only code that queries Supabase. Use `unwrap()` to throw on errors.
- Use `fetchAll()` from `services/client.js` for anything aggregated. It pages past the API's
  1,000-row cap, and a plain select would silently truncate totals.
- `src/hooks/useData.js` holds the React Query hooks, plus `useWrite` for mutations (toast and invalidation).
  - **Every query key starts with the user ID, and includes the project ID where relevant.**
  - Previous data is deliberately not kept across key changes, so switching projects shows a skeleton,
    never the last project's numbers.
- `src/utils/*` holds pure, unit-tested logic: money parsing and formatting, date presets, analytics
  aggregation, budget windows, recurrence and CSV. Aggregation happens in JS over integer rows, not in SQL.

**Money:** amounts are `amount_minor bigint` integer minor units (৳500.25 → `50025`).
- Never use floats for money. Parse and format through `utils/money.js`.
- Totals are never added across currencies; there is no conversion. Global views pick one currency at a
  time (`useCurrencyScope` and `CurrencyScope`) and say what was excluded.
- A transaction's currency is set by the database from its project.
- A project's currency is locked once the project has records.

**Dates** are calendar `date` values (ISO `yyyy-MM-dd` strings), never timestamps. This avoids UTC
day-shifting.

**The database enforces the rules, not the app** (`supabase/migrations/`, applied in order):
- RLS on every table, with separate select, insert, update and delete policies on `user_id = auth.uid()`.
  `anon` has no table privileges.
- Composite foreign keys tie a transaction to the same user's project and to a category with the same
  project, user and type.
- Triggers make archived projects read-only, set currency, and create the `profiles` row on sign-up.
- `unique (recurring_rule_id, occurrence_date)` prevents an occurrence from being recorded twice.

**Tests:**
- `tests/db/` runs the real migrations on PGlite (Postgres in WASM). `harness.js` stubs the Supabase roles,
  the `auth` schema and default grants, so RLS behaves as it does in Supabase. Any schema change must keep
  `isolation.test.js` and `constraints.test.js` passing.
- `tests/e2e/driver.js` is an in-page browser driver used for manual flow checks, not a Vitest suite.

**UI conventions:**
- Theme tokens are CSS variables on `:root` and `.dark` in `src/index.css`, exposed through Tailwind
  `@theme`. Use token classes (`bg-surface`, `text-ink-2`, `border-line`, `bg-primary-soft`, …), not raw
  colours.
- Shared class strings (buttons, inputs, `cardClass`) live in `components/common/styles.js`.
- Helper classes: `.bg-hero`, `.bg-brand`, `.glass`, `.lift`, `.fade-up`, `.font-display`.
- Layout: below `lg` (1024px) there is a top bar and a bottom nav with a central **+**. From `lg` up there
  is a fixed sidebar. The transactions table shows from `md`; phones get card rows.
- Responsive pitfalls already hit in this codebase:
  - `hidden` loses to the button base class `inline-flex`. Use `max-lg:hidden` or `max-sm:hidden` instead.
  - Grid children with truncating text need `min-w-0` (and `grid-cols-1` on phones), or they overflow.
  - Don't put `overflow-hidden` on a card that contains a `Menu`. `.fade-up` and `.lift` cards create
    stacking contexts; `index.css` raises a card while its menu is open, and `Menu` flips sides to stay
    on screen.
- Fonts are bundled locally (`@fontsource-variable/*`), because the CSP in `vercel.json` allows only
  `font-src 'self'`. Adding any external script, font or API origin requires updating that CSP.

## Security rules for this repo

- Only the publishable or anon key may reach the browser (`VITE_SUPABASE_URL` plus
  `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`). `src/lib/supabase.js` refuses to start
  with a secret or service-role key. Never put one in a `VITE_` variable.
- Migrations are not re-runnable over existing data. Add new migration files rather than editing applied
  ones, and get confirmation before anything destructive.
- `ProtectedRoute` is a UX guard only; RLS is the security boundary.
