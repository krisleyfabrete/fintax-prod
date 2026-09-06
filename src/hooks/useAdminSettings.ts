import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_PLAN_PRICES_REAIS, normalizePlanPrices } from '@/lib/planPrices';

interface PlanLimits {
  transactions: number;
  accounts: number;
  budgets: number;
  goals: number;
  members?: number;
}

interface PlanPrices {
  pro_monthly: number;
  pro_yearly: number;
  family_monthly: number;
  family_yearly: number;
}

interface PixAlertSettings {
  enabled: boolean;
  alertHours: number;
  cooldownHours: number;
}

interface AdminSettings {
  planLimits: {
    free: PlanLimits;
    pro: PlanLimits;
    family: PlanLimits;
  };
  prices: PlanPrices;
  pixAlerts: PixAlertSettings;
}

const defaultSettings: AdminSettings = {
  planLimits: {
    free: { transactions: 50, accounts: 2, budgets: 3, goals: 2 },
    pro: { transactions: -1, accounts: 10, budgets: 20, goals: 10 },
    family: { transactions: -1, accounts: 20, budgets: 50, goals: 20, members: 6 },
  },
  prices: {
    pro_monthly: DEFAULT_PLAN_PRICES_REAIS.pro_monthly,
    pro_yearly: DEFAULT_PLAN_PRICES_REAIS.pro_yearly,
    family_monthly: DEFAULT_PLAN_PRICES_REAIS.family_monthly,
    family_yearly: DEFAULT_PLAN_PRICES_REAIS.family_yearly,
  },
  pixAlerts: {
    enabled: true,
    alertHours: 24,
    cooldownHours: 6,
  },
};

export function useAdminSettings() {
  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-settings-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap = new Map(data?.map(s => [s.key, s.value]) || []);

      const result: AdminSettings = {
        planLimits: {
          free: (settingsMap.get('plan_limits_free') as unknown as PlanLimits) || defaultSettings.planLimits.free,
          pro: (settingsMap.get('plan_limits_pro') as unknown as PlanLimits) || defaultSettings.planLimits.pro,
          family: (settingsMap.get('plan_limits_family') as unknown as PlanLimits) || defaultSettings.planLimits.family,
        },
        prices: normalizePlanPrices(settingsMap.get('plan_prices')) || defaultSettings.prices,
        pixAlerts: {
          enabled: (settingsMap.get('pix_alerts_enabled') as unknown as { enabled: boolean })?.enabled ?? defaultSettings.pixAlerts.enabled,
          alertHours: (settingsMap.get('pix_alert_hours') as unknown as { hours: number })?.hours ?? defaultSettings.pixAlerts.alertHours,
          cooldownHours: (settingsMap.get('pix_alert_cooldown_hours') as unknown as { hours: number })?.hours ?? defaultSettings.pixAlerts.cooldownHours,
        },
      };

      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    settings: settings || defaultSettings,
    isLoading,
    error,
    refetch,
  };
}

type SubscriptionPlan = 'free' | 'pro' | 'family';

export function usePlanLimits(plan: SubscriptionPlan) {
  const { settings, isLoading } = useAdminSettings();
  
  return {
    limits: settings.planLimits[plan],
    isLoading,
  };
}

export function usePlanPrices() {
  const { settings, isLoading } = useAdminSettings();
  
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateSavings = (monthly: number, yearly: number) => {
    const annualFromMonthly = monthly * 12;
    const savingsAmount = annualFromMonthly - yearly;
    const savingsPercent = Math.round((savingsAmount / annualFromMonthly) * 100);
    return { amount: savingsAmount, percent: savingsPercent };
  };

  return {
    prices: settings.prices,
    isLoading,
    formatPrice,
    proMonthlySavings: calculateSavings(settings.prices.pro_monthly, settings.prices.pro_yearly),
    familyMonthlySavings: calculateSavings(settings.prices.family_monthly, settings.prices.family_yearly),
  };
}

export function useCheckLimit(
  plan: SubscriptionPlan,
  resource: 'transactions' | 'accounts' | 'budgets' | 'goals' | 'members',
  currentCount: number
) {
  const { limits, isLoading } = usePlanLimits(plan);
  
  const limit = limits[resource as keyof PlanLimits] ?? -1;
  const isUnlimited = limit === -1;
  const isAtLimit = !isUnlimited && currentCount >= limit;
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - currentCount);
  const percentage = isUnlimited ? 0 : Math.min(100, (currentCount / limit) * 100);

  return {
    limit,
    isUnlimited,
    isAtLimit,
    remaining,
    percentage,
    currentCount,
    isLoading,
  };
}
