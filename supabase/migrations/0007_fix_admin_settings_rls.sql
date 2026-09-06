-- 0007_fix_admin_settings_rls.sql
-- Corrige política RLS de admin_settings: adiciona WITH CHECK para permitir INSERT/UPDATE/DELETE por admins.
-- Sem WITH CHECK, a política USING="Admins manage settings" só permite SELECT, não writes.

drop policy if exists "Admins manage settings" on public.admin_settings;
create policy "Admins manage settings" on public.admin_settings for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

comment on policy "Admins manage settings" on public.admin_settings is
  'Permite admins gerenciarem todas as configurações (inclusive PIX) com WITH CHECK para writes';
