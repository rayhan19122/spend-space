-- SpendSpace core schema.
--
-- Money is stored as integer minor units (amount_minor bigint): ৳500.25 = 50025.
-- Requires Postgres 15+ for ON DELETE SET NULL (column).
--
-- Isolation is enforced with composite foreign keys that include user_id:
-- a row physically cannot reference a project or category with a different owner.

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  display_name     text check (char_length(display_name) <= 80),
  default_currency text not null default 'BDT' check (default_currency ~ '^[A-Z]{3}$'),
  date_format      text not null default 'd MMM yyyy'
                   check (date_format in ('d MMM yyyy', 'MMM d, yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd')),
  theme            text not null default 'system' check (theme in ('light', 'dark', 'system')),
  landing_page     text not null default '/'
                   check (landing_page in ('/', '/projects', '/transactions')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (char_length(description) <= 280),
  notes       text check (char_length(notes) <= 5000),
  icon        text not null default 'folder' check (char_length(icon) <= 40),
  color       text not null default '#2563eb' check (color ~ '^#[0-9a-fA-F]{6}$'),
  currency    text not null default 'BDT' check (currency ~ '^[A-Z]{3}$'),
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Target for composite foreign keys from child tables.
  unique (id, user_id)
);

create unique index projects_user_name_key on public.projects (user_id, lower(btrim(name)));
create index projects_user_active_idx on public.projects (user_id, is_archived);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  project_id  uuid not null,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  type        text not null check (type in ('income', 'expense')),
  icon        text not null default 'tag' check (char_length(icon) <= 40),
  color       text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  unique (id, project_id, user_id, type),
  unique (id, project_id, user_id)
);

create unique index categories_project_type_name_key
  on public.categories (project_id, type, lower(btrim(name)));
create index categories_user_idx on public.categories (user_id);

create table public.recurring_rules (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid(),
  project_id     uuid not null,
  category_id    uuid not null,
  type           text not null check (type in ('income', 'expense')),
  amount_minor   bigint not null check (amount_minor between 1 and 1000000000000),
  currency       text not null check (currency ~ '^[A-Z]{3}$'),
  title          text not null check (char_length(btrim(title)) between 1 and 120),
  notes          text check (char_length(notes) <= 2000),
  payment_method text not null default 'cash'
                 check (payment_method in ('cash', 'card', 'bank_transfer', 'mobile_banking', 'other')),
  frequency      text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  start_date     date not null,
  end_date       date,
  next_due_date  date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  foreign key (category_id, project_id, user_id, type)
    references public.categories (id, project_id, user_id, type),
  unique (id, project_id, user_id)
);

create index recurring_rules_user_idx on public.recurring_rules (user_id, is_active, next_due_date);
create index recurring_rules_project_idx on public.recurring_rules (project_id);
create index recurring_rules_category_idx on public.recurring_rules (category_id);

create table public.transactions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid(),
  project_id        uuid not null,
  category_id       uuid not null,
  type              text not null check (type in ('income', 'expense')),
  amount_minor      bigint not null check (amount_minor between 1 and 1000000000000),
  currency          text not null check (currency ~ '^[A-Z]{3}$'),
  title             text not null check (char_length(btrim(title)) between 1 and 120),
  notes             text check (char_length(notes) <= 2000),
  transaction_date  date not null check (transaction_date between '1970-01-01' and '2100-12-31'),
  payment_method    text not null default 'cash'
                    check (payment_method in ('cash', 'card', 'bank_transfer', 'mobile_banking', 'other')),
  recurring_rule_id uuid,
  occurrence_date   date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Must be this user's project.
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  -- Category must be in the same project, same owner, same income/expense type.
  foreign key (category_id, project_id, user_id, type)
    references public.categories (id, project_id, user_id, type),
  -- Deleting a rule keeps the money already recorded.
  foreign key (recurring_rule_id, project_id, user_id)
    references public.recurring_rules (id, project_id, user_id)
    on delete set null (recurring_rule_id),
  -- One occurrence of a rule can only be recorded once.
  unique (recurring_rule_id, occurrence_date)
);

create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc);
create index transactions_project_date_idx on public.transactions (project_id, transaction_date desc);
create index transactions_category_idx on public.transactions (category_id);

create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid(),
  project_id   uuid not null,
  category_id  uuid, -- null = whole-project budget
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  amount_minor bigint not null check (amount_minor between 1 and 1000000000000),
  currency     text not null check (currency ~ '^[A-Z]{3}$'),
  period       text not null check (period in ('weekly', 'monthly', 'custom')),
  start_date   date not null,
  end_date     date,
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check (period <> 'custom' or end_date is not null),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  foreign key (category_id, project_id, user_id)
    references public.categories (id, project_id, user_id)
);

-- Two active monthly budgets for the same scope would double-count spending in summaries.
create unique index budgets_one_active_per_scope_key
  on public.budgets (project_id, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid), period)
  where not is_archived and period <> 'custom';
create index budgets_user_idx on public.budgets (user_id, is_archived);
create index budgets_category_idx on public.budgets (category_id);
