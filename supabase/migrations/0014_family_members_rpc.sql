-- Family module: allow group members to read each other's public profile info
-- without changing global profile visibility rules.

create or replace function public.get_group_members_with_profiles(_group_id uuid)
returns table (
  id uuid,
  group_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  profile_id uuid,
  full_name text,
  avatar_url text
) language sql security definer stable as $$
  select
    fm.id,
    fm.group_id,
    fm.user_id,
    fm.role,
    fm.joined_at,
    p.id as profile_id,
    p.full_name,
    p.avatar_url
  from public.family_members fm
  left join public.profiles p on p.id = fm.user_id
  where fm.group_id = _group_id
  order by fm.joined_at asc;
$$;
