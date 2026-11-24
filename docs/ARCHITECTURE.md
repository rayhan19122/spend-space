# SpendSpace — Product and Architecture Plan

*Every expense has its place.*

## 1. Product requirements

**Who it is for:** one person tracking their own money by hand, on a laptop and a phone.

**Core concept:** a **Project** (space) is an independent container with its own income, expenses,
transactions, categories, budgets, notes and reports. Every transaction belongs to exactly one project.

**Questions the app must answer**

| Question | Where |
| --- | --- |
| How much did I spend? | Dashboard, project overview, reports |
| Where did my money go? | Spending by category / by project |
| How much in each project? | Dashboard, Projects page, reports |
| How much in each category? | Project overview, reports |
| How much budget remains? | Budgets, project cards, project overview |
| How much did I receive? | Income totals everywhere totals appear |
| What are my largest expenses? | Reports |
| How has my spending changed? | Trend charts (daily / weekly / monthly) |

**Out of scope:** bank connections, payment processing, shared projects, currency conversion, receipts,
offline mode.

### Product decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Category scope | **Per project** | The brief says each project has its own categories. Each new project can start with the suggested set. Scope is enforced by the database. |
| Money storage | **Integer minor units** (`amount_minor bigint`) | ৳500.25 is stored as `50025`. No floats anywhere. Parsing is string-based. |
| Mixed currencies | **Totals are never added across currencies** | There is no conversion, so ৳ + $ would be a wrong number. Global views show one currency at a time and say what was left out. |
| Project currency | **Locked once the project has records** | Changing it would silently reinterpret every stored amount. |
| Transaction currency | **Set by the database from the project** | The client cannot store a mismatched currency. |
| Dates | **Calendar dates (`date`), never timestamps** | A 1 a.m. expense in Dhaka must not land on the previous day through UTC conversion. |
| Archived projects | **Read-only, hidden by default** | Enforced in the database, not only hidden in the UI. |
| Deleting a project | **Permanent, cascades, typed-name confirmation** | Archive is offered as the safe alternative. |
| Deleting a category | **Only if unused; otherwise archive** | History must stay intact. |
| Recurring rules | **User records each occurrence** | There is no scheduled job, and a rule existing does not mean a payment was made. |
| Aggregation | **Pure, tested JS functions over integer rows** | One tested source of truth. Row fetching pages past the API's 1,000-row limit. |

## 2. User journeys

1. **First run:** sign up → confirm email (if enabled) → empty dashboard → create first project → add first expense.
2. **Daily capture (phone):** open app → tap **+** → amount, title, category → save (under 10 seconds).
3. **Project review:** Projects → open University → see totals, budget left, categories, recent activity → change date range.
4. **Budgeting:** project → Budgets → monthly ৳12,000 → watch the bar → over-budget warning when exceeded.
5. **Month-end review:** Reports → last month → by project and category → export CSV.
6. **Finishing a project:** trip ends → archive → it leaves active lists → restore or read it from the archive.
7. **Recovering access:** forgot password → email link → set new password.

## 3. Page and component structure

```text
/login  /signup  /forgot-password  /reset-password        public, no financial data
/                     Dashboard (combined totals)
/projects             Project cards, active / archived
/projects/:id         Project layout, re-keyed on project ID
   (index)            Overview
   /transactions      /categories  /budgets  /reports  /settings
/transactions         Global list with filters
/recurring            Recurring rules and due occurrences
/budgets              All budgets, grouped by project
/reports              Global analytics
/settings             Profile, preferences, data, security
```

```text
src/
├── components/{common,layout,dashboard,projects,transactions,categories,budgets,recurring,reports,charts,search}/
├── pages/            Route-level screens, thin
├── hooks/            React Query hooks; keys always include user ID and project ID
├── services/         The only code that talks to Supabase
├── utils/            Pure, tested logic: money, dates, analytics, budgets, recurrence, CSV
├── context/          Auth, theme, toast, quick add
└── lib/supabase.js   Client, and refuses to start with a secret key
```

Layering is one-way: **pages → hooks → services → Supabase**. Components never import the Supabase client.

## 4. Database design

```text
auth.users 1─1 profiles
auth.users 1─* projects 1─* categories
                        1─* transactions *─1 categories
                        1─* budgets      *─0..1 categories
                        1─* recurring_rules 1─* transactions (recorded occurrences)
```

| Table | Key columns |
| --- | --- |
| `profiles` | `id`, `display_name`, `default_currency`, `date_format`, `theme`, `landing_page` |
| `projects` | `id`, `user_id`, `name`, `description`, `notes`, `icon`, `color`, `currency`, `is_archived` |
| `categories` | `id`, `user_id`, `project_id`, `name`, `type`, `icon`, `color`, `is_archived` |
| `transactions` | `id`, `user_id`, `project_id`, `category_id`, `type`, `amount_minor`, `currency`, `title`, `notes`, `transaction_date`, `payment_method`, `recurring_rule_id`, `occurrence_date` |
| `budgets` | `id`, `user_id`, `project_id`, `category_id` (null = whole project), `name`, `amount_minor`, `currency`, `period`, `start_date`, `end_date`, `is_archived` |
| `recurring_rules` | `id`, `user_id`, `project_id`, `category_id`, `type`, `amount_minor`, `currency`, `title`, `notes`, `payment_method`, `frequency`, `start_date`, `end_date`, `next_due_date`, `is_active` |

