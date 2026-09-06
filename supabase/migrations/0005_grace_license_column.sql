-- 0005_grace_license_column.sql
-- Adiciona column is_grace_license à subscriptions.
-- Usuários com assinatura cortesia recebem todos os recursos do plano pago sem pagar.
-- Esses usuários NÃO geram KPIs de receita (filtrado por !is_grace_license).
alter table public.subscriptions add column if not exists is_grace_license boolean default false;

comment on column public.subscriptions.is_grace_license is
  'true = assinatura cortesia (acesso total sem pagamento); excluída de KPIs de receita';