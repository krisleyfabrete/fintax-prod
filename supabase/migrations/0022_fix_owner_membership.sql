-- Ensure group owners are members of their own groups
insert into public.family_members (group_id, user_id, role)
select g.id, g.owner_id, 'admin'
from public.family_groups g
where not exists (
  select 1 from public.family_members fm
  where fm.group_id = g.id and fm.user_id = g.owner_id
);
