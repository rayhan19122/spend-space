-- Row Level Security is the authorization layer for SpendSpace.
--
-- (select auth.uid()) is wrapped so Postgres evaluates it once per query rather than per row.
-- Supabase's default privileges grant table access to anon, so it is revoked explicitly.

alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.categories      enable row level security;
alter table public.transactions    enable row level security;
alter table public.budgets         enable row level security;
alter table public.recurring_rules enable row level security;

-- Deliberately not FORCE: API roles never own these tables, and the sign-up trigger
-- (security definer, running as owner) needs to write the first profile row.

-- Profiles: rows are created by the sign-up trigger and removed with the auth user.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Projects
create policy projects_select_own on public.projects
  for select to authenticated using (user_id = (select auth.uid()));
create policy projects_insert_own on public.projects
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy projects_update_own on public.projects
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy projects_delete_own on public.projects
  for delete to authenticated using (user_id = (select auth.uid()));

-- Categories
create policy categories_select_own on public.categories
  for select to authenticated using (user_id = (select auth.uid()));
create policy categories_insert_own on public.categories
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy categories_update_own on public.categories
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy categories_delete_own on public.categories
  for delete to authenticated using (user_id = (select auth.uid()));

-- Transactions
create policy transactions_select_own on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy transactions_insert_own on public.transactions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy transactions_update_own on public.transactions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy transactions_delete_own on public.transactions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Budgets
create policy budgets_select_own on public.budgets
  for select to authenticated using (user_id = (select auth.uid()));
create policy budgets_insert_own on public.budgets
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy budgets_update_own on public.budgets
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy budgets_delete_own on public.budgets
  for delete to authenticated using (user_id = (select auth.uid()));

-- Recurring rules
create policy recurring_rules_select_own on public.recurring_rules
  for select to authenticated using (user_id = (select auth.uid()));
create policy recurring_rules_insert_own on public.recurring_rules
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy recurring_rules_update_own on public.recurring_rules
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy recurring_rules_delete_own on public.recurring_rules
  for delete to authenticated using (user_id = (select auth.uid()));

-- Privileges -------------------------------------------------------------------

revoke all on table
  public.profiles, public.projects, public.categories,
  public.transactions, public.budgets, public.recurring_rules
from anon, public;

revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, default_currency, date_format, theme, landing_page)
  on table public.profiles to authenticated;

grant select, insert, update, delete on table
  public.projects, public.categories, public.transactions,
  public.budgets, public.recurring_rules
to authenticated;

-- Functions: trigger functions are never callable as API endpoints.
revoke all on function
  public.set_updated_at(), public.handle_new_user(), public.apply_project_rules(),
  public.protect_project_currency(), public.check_budget_category()
from public, anon, authenticated;

revoke all on function public.create_project(text, text, text, text, text, boolean, bigint, text, date, date)
  from public, anon;
grant execute on function public.create_project(text, text, text, text, text, boolean, bigint, text, date, date)
  to authenticated;

revoke all on function public.reset_my_data() from public, anon;
grant execute on function public.reset_my_data() to authenticated;
