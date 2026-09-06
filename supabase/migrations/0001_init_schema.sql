-- 0001_init_schema.sql
-- Schema inicial do Fintax Finanças (Asaas + Gemini).
-- Aplicado em supabase init. Idempotente onde possível.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron" with schema extensions;
create extension if not exists "pg_net" with schema extensions;

-- =========================
-- ENUMS
-- =========================
do $$ begin
  create type app_role as enum ('user', 'premium', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_type as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_status as enum ('pending', 'confirmed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type recurrence_type as enum ('none', 'daily', 'weekly', 'monthly', 'yearly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_type as enum ('checking', 'savings', 'credit_card', 'cash', 'investment', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_plan as enum ('free', 'pro', 'family');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pix_payment_status as enum ('pending', 'confirmed', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type investment_type as enum ('stock', 'fii', 'crypto', 'fixed_income', 'treasury', 'etf', 'bdr', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active', 'overdue', 'canceled', 'expired');
exception when duplicate_object then null; end $$;

-- =========================
-- TABELAS
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  currency text default 'BRL',
  date_format text default 'DD/MM/YYYY',
  cpf text unique,
  rg text,
  phone text,
  brapi_api_key text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  role app_role not null default 'user',
  is_super_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  plan subscription_plan not null default 'free',
  status subscription_status not null default 'active',
  asaas_customer_id text,
  asaas_subscription_id text,
  is_grace_license boolean default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type account_type not null,
  balance numeric(15,2) default 0,
  color text,
  icon text,
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  type transaction_type not null,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  description text not null,
  amount numeric(15,2) not null,
  type transaction_type not null,
  status transaction_status default 'confirmed',
  date date not null default current_date,
  recurrence recurrence_type default 'none',
  notes text,
  receipt_url text,
  is_paid boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  target_amount numeric(15,2) not null,
  current_amount numeric(15,2) default 0,
  target_date date,
  category_id uuid references public.categories(id) on delete set null,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  amount numeric(15,2) not null,
  month int not null,
  year int not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, category_id, month, year)
);

create table if not exists public.family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  invite_code text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.family_groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  created_at timestamptz default now(),
  unique(group_id, user_id)
);

create table if not exists public.goal_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  frequency text not null,
  day_of_week int,
  day_of_month int,
  next_reminder_at timestamptz,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.goal_auto_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  amount numeric(15,2) not null,
  frequency text not null,
  next_run_at timestamptz,
  active boolean default true,
  last_run_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id),
  action text not null,
  target_type text,
  target_id text,
  details JSONB,
  created_at timestamptz default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  discount_type text not null,
  discount_value numeric(15,2) not null,
  max_uses int,
  current_uses int default 0,
  valid_until timestamptz,
  active boolean default true,
  asaas_coupon_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  subject text not null,
  status text default 'active',
  priority text default 'medium',
  admin_seen_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.support_tickets(id) on delete cascade,
  user_id uuid references auth.users(id),
  message text not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  event_name text not null,
  event_data JSONB,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  type text,
  read boolean default false,
  data JSONB,
  created_at timestamptz default now()
);

create table if not exists public.pix_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  asaas_payment_id text,
  asaas_customer_id text,
  amount numeric(15,2) not null,
  status pix_payment_status default 'pending',
  pix_code text,
  pix_qr_code text,
  expiration_date timestamptz,
  confirmed_at timestamptz,
  confirmed_by text,
  plan subscription_plan,
  coupon_id uuid references public.coupons(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value JSONB,
  updated_at timestamptz default now()
);

create table if not exists public.brokers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.investment_portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  broker_id uuid references public.brokers(id) on delete set null,
  shared_with_family boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references public.investment_portfolios(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  ticker text not null,
  type investment_type not null,
  quantity numeric(15,6) not null,
  purchase_price numeric(15,2),
  current_price numeric(15,2),
  purchase_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.investment_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  portfolio_id uuid references public.investment_portfolios(id) on delete cascade,
  total_value numeric(15,2),
  snapshot_date date not null,
  created_at timestamptz default now()
);

