-- Add is_shared_with_family to goals
alter table public.goals add column if not exists is_shared_with_family boolean default false;
