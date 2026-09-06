-- Remoção de toda dependência Asaas e cupons.
-- Asaas não é mais usado: planos são configurados pela administração.

-- 1) pix_payments: remove FK/tabela coupons e colunas Asaas
alter table public.pix_payments drop constraint if exists pix_payments_coupon_id_fkey;
alter table public.pix_payments drop column if exists coupon_id;
alter table public.pix_payments drop column if exists coupon_code;
alter table public.pix_payments drop column if exists asaas_payment_id;
alter table public.pix_payments drop column if exists asaas_customer_id;

-- 2) Tabelas órfãs
drop table if exists public.coupons;
drop table if exists public.asaas_webhook_events;

-- 3) subscriptions: remove colunas Asaas
alter table public.subscriptions drop column if exists asaas_customer_id;
alter table public.subscriptions drop column if exists asaas_subscription_id;