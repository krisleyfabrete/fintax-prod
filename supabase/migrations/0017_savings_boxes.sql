-- 0017_savings_boxes.sql
-- Tabela para caixinhas de economia (savings boxes)

create table if not exists public.savings_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  target_amount numeric not null default 0,
  current_amount numeric not null default 0,
  color text,
  icon text,
  is_active boolean not null default true,
  household_id uuid references public.family_groups(id) on delete set null,
  is_shared_with_family boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.savings_boxes enable row level security;

create policy "Users manage own savings boxes" on public.savings_boxes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Family members can read shared savings boxes" on public.savings_boxes
  for select using (
    is_shared_with_family = true
    and exists (
      select 1 from public.family_members fm
      where fm.user_id = auth.uid()
        and fm.group_id = savings_boxes.household_id
    )
  );

create index if not exists idx_savings_boxes_user_id on public.savings_boxes(user_id);
create index if not exists idx_savings_boxes_household_id on public.savings_boxes(household_id);
