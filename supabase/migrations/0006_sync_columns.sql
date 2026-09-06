-- 0006_sync_columns.sql
-- Sincroniza colunas que o código legado espera com o schema resetado.

-- accounts.is_active (inverso de is_archived)
alter table public.accounts add column if not exists is_active boolean generated always as (not is_archived) stored;

-- notifications.read -> alias is_read
alter table public.notifications add column if not exists is_read boolean generated always as (read) stored;

-- pix_payments: colunas extras esperadas pelo código
alter table public.pix_payments add column if not exists user_email text;
alter table public.pix_payments add column if not exists interval text;
alter table public.pix_payments add column if not exists coupon_code text;
alter table public.pix_payments add column if not exists notes text;

-- family_groups.description
alter table public.family_groups add column if not exists description text;

-- family_members: joined_at alias de created_at
alter table public.family_members add column if not exists joined_at timestamptz generated always as (created_at) stored;

-- family_pending_invites: user_id e campos de revisão
alter table public.family_pending_invites add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.family_pending_invites add column if not exists reviewed_by uuid references auth.users(id);
alter table public.family_pending_invites add column if not exists reviewed_at timestamptz;

-- downgrade_requests: campos extras
alter table public.downgrade_requests add column if not exists user_email text;
alter table public.downgrade_requests add column if not exists current_plan subscription_plan;
alter table public.downgrade_requests add column if not exists requested_plan subscription_plan;
alter table public.downgrade_requests add column if not exists reason text;
alter table public.downgrade_requests add column if not exists admin_notes text;
alter table public.downgrade_requests add column if not exists created_at timestamptz default now();
alter table public.downgrade_requests add column if not exists updated_at timestamptz default now();

-- investment_portfolios: description
alter table public.investment_portfolios add column if not exists description text;

-- goals: period_type, start_date, end_date, goal_type, is_active
alter table public.goals add column if not exists period_type text default 'monthly';
alter table public.goals add column if not exists start_date date;
alter table public.goals add column if not exists end_date date;
alter table public.goals add column if not exists goal_type text default 'amount';
alter table public.goals add column if not exists is_active boolean generated always as (status = 'active') stored;

-- goal_reminders: is_active (alias de active), updated_at
alter table public.goal_reminders add column if not exists is_active boolean generated always as (active) stored;
alter table public.goal_reminders add column if not exists updated_at timestamptz default now();

-- goal_auto_deposits: is_active, next_execution_at, last_executed_at, day_of_month
alter table public.goal_auto_deposits add column if not exists is_active boolean generated always as (active) stored;
alter table public.goal_auto_deposits add column if not exists next_execution_at timestamptz;
alter table public.goal_auto_deposits add column if not exists last_executed_at timestamptz;
alter table public.goal_auto_deposits add column if not exists day_of_month int;
alter table public.goal_auto_deposits add column if not exists updated_at timestamptz default now();

-- support_tickets: description
alter table public.support_tickets add column if not exists description text;

-- shared_with_family aliases para family sharing
alter table public.transactions add column if not exists is_shared_with_family boolean default false;
alter table public.accounts add column if not exists is_shared_with_family boolean default false;
alter table public.budgets add column if not exists is_shared_with_family boolean default false;

-- ticket_messages: sender_id (alias de user_id)
alter table public.ticket_messages add column if not exists sender_id uuid generated always as (user_id) stored;

-- investments: name, notes
alter table public.investments add column if not exists name text;
alter table public.investments add column if not exists notes text;

-- coupons: valid_from
alter table public.coupons add column if not exists valid_from timestamptz;
alter table public.coupons add column if not exists is_active boolean generated always as (active) stored;
comment on column public.coupons.valid_from is 'data de início da validade do cupom';
comment on column public.coupons.is_active is 'alias de active';

-- notifications: message, link
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists link text;
comment on column public.notifications.message is 'alias de body';
comment on column public.notifications.link is 'URL de destino ao clicar';
comment on column public.notifications.is_read is 'true = notificação lida (alias de read)';
comment on column public.goal_reminders.is_active is 'true = lembrete ativo (alias de active)';
comment on column public.goal_auto_deposits.is_active is 'true = depósito ativo (alias de active)';
