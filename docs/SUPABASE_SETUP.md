# Supabase setup guide

This takes about 10 minutes. You need a free Supabase account.

## 1. Create a Supabase project

1. Go to <https://supabase.com/dashboard> and sign in.
2. Click **New project**.
3. Pick a name (for example `spendspace`), set a strong database password (save it in your password
   manager; the app never needs it), and choose the region closest to you (for Bangladesh, **Singapore**).
4. Click **Create new project** and wait until it finishes provisioning.

## 2. Find the project URL

**Project Settings → Data API** (or click **Connect** at the top of the dashboard).
Copy the **Project URL**. It looks like `https://abcdefghijkl.supabase.co`.

## 3. Find the publishable key

**Project Settings → API Keys**.

- Copy the **Publishable key** (starts with `sb_publishable_`). This key is designed to be public.
- Older projects show a **legacy `anon` key** instead (a long `eyJ...` string). That also works.
- **Never** copy the `secret` / `service_role` key into this app. It bypasses all security rules.
  The app refuses to start if it detects one.

## 4. Configure local environment variables

In the project folder:

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
VITE_SUPABASE_URL=https://abcdefghijkl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxx
```

(With a legacy key, use `VITE_SUPABASE_ANON_KEY=eyJ...` instead.) `.env` is git-ignored.

## 5. Apply the SQL migrations

The migrations create every table, constraint, trigger and Row Level Security policy. Run them **in order**:

1. `supabase/migrations/20261101000001_core_schema.sql`
2. `supabase/migrations/20261101000002_functions_and_triggers.sql`
3. `supabase/migrations/20261101000003_row_level_security.sql`

**Option A — SQL Editor (easiest):** in the dashboard open **SQL Editor → New query**, paste the full
contents of file 1, click **Run**, and repeat for files 2 and 3. Each should report "Success. No rows returned".

**Option B — Supabase CLI:**

```bash
npx supabase login
```

```bash
npx supabase link --project-ref abcdefghijkl
```

```bash
npx supabase db push
```

Run the migrations only once on a project. They are not meant to be re-run over existing data.

## 6. Verify RLS is enabled

1. **Table Editor**: each of `profiles`, `projects`, `categories`, `transactions`, `budgets` and
   `recurring_rules` should show no "RLS disabled" / "Unrestricted" warning.
2. Or run this in the SQL Editor; `relrowsecurity` must be `true` for every table:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r';
```

3. **Database → Policies** should list select, insert, update and delete policies for each table.

## 7. Configure authentication

**Authentication → Sign In / Providers → Email**:

- Keep **Email** enabled.
- **Confirm email**: on is recommended. New users must click the link in their inbox before signing in.
  For quick local testing you can switch it off and back on later.
- Set a minimum password length of at least 8.

The built-in Supabase email sender is rate-limited (a few emails per hour). For real use, add your own
SMTP provider under **Authentication → Emails → SMTP Settings**.

## 8. Set allowed redirect URLs

**Authentication → URL Configuration**:

- **Site URL**: `http://localhost:5173` while developing. After deploying, change it to your Vercel URL,
  for example `https://spend-space.vercel.app`.
- **Redirect URLs**, add all of:
  - `http://localhost:5173/**`
  - `https://spend-space.vercel.app/**` (your real Vercel domain)
  - Optional, for Vercel preview deployments: a wildcard for your preview domains, for example
    `https://*-<your-vercel-team>.vercel.app/**` (copy the pattern from a preview URL Vercel gives you)

Confirmation emails return to `/` and password-reset emails return to `/reset-password`. If a URL is not
in this list, Supabase sends the user to the Site URL instead.

## 9. Create a test user

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:5173>, click **Create account**, and sign up. Confirm the email if confirmation is on.
You can also add users in **Authentication → Users → Add user**.

## 10. Verify data persistence

1. Sign in, create a project, add an expense.
2. Check **Table Editor → transactions**: the row is there with `amount_minor` in paisa (৳500 → `50000`).
3. Sign out, sign in on another browser or your phone (after deploying): the same data appears.

## Optional: automated isolation check

This signs in as two throwaway users with only the public key and proves neither can read or change the
other's data. Do not use your real account; the script creates and deletes records.

1. Create two test users (step 9).
2. `cp .env.isolation.example .env.isolation` and fill it in.
3. Run:

```bash
npm run verify:isolation
```

Every line should print `PASS`.
