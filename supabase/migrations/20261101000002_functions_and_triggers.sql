-- Triggers and RPC functions. All run as the calling user (RLS applies) except
-- handle_new_user, which must write a profile before the user has a session.
--
-- Errors raised here use short tokens ('project_archived') that the frontend maps
-- to friendly text, so raw database wording never reaches the UI.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();
create trigger recurring_rules_set_updated_at before update on public.recurring_rules
  for each row execute function public.set_updated_at();

-- Profile initialization -------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(btrim(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80)), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users who signed up before this migration ran.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Project rules for child records ----------------------------------------------

-- Takes the currency from the project and blocks writes to archived projects.
create or replace function public.apply_project_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  project_currency text;
  project_archived boolean;
begin
  select p.currency, p.is_archived
    into project_currency, project_archived
    from public.projects p
   where p.id = new.project_id and p.user_id = new.user_id;

  if not found then
    raise exception 'project_not_found' using errcode = '23503';
  end if;

  if project_archived then
    raise exception 'project_archived';
  end if;

  if tg_op = 'INSERT' then
    new.currency := project_currency;
  elsif new.currency is distinct from project_currency then
    -- Moving 50000 minor units from BDT to JPY would change its meaning.
    raise exception 'currency_mismatch';
  end if;

  return new;
end;
$$;

create trigger transactions_apply_project_rules
  before insert or update on public.transactions
  for each row execute function public.apply_project_rules();
create trigger budgets_apply_project_rules
  before insert or update on public.budgets
  for each row execute function public.apply_project_rules();
create trigger recurring_rules_apply_project_rules
  before insert or update on public.recurring_rules
  for each row execute function public.apply_project_rules();

-- A project's currency cannot change once amounts have been stored against it.
create or replace function public.protect_project_currency()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.currency is distinct from old.currency and (
    exists (select 1 from public.transactions t where t.project_id = old.id)
    or exists (select 1 from public.budgets b where b.project_id = old.id)
    or exists (select 1 from public.recurring_rules r where r.project_id = old.id)
  ) then
    raise exception 'currency_locked';
  end if;
  return new;
end;
$$;

create trigger projects_protect_currency
  before update on public.projects
  for each row execute function public.protect_project_currency();

-- Budgets count expenses only, so a budget cannot target an income category.
create or replace function public.check_budget_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.categories c
     where c.id = new.category_id and c.user_id = new.user_id and c.type = 'expense'
  ) then
    raise exception 'budget_category_not_expense';
  end if;
  return new;
end;
$$;

create trigger budgets_check_category
  before insert or update on public.budgets
  for each row execute function public.check_budget_category();

-- RPC: create a project, its categories and an optional budget atomically ------

create or replace function public.create_project(
  p_name text,
  p_description text default null,
  p_icon text default 'folder',
  p_color text default '#2563eb',
  p_currency text default 'BDT',
  p_seed_categories boolean default true,
  p_budget_minor bigint default null,
  p_budget_period text default 'monthly',
  p_budget_start date default null,
  p_budget_end date default null
)
returns public.projects
language plpgsql
set search_path = ''
as $$
declare
  created public.projects;
begin
  insert into public.projects (name, description, icon, color, currency)
  values (btrim(p_name), nullif(btrim(p_description), ''), p_icon, p_color, p_currency)
  returning * into created;

  if p_seed_categories then
    insert into public.categories (user_id, project_id, name, type, icon, color)
    select created.user_id, created.id, d.name, d.type, d.icon, d.color
    from (values
      ('Food',          'expense', 'utensils',        '#ea580c'),
      ('Groceries',     'expense', 'shopping-basket', '#65a30d'),
      ('Transport',     'expense', 'bus',             '#0284c7'),
      ('Education',     'expense', 'graduation-cap',  '#7c3aed'),
      ('Shopping',      'expense', 'shopping-bag',    '#db2777'),
      ('Health',        'expense', 'heart-pulse',     '#dc2626'),
      ('Bills',         'expense', 'receipt',         '#ca8a04'),
      ('Entertainment', 'expense', 'clapperboard',    '#9333ea'),
      ('Travel',        'expense', 'plane',           '#0891b2'),
      ('Housing',       'expense', 'house',           '#4f46e5'),
      ('Personal Care', 'expense', 'sparkles',        '#c026d3'),
      ('Other',         'expense', 'tag',             '#64748b'),
      ('Salary',        'income',  'briefcase',       '#059669'),
      ('Freelance',     'income',  'laptop',          '#0d9488'),
      ('Allowance',     'income',  'wallet',          '#2563eb'),
      ('Gift',          'income',  'gift',            '#db2777'),
      ('Refund',        'income',  'rotate-ccw',      '#7c3aed'),
      ('Other',         'income',  'tag',             '#64748b')
    ) as d (name, type, icon, color);
  end if;

  if p_budget_minor is not null then
    insert into public.budgets
      (user_id, project_id, name, amount_minor, currency, period, start_date, end_date)
    values (
      created.user_id, created.id,
      initcap(p_budget_period) || ' budget',
      p_budget_minor, created.currency, p_budget_period,
      coalesce(p_budget_start, current_date), p_budget_end
    );
  end if;

  return created;
end;
$$;

-- RPC: erase all of the caller's financial data but keep the account -----------

create or replace function public.reset_my_data()
returns void
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  -- Categories, transactions, budgets and rules cascade from projects.
  delete from public.projects where user_id = auth.uid();
end;
$$;
