# Deployment guide: GitHub + Vercel

Do [SUPABASE_SETUP.md](SUPABASE_SETUP.md) first, and make sure these pass locally:

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run build
```

## Part 1 — GitHub

The repository is `https://github.com/rayhan19122/spend-space`.

First time only, from the project folder:

```bash
git init
```

```bash
git status
```

Check that `.env` is **not** listed (it is in `.gitignore`). Only `.env.example` and `.env.isolation.example` should appear.

```bash
git add .
```

```bash
git commit -m "Initial commit"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/rayhan19122/spend-space.git
```

```bash
git push -u origin main
```

Pushing future changes:

```bash
git add .
```

```bash
git commit -m "Describe what changed"
```

```bash
git push
```

## Part 2 — Vercel

1. Go to <https://vercel.com/new> and sign in with GitHub.
2. **Import** the `spend-space` repository (grant Vercel access to it if it is not listed).
3. **Framework Preset**: Vite (detected automatically).
4. **Build Command**: `npm run build`. **Output Directory**: `dist`. **Install Command**: default.
5. **Environment Variables**, add both (for Production, Preview and Development):
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your publishable key (or `VITE_SUPABASE_ANON_KEY` with a legacy anon key)

   Never add the secret / service_role key.
6. Click **Deploy** and wait for it to finish.

## Part 3 — Point Supabase Auth at the deployed site

In Supabase **Authentication → URL Configuration**:

- **Site URL**: your production URL, for example `https://spend-space.vercel.app`
- **Redirect URLs**: add `https://spend-space.vercel.app/**` (keep `http://localhost:5173/**` for local work)

Without this, confirmation and password-reset links will send users to the wrong place.

## Part 4 — Verify production

Do not assume the deploy worked until you have checked:

1. Open the deployed URL. You should see the SpendSpace sign-in page, not "Setup required".
   ("Setup required" means an environment variable is missing or wrong; see below.)
2. Sign up or sign in.
3. Create a project, add an expense, reload the page: the data is still there.
4. Open the site on your phone and sign in: the same data appears.
5. Deep links work: open `https://<your-domain>/projects` directly and reload. (`vercel.json` rewrites all paths to the app.)
6. Request a password reset and confirm the email link opens `/reset-password` on your domain.

## Automatic deployments

Every `git push` to `main` triggers a new production deployment. Pushes to other branches and pull
requests get their own preview URLs.

## Changing environment variables

Vite bakes `VITE_` variables into the JavaScript at build time. After changing one in
**Vercel → Project → Settings → Environment Variables**, go to **Deployments**, open the latest one,
and click **⋯ → Redeploy**. The old build keeps the old values until you redeploy.

## Security headers

`vercel.json` sets a Content Security Policy that only allows network connections to the app itself and
`*.supabase.co`. If you use a custom Supabase domain, add it to `connect-src` in `vercel.json`.
