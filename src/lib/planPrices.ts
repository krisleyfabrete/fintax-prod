/**
 * Utilidades de preços dos planos.
 *
 * O valor persistido em `admin_settings.plan_prices` usa o formato de centavos
 * (schema do seed / edge functions):
 *   { "free": {monthly, yearly}, "pro": {monthly, yearly}, "family": {monthly, yearly} }
 * Ex.: pro.monthly = 2990 → R$ 29,90.
 *
 * Já o frontend consome valores em reais: { pro_monthly, pro_yearly, family_monthly, family_yearly }.
 * Este módulo centraliza a conversão para os dois lados.
 */

export interface AsaasPlanPricesCents {
  free: { monthly: number; yearly: number };
  pro: { monthly: number; yearly: number };
  family: { monthly: number; yearly: number };
}

export interface AppPlanPricesReais {
  pro_monthly: number;
  pro_yearly: number;
  family_monthly: number;
  family_yearly: number;
}

export const DEFAULT_PLAN_PRICES_REAIS: AppPlanPricesReais = {
  pro_monthly: 29.9,
  pro_yearly: 299.9,
  family_monthly: 49.9,
  family_yearly: 499.9,
};

export const DEFAULT_PLAN_PRICES_CENTS: AsaasPlanPricesCents = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 2990, yearly: 29990 },
  family: { monthly: 4990, yearly: 49990 },
};

/** Converte preços em reais para o schema de centavos persistido no banco. */
export function pricesReaisToCents(p: AppPlanPricesReais): AsaasPlanPricesCents {
  return {
    free: { monthly: 0, yearly: 0 },
    pro: {
      monthly: Math.round(p.pro_monthly * 100),
      yearly: Math.round(p.pro_yearly * 100),
    },
    family: {
      monthly: Math.round(p.family_monthly * 100),
      yearly: Math.round(p.family_yearly * 100),
    },
  };
}

/**
 * Normaliza qualquer shape de `plan_prices` lido do banco para reais.
 * Suporta:
 *  - Schema de centavos: { free/pro/family: { monthly, yearly } } (seed / edge functions)
 *  - Schema antigo em reais: { free/pro/family: { monthly, yearly } } (AdminPlans legado)
 *  - Schema de reais: { pro_monthly, pro_yearly, family_monthly, family_yearly } (AdminSettings legado)
 */
export function normalizePlanPrices(value: unknown): AppPlanPricesReais {
  const v = (value ?? {}) as Record<string, unknown>;

  // Schema legado de reais: { pro_monthly, pro_yearly, family_monthly, family_yearly }
  if (typeof v.pro_monthly === 'number') {
    return {
      pro_monthly: v.pro_monthly,
      pro_yearly: typeof v.pro_yearly === 'number' ? v.pro_yearly : DEFAULT_PLAN_PRICES_REAIS.pro_yearly,
      family_monthly: typeof v.family_monthly === 'number' ? v.family_monthly : DEFAULT_PLAN_PRICES_REAIS.family_monthly,
      family_yearly: typeof v.family_yearly === 'number' ? v.family_yearly : DEFAULT_PLAN_PRICES_REAIS.family_yearly,
    };
  }

  // Schema { free/pro/family: { monthly, yearly } }
  if (v.pro && typeof v.pro.monthly === 'number') {
    const proM = v.pro.monthly;
    const proY = typeof v.pro.yearly === 'number' ? v.pro.yearly : 0;
    const famM = typeof v.family?.monthly === 'number' ? v.family.monthly : 0;
    const famY = typeof v.family?.yearly === 'number' ? v.family.yearly : 0;

    // Centavos são valores inteiros grandes (>= 1000). Reais legados são fracionados (ex.: 19.9).
    const looksLikeCents = Number.isInteger(proM) && proM >= 1000;
    const divisor = looksLikeCents ? 100 : 1;

    return {
      pro_monthly: proM / divisor,
      pro_yearly: proY / divisor,
      family_monthly: famM / divisor,
      family_yearly: famY / divisor,
    };
  }

  return { ...DEFAULT_PLAN_PRICES_REAIS };
}