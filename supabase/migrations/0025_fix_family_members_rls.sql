-- 0025_fix_family_members_rls.sql
-- Garantir função auxiliar e política de leitura de membros

create or replace function public.is_group_member(_user_id uuid, _group_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.family_members
    where user_id = _user_id and group_id = _group_id
  );
$$;

drop policy if exists "Family members can view group members" on public.family_members;

create policy "Family members can view group members" on public.family_members
  for select using (
    public.is_group_member(auth.uid(), group_id)
    or user_id = auth.uid()
  );
