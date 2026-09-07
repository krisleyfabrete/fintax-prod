-- Extend RLS to allow family members to read shared debts
drop policy if exists "Family members can read shared debts" on public.debts;
create policy "Family members can read shared debts" on public.debts
  for select using (
    visibility in ('shared', 'household')
    and household_id is not null
    and exists (
      select 1 from public.family_members fm
      where fm.user_id = auth.uid()
        and fm.group_id = debts.household_id
    )
  );
