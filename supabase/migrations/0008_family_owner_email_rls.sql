-- 0008_family_owner_email_rls.sql
-- Função para resolver o owner de um grupo pelo invite_code.
-- O email do owner é obtido pela Edge Function via admin API (service role).

create or replace function public.get_group_owner_by_code(code text)
returns table (
  group_id uuid,
  owner_id uuid
) language sql as $$
  select g.id as group_id, g.owner_id
  from public.family_groups g
  where g.invite_code = code;
$$;

grant execute on function public.get_group_owner_by_code(text) to authenticated;