create table if not exists public.investment_price_history (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  price numeric(15,2) not null,
  date date not null,
  created_at timestamptz default now(),
  unique(ticker, date)
);

create table if not exists public.quote_cache (
  id uuid primary key default gen_random_uuid(),
  ticker text unique not null,
  price numeric(15,2),
  data JSONB,
  updated_at timestamptz default now()
);

create table if not exists public.family_pending_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.family_groups(id) on delete cascade,
  email text not null,
  invited_by uuid references auth.users(id),
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.downgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  from_plan subscription_plan,
  to_plan subscription_plan,
  status text default 'pending',
  requested_at timestamptz default now(),
  processed_at timestamptz
);

create table if not exists public.asaas_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique,
  event_type text not null,
  payload JSONB,
  processed boolean default false,
  created_at timestamptz default now()
);

-- =========================
-- HELPER FUNCTIONS
-- =========================
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_group_member(_user_id uuid, _group_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.family_members
    where user_id = _user_id and group_id = _group_id
  );
$$;

create or replace function public.is_group_admin(_user_id uuid, _group_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.family_members
    where user_id = _user_id and group_id = _group_id and role = 'admin'
  );
$$;

create or replace function public.get_group_by_invite_code(code text)
returns setof public.family_groups language sql security definer stable as $$
  select * from public.family_groups where invite_code = code;
$$;

create or replace function public.check_cpf_exists(p_cpf text, p_user_id uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where cpf = p_cpf and id <> p_user_id);
$$;

create or replace function public.log_admin_action(
  p_action text, p_target_type text, p_target_id text, p_details JSONB
) returns void language plpgsql security definer as $$
begin
  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_details);
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  insert into public.subscriptions (user_id, plan, status) values (new.id, 'free', 'active');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.update_account_balance()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    if new.type = 'income' and new.status = 'confirmed' then
      update public.accounts set balance = balance + new.amount where id = new.account_id;
    elsif new.type = 'expense' and new.status = 'confirmed' then
      update public.accounts set balance = balance - new.amount where id = new.account_id;
    end if;
  elsif (tg_op = 'UPDATE') then
    if old.type = 'income' and old.status = 'confirmed' then
      update public.accounts set balance = balance - old.amount where id = old.account_id;
    elsif old.type = 'expense' and old.status = 'confirmed' then
      update public.accounts set balance = balance + old.amount where id = old.account_id;
    end if;
    if new.type = 'income' and new.status = 'confirmed' then
      update public.accounts set balance = balance + new.amount where id = new.account_id;
    elsif new.type = 'expense' and new.status = 'confirmed' then
      update public.accounts set balance = balance - new.amount where id = new.account_id;
    end if;
  elsif (tg_op = 'DELETE') then
    if old.type = 'income' and old.status = 'confirmed' then
      update public.accounts set balance = balance - old.amount where id = old.account_id;
    elsif old.type = 'expense' and old.status = 'confirmed' then
      update public.accounts set balance = balance + old.amount where id = old.account_id;
    end if;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_update_balance_insert on public.transactions;
drop trigger if exists trg_update_balance_update on public.transactions;
drop trigger if exists trg_update_balance_delete on public.transactions;
create trigger trg_update_balance_insert after insert on public.transactions
  for each row execute function public.update_account_balance();
create trigger trg_update_balance_update after update on public.transactions
  for each row execute function public.update_account_balance();
create trigger trg_update_balance_delete after delete on public.transactions
  for each row execute function public.update_account_balance();

create or replace function public.add_owner_as_admin()
returns trigger language plpgsql security definer as $$
begin
  insert into public.family_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_family_group_created on public.family_groups;
create trigger on_family_group_created
  after insert on public.family_groups
  for each row execute function public.add_owner_as_admin();

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','subscriptions','transactions','accounts','goals','budgets',
    'family_groups','goal_reminders','coupons','support_tickets',
    'investment_portfolios','investments','admin_settings','pix_payments'
  ] loop
    execute format('drop trigger if exists trg_updated_at_%1$s on public.%1$s', t);
    execute format('create trigger trg_updated_at_%1$s before update on public.%1$s for each row execute function public.update_updated_at_column()', t);
  end loop;
end $$;