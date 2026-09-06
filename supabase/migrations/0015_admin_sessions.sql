-- Admin single-session enforcement

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  created_at timestamptz default now(),
  last_seen timestamptz default now()
);

create index if not exists idx_admin_sessions_user_id on public.admin_sessions(user_id);
create index if not exists idx_admin_sessions_session_id on public.admin_sessions(session_id);

alter table public.admin_sessions enable row level security;

create policy "Users can view own admin sessions"
  on public.admin_sessions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own admin sessions"
  on public.admin_sessions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own admin sessions"
  on public.admin_sessions
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own admin sessions"
  on public.admin_sessions
  for delete
  using (auth.uid() = user_id);
