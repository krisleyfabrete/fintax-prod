-- 0002_rls_policies.sql
-- Habilita RLS em todas as tabelas e cria policies de leitura/escrita por dono + admin.

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.budgets enable row level security;
alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;
alter table public.family_pending_invites enable row level security;
alter table public.goal_reminders enable row level security;
alter table public.goal_auto_deposits enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.coupons enable row level security;
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.notifications enable row level security;
alter table public.pix_payments enable row level security;
alter table public.admin_settings enable row level security;
alter table public.brokers enable row level security;
alter table public.investment_portfolios enable row level security;
alter table public.investments enable row level security;
alter table public.investment_snapshots enable row level security;
alter table public.investment_price_history enable row level security;
alter table public.quote_cache enable row level security;
alter table public.downgrade_requests enable row level security;
alter table public.asaas_webhook_events enable row level security;

-- Helper macro (não existe em PG, então replicamos)

-- Profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for select using (public.has_role(auth.uid(), 'admin'));

-- User roles
create policy "Users can view own role" on public.user_roles for select using (auth.uid() = user_id);
create policy "Admins can manage roles" on public.user_roles for all using (public.has_role(auth.uid(), 'admin'));

-- Subscriptions
create policy "Users can view own subscription" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Admins can view all subscriptions" on public.subscriptions for select using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update subscriptions" on public.subscriptions for update using (public.has_role(auth.uid(), 'admin'));

-- Accounts
create policy "Users manage own accounts" on public.accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins can view accounts" on public.accounts for select using (public.has_role(auth.uid(), 'admin'));

-- Categories / subcategories
create policy "Users manage own categories" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Anyone can view default categories" on public.categories for select using (is_default = true);
create policy "Admins can view all categories" on public.categories for select using (public.has_role(auth.uid(), 'admin'));

create policy "Users manage own subcategories" on public.subcategories for all using (
  exists (select 1 from public.categories c where c.id = subcategories.category_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from public.categories c where c.id = subcategories.category_id and c.user_id = auth.uid())
);

-- Transactions
create policy "Users manage own transactions" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins can view transactions" on public.transactions for select using (public.has_role(auth.uid(), 'admin'));

-- Goals
create policy "Users manage own goals" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Budgets
create policy "Users manage own budgets" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Family
create policy "Users can view own groups" on public.family_groups for select using (
  owner_id = auth.uid() or public.is_group_member(auth.uid(), id)
);
create policy "Users can create groups" on public.family_groups for insert with check (owner_id = auth.uid());
create policy "Owner can update group" on public.family_groups for update using (owner_id = auth.uid());
create policy "Owner can delete group" on public.family_groups for delete using (owner_id = auth.uid());

create policy "Members can view group members" on public.family_members for select using (public.is_group_member(auth.uid(), group_id) or user_id = auth.uid());
create policy "Owner can manage members" on public.family_members for all using (
  exists (select 1 from public.family_groups g where g.id = family_members.group_id and g.owner_id = auth.uid())
);

create policy "Pending invites viewable" on public.family_pending_invites for select using (
  exists (select 1 from public.family_groups g where g.id = family_pending_invites.group_id and g.owner_id = auth.uid())
);

-- Reminders / auto-deposits
create policy "Users manage own reminders" on public.goal_reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own auto-deposits" on public.goal_auto_deposits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Admin-only tables
create policy "Admins can view audit logs" on public.admin_audit_logs for select using (public.has_role(auth.uid(), 'admin'));
create policy "Service can insert audit logs" on public.admin_audit_logs for insert with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage coupons" on public.coupons for all using (public.has_role(auth.uid(), 'admin'));
create policy "Anyone can view active coupons" on public.coupons for select using (active = true);

-- Support
create policy "Users manage own tickets" on public.support_tickets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins can manage tickets" on public.support_tickets for all using (public.has_role(auth.uid(), 'admin'));

create policy "Users can view own ticket messages" on public.ticket_messages for select using (
  exists (select 1 from public.support_tickets t where t.id = ticket_messages.ticket_id and t.user_id = auth.uid())
);
create policy "Users can reply own tickets" on public.ticket_messages for insert with check (
  exists (select 1 from public.support_tickets t where t.id = ticket_messages.ticket_id and t.user_id = auth.uid()) and is_admin = false
);
create policy "Admins can manage ticket messages" on public.ticket_messages for all using (public.has_role(auth.uid(), 'admin'));

-- Push
create policy "Users manage own push subs" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Analytics
create policy "Users can insert own events" on public.analytics_events for insert with check (auth.uid() = user_id);
create policy "Admins can view analytics" on public.analytics_events for select using (public.has_role(auth.uid(), 'admin'));

-- Notifications
create policy "Users view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- Pix payments
create policy "Users view own pix" on public.pix_payments for select using (auth.uid() = user_id);
create policy "Admins manage pix" on public.pix_payments for all using (public.has_role(auth.uid(), 'admin'));

-- Admin settings
create policy "Admins manage settings" on public.admin_settings for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Anyone can view pix settings" on public.admin_settings for select using (key in ('pix_key','pix_name','pix_city','plan_prices'));

-- Investments
create policy "Users manage own brokers" on public.brokers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own portfolios" on public.investment_portfolios for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own investments" on public.investments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own snapshots" on public.investment_snapshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Anyone can read price history" on public.investment_price_history for select using (true);
create policy "Service can write price history" on public.investment_price_history for insert with check (true);
create policy "Anyone can read quote cache" on public.quote_cache for select using (true);
create policy "Service can write quote cache" on public.quote_cache for all using (public.has_role(auth.uid(), 'admin'));

-- Downgrade requests
create policy "Users manage own downgrade requests" on public.downgrade_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins manage downgrade requests" on public.downgrade_requests for all using (public.has_role(auth.uid(), 'admin'));

-- Asaas webhook events (service-only)
create policy "Service can write webhook events" on public.asaas_webhook_events for insert with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can view webhook events" on public.asaas_webhook_events for select using (public.has_role(auth.uid(), 'admin'));

-- Storage buckets
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false) on conflict do nothing;

create policy "Users can read avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users can upload own avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can update own avatars" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can read own receipts" on storage.objects for select using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can upload own receipts" on storage.objects for insert with check (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can update own receipts" on storage.objects for update using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can delete own receipts" on storage.objects for delete using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);

-- Realtime
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.support_tickets;
alter publication supabase_realtime add table public.ticket_messages;
alter publication supabase_realtime add table public.notifications;

-- Seed admin_settings defaults
insert into public.admin_settings (key, value) values
  ('pix_key', '"trocar@asaas.com"'::jsonb),
  ('pix_name', '"Fintax Finance"'::jsonb),
  ('pix_city', '"Sao Paulo"'::jsonb),
  ('plan_prices', '{"free":{"monthly":0,"yearly":0},"pro":{"monthly":2990,"yearly":29990},"family":{"monthly":4990,"yearly":49990}}'::jsonb),
  ('trial_days', '30'::jsonb)
on conflict (key) do nothing;