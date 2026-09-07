-- Extend RLS to allow family members to read shared data
-- Transactions
drop policy if exists "Family members can read shared transactions" on public.transactions;
create policy "Family members can read shared transactions" on public.transactions
  for select using (
    is_shared_with_family = true
    and exists (
      select 1 from public.family_members fm
      where fm.user_id = auth.uid()
        and fm.group_id in (
          select family_members.group_id
          from public.family_members
          where user_id = transactions.user_id
        )
    )
  );

-- Accounts
drop policy if exists "Family members can read shared accounts" on public.accounts;
create policy "Family members can read shared accounts" on public.accounts
  for select using (
    is_shared_with_family = true
    and exists (
      select 1 from public.family_members fm
      where fm.user_id = auth.uid()
        and fm.group_id in (
          select family_members.group_id
          from public.family_members
          where user_id = accounts.user_id
        )
    )
  );

-- Budgets
drop policy if exists "Family members can read shared budgets" on public.budgets;
create policy "Family members can read shared budgets" on public.budgets
  for select using (
    is_shared_with_family = true
    and exists (
      select 1 from public.family_members fm
      where fm.user_id = auth.uid()
        and fm.group_id in (
          select family_members.group_id
          from public.family_members
          where user_id = budgets.user_id
        )
    )
  );

-- Goals
drop policy if exists "Family members can read shared goals" on public.goals;
create policy "Family members can read shared goals" on public.goals
  for select using (
    is_shared_with_family = true
    and exists (
      select 1 from public.family_members fm
      where fm.user_id = auth.uid()
        and fm.group_id in (
          select family_members.group_id
          from public.family_members
          where user_id = goals.user_id
        )
    )
  );
