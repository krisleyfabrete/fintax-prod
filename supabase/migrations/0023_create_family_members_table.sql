-- 0023_create_family_members_table.sql
-- Create family_members table for family sharing feature

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.family_groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id, user_id)
);

alter table public.family_members enable row level security;

create policy "Family members can view group members" on public.family_members
  for select using (
    public.is_group_member(auth.uid(), group_id)
    or user_id = auth.uid()
  );

create policy "Group owner can manage members" on public.family_members
  for all using (
    exists (
      select 1 from public.family_groups g
      where g.id = family_members.group_id
        and g.owner_id = auth.uid()
    )
  );

create index if not exists idx_family_members_group_id on public.family_members(group_id);
create index if not exists idx_family_members_user_id on public.family_members(user_id);