**Consistency comes from composite foreign keys rather than checks in app code:**

- `transactions (project_id, user_id) → projects (id, user_id)`: a row cannot point at another user's project.
- `transactions (category_id, project_id, user_id, type) → categories (id, project_id, user_id, type)`:
  the category must belong to the same project and user, and an expense cannot use an income category.
- `unique (recurring_rule_id, occurrence_date)`: an occurrence cannot be recorded twice.

## 5. Authentication and authorization

- Supabase Auth owns passwords and sessions. The app never sees or stores a password beyond passing it to Supabase.
- The browser holds only the publishable/anon key. `lib/supabase.js` refuses to start if given a secret key.
- A database trigger creates the `profiles` row on sign-up.
- **Row Level Security is the authorization layer.** Each table has separate select, insert, update and delete
  policies on `user_id = auth.uid()`. `anon` has no table privileges at all.
- `ProtectedRoute` is a user-experience guard, not a security boundary.
- On sign-out or session expiry the query cache is cleared, so the next user on a shared browser sees nothing.

## 6. Project isolation rules

1. Every project-scoped query filters by `project_id` **and** `user_id`, with RLS underneath.
2. Query keys contain user ID and project ID, so one project's cache can never answer for another.
3. Project pages are keyed by project ID and do not keep previous data. A switch shows a skeleton, never old numbers.
4. Global views are labelled as combined totals and aggregate one currency at a time.

### Scenario: ৳500 expense in University

I create Personal, University and Travel, then add a ৳500 expense to University.

| View | Result | Why |
| --- | --- | --- |
| University → Transactions | Shows ৳500 | `project_id` matches |
| Personal → Transactions | Does not show it | Query filters on Personal's ID |
| Travel → Transactions | Does not show it | Query filters on Travel's ID |
| Personal / Travel budgets and reports | Unchanged | Same scoped filter |
| University budget | Reduced by ৳500 | Expense inside the window |
| Dashboard "All projects" | Total includes ৳500 | Labelled as a combined total |
| Dashboard filtered to Personal | Excludes it | Only selected projects count |
| Another user | Cannot read it at all | RLS, even with the row's ID |

The row stores `amount_minor = 50000`, `currency = 'BDT'` and one `project_id`, which is `NOT NULL`, so a
transaction cannot exist outside a project or belong to two.

## 7. Responsive design plan

| Width | Layout |
| --- | --- |
| Below 1024px | Compact header, bottom navigation with a central **+**, a "More" sheet for remaining pages |
| 1024px and up | Fixed sidebar, top bar with search, theme and profile menu |

Rules: 44px minimum touch targets on mobile; 16px input text to stop iOS zooming; transaction tables become
cards; dialogs become bottom sheets; charts size to their container; no horizontal page scroll down to 320px.

## 8. Supabase and Vercel deployment plan

1. Create a Supabase project and apply `supabase/migrations/` in order.
2. Set the Site URL and redirect URLs in Supabase Auth.
3. Push to GitHub and import into Vercel with the Vite preset (`npm run build`, output `dist`).
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel.
5. `vercel.json` provides the SPA rewrite and security headers.
6. Run `npm run verify:isolation` against the real project with two test users.

Details: [SUPABASE_SETUP.md](SUPABASE_SETUP.md), [DEPLOYMENT.md](DEPLOYMENT.md).

## 9. Development milestones

| Milestone | Phases | Done when |
| --- | --- | --- |
| Foundation | 1–5 | Migrations pass RLS tests; sign up, sign in and sign out work |
| Core | 6–11 | Project, transaction, category and budget flows work and are isolated |
| Insight | 12–14 | Dashboard, reports and search show correct figures |
| Extras | 15–17 | Recurring rules, export and settings work |
| Hardening | 18–22 | Mobile, accessibility, security audit, calculation tests, code review |
| Release | 23–27 | Build passes, flows re-checked, guides written |

## Testing approach

| Layer | How | Proves |
| --- | --- | --- |
| Pure logic | Vitest | Money, dates, budgets, analytics, CSV |
| Database | Vitest on PGlite (real Postgres in WebAssembly) running the real migrations | RLS, constraints, triggers |
| Whole app | Browser against local Postgres + PostgREST + a stand-in auth server | Real user flows and two-user isolation |
| Real Supabase | `npm run verify:isolation`, run by you after setup | The same isolation on your actual project |
