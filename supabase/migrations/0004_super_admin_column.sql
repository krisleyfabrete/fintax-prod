-- 0004_super_admin_column.sql
-- Adiciona discriminador de super-admin que exime da análise de KPIs.
alter table public.user_roles add column if not exists is_super_admin boolean default false;

-- Marca o usuários admin existentes como super_admin
update public.user_roles set is_super_admin = true where role = 'admin';