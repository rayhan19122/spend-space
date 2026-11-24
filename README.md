# SpendSpace

*Every expense has its place.*

SpendSpace is a personal, manual expense tracker organized around **Projects** (spaces). Each project —
Personal, University, Cox's Bazar trip, MacBook savings — has its own income, expenses, categories,
budgets, notes and reports. Every transaction belongs to exactly one project. A global dashboard shows
clearly labelled combined totals across projects.

It runs in the browser on laptop and phone, stores data in Supabase (Postgres + Auth) and deploys on Vercel.
There are no bank connections or payment integrations.

## Features

- **Auth**: sign up, sign in, sign out, password reset, persistent sessions, protected routes.
- **Projects**: create, edit, archive, restore, delete (typed-name confirmation). Icon, color, currency,
  optional starting budget, notes. Archived projects are read-only and live in an archive view.
- **Project workspace**: Overview (income, expenses, net, budget left, category and trend charts, recent
  activity, quick add), Transactions, Categories, Budgets, Reports, Settings.
- **Transactions**: income and expense with category, date, payment method and notes. Edit, delete with
  confirmation, quick add from anywhere (the **+** button).
- **Global transactions**: search, filter by project, category, type, payment method and dates; sort by
  date or amount; paged loading; table on desktop, cards on phone.
- **Categories**: per project, with suggested income and expense sets, icon/color, archive. Used
  categories cannot be deleted, only archived.
- **Budgets**: whole-project or per-category; weekly, monthly or custom range; spent, remaining, % and
  over-budget warnings. Expenses only.
- **Dashboard and Reports**: totals, by project, by category with %, daily/weekly/monthly trends, largest
  expense, most frequent category, highest spending day, average daily spend — filtered by date, project,
  category and type. Insights are hidden when there is not enough data.
- **Search and quick actions**: command palette (`Ctrl/⌘ K`) across transactions, notes, projects and categories.
- **Recurring rules**: weekly, monthly or yearly rules with "record occurrence"; a rule never creates a
  transaction by itself (no scheduled backend job), and an occurrence cannot be recorded twice.
- **Export**: CSV of transactions for any project/date range, project summary CSV, full JSON backup.
- **Settings**: display name, default currency, date format, theme (light/dark/system), landing page,
  password reset, sign out, delete all data.
- **Design**: light/dark themes, responsive shell (sidebar on desktop, bottom navigation on phone),
  keyboard navigable, reduced-motion aware.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19, Vite, JavaScript, Tailwind CSS 4, React Router, TanStack Query |
| Icons / charts | Lucide React, Recharts |
| Dates | date-fns |
| Backend / DB | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth (email + password) |
| Tests | Vitest; database tests run the real migrations on PGlite (Postgres in WebAssembly) |
| Hosting | Vercel |

## Money and currency

- Amounts are stored as **integer minor units** (`amount_minor bigint`): ৳500.25 is `50025`. Parsing and
  totals are integer-only; no floating point is used for money.
- Default currency is **BDT (৳)**; change it in Settings. Each project has one currency, locked once it has
  records. Totals are never added across currencies (there is no conversion): global views show one currency
  at a time and say what was left out.

## Database

```text
auth.users 1─1 profiles
auth.users 1─* projects 1─* categories
                        1─* transactions *─1 categories
                        1─* budgets      *─0..1 categories
                        1─* recurring_rules 1─* transactions (recorded occurrences)
```

Composite foreign keys enforce consistency in the database itself: a transaction cannot point to another
user's project, and its category must belong to the same project, same user and same type (income/expense).
Full details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Migrations: [supabase/migrations](supabase/migrations).

## Security

- RLS is enabled on every table, with separate select/insert/update/delete policies on
  `user_id = auth.uid()`. The `anon` role has no table privileges.
- Ownership columns cannot be changed to another user; archived projects are read-only in the database.
- Only the publishable/anon key reaches the browser; the client refuses to start with a secret key.
- Sign-out and session expiry clear the query cache.
- `tests/db/isolation.test.js` proves two-user isolation against the real migrations; after setting up
  Supabase, `npm run verify:isolation` proves it against your real project.

## Run locally

Requires Node.js 20.6+.

```bash
npm install
```

```bash
cp .env.example .env
```

Fill in `.env` (see [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)), then:

```bash
npm run dev
```

Open <http://localhost:5173>. Without a configured `.env`, the app shows a "Setup required" page.

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run lint` | ESLint |
| `npm test` | Unit + database tests |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run verify:isolation` | Two-user RLS check against your Supabase project |

## Deploy

1. Set up Supabase: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)
2. Push to GitHub and import into Vercel (Vite preset, `npm run build`, output `dist`, add the two
   `VITE_SUPABASE_*` variables): [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
3. Add the Vercel domain to Supabase Auth redirect URLs.

## Known limitations

- Supabase project, migrations, auth settings and Vercel env vars must be set up by hand (guides above).
- No currency conversion: projects in different currencies are totalled separately.
- Recurring rules do not auto-create transactions; you record each occurrence.
- No CSV import (export and JSON backup only).
- Supabase's built-in email sender is heavily rate-limited; configure SMTP for real use.
- Single user per project (no sharing).

## Future upgrades (not implemented)

Shared projects with collaborators, project roles, receipt upload and OCR, CSV bank-statement import,
multi-currency conversion, recurring automation via a scheduled job, PWA/offline mode, monthly insights.

## Project structure

```text
src/
├── components/   common, layout, projects, transactions, budgets, recurring, reports, charts, search, settings
├── pages/        route screens (auth/, project/)
├── hooks/        React Query hooks; keys include user ID and project ID
├── services/     the only code that talks to Supabase
├── utils/        pure, tested logic: money, dates, analytics, budgets, recurrence, CSV
├── context/      auth, theme, toast, quick add
└── lib/          Supabase client
supabase/migrations/   schema, triggers, RLS
tests/            unit/, db/ (PGlite), e2e/ (in-page browser driver used for manual flow checks)
scripts/          verify-isolation.mjs
docs/             architecture, Supabase setup, deployment
```
