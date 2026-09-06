-- 0009_family_invite_code_default.sql
-- Gera automaticamente invite_code para family_groups após INSERT (12 chars hex).

create or replace function public.generate_invite_code()
returns trigger language plpgsql as $$
begin
  if new.invite_code is null or new.invite_code = '' then
    new.invite_code := encode(gen_random_bytes(6), 'hex');
  end if;
  return new;
end $$;

drop trigger if exists trg_generate_invite_code on public.family_groups;
create trigger trg_generate_invite_code
  before insert on public.family_groups
  for each row execute function public.generate_invite_code();

comment on function public.generate_invite_code is
  'Popula invite_code automaticamente com 12 chars hex se não for informado';
