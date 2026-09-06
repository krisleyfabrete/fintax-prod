-- 0010_update_plan_prices.sql
-- Atualiza os preços dos planos Pro e Família:
--   Pro:    R$ 29,90/mês  ou R$ 299,90/ano
--   Família: R$ 49,90/mês ou R$ 499,90/ano
-- Valores persistidos em centavos (mesmo schema do seed / edge functions): { free/pro/family: { monthly, yearly } }
insert into public.admin_settings (key, value, updated_at)
values (
  'plan_prices',
  '{"free":{"monthly":0,"yearly":0},"pro":{"monthly":2990,"yearly":29990},"family":{"monthly":4990,"yearly":49990}}'::jsonb,
  now()
)
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();