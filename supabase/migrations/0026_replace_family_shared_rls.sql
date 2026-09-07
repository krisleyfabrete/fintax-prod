-- 0026_replace_family_shared_rls.sql
-- Replace existing family sharing RLS policies with simpler versions

-- Transactions
drop policy if exists "Family members can read shared transactions" on public.transactions;
create policy "Family members can read shared transactions" on public.transactions
  for select using (
    is_shared_with_family = true
    and exists (
      select 1 from public.family_members fm
      where fm.user_id = auth.uid()
        and fm.group_id = (
          select family_members.group_id
          from public.family_members
          where user_id = transactions.user_id
          limit 1
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
        and fm.group_id = (
          select family_members.group_id
          from public.family_members
          where user_id = accounts.user_id
          limit 1
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
        and fm.group_id = (
          select family_members.group_id
          from public.family_members
          where user_id = budgets.user_id
          limit 1
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
        and fm.group_id = (
          select family_members.group_id
          from public.family_members
          where user_id = goals.user_id
          limit 1
        )
    )
  );

-- Savings boxes
drop policy if exists "Family members can read shared savings boxes" on public.savings_boxes;
create policy "Family members can read shared savings boxes" on public.savings_boxes
  for select using (
    is_shared_with_family = true
    and exists (
      select 1 from public.family_members fm
      where fm.user_id = auth.uid()
        and fm.group_id = savings_boxes.household_id
    )
  );

-- Debts
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
