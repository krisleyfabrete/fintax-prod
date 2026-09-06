import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminSettings } from './useAdminSettings';

export type SubscriptionPlan = 'free' | 'pro' | 'family';

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  created_at: string;
  updated_at: string;
}

interface PlanLimits {
  maxAccounts: number;
  maxTransactionsPerMonth: number;
  maxGoals: number;
  maxBudgets: number;
  maxFamilyMembers: number;
  canUseFamily: boolean;
  canImportStatements: boolean;
  canUseAIInsights: boolean;
  canUseReminders: boolean;
  canExportReports: boolean;
}

const PLAN_FEATURES: Record<SubscriptionPlan, Omit<PlanLimits, 'maxAccounts' | 'maxTransactionsPerMonth' | 'maxGoals' | 'maxBudgets' | 'maxFamilyMembers'>> = {
  free: {
    canUseFamily: false, canImportStatements: false, canUseAIInsights: false,
    canUseReminders: false, canExportReports: false,
  },
  pro: {
    canUseFamily: false, canImportStatements: true, canUseAIInsights: true,
    canUseReminders: true, canExportReports: true,
  },
  family: {
    canUseFamily: true, canImportStatements: true, canUseAIInsights: true,
    canUseReminders: true, canExportReports: true,
  },
};

export function useSubscription() {
  const { user } = useAuth();
  const { settings: adminSettings, isLoading: isLoadingSettings } = useAdminSettings();

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).single();
      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }
      return data as Subscription;
    },
    enabled: !!user?.id,
  });

  const plan: SubscriptionPlan = subscription?.plan || 'free';

  const planLimitsFromAdmin = adminSettings.planLimits[plan];
  const limits: PlanLimits = {
    maxAccounts: planLimitsFromAdmin.accounts,
    maxTransactionsPerMonth: planLimitsFromAdmin.transactions,
    maxGoals: planLimitsFromAdmin.goals,
    maxBudgets: planLimitsFromAdmin.budgets,
    maxFamilyMembers: planLimitsFromAdmin.members || 6,
    ...PLAN_FEATURES[plan],
  };

  const canAccess = (feature: keyof PlanLimits): boolean => {
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    return true;
  };

  const checkLimit = (feature: 'maxAccounts' | 'maxTransactionsPerMonth' | 'maxGoals' | 'maxBudgets' | 'maxFamilyMembers', currentCount: number): boolean => {
    const limit = limits[feature];
    if (limit === -1) return true;
    return currentCount < limit;
  };

  const getRemainingCount = (feature: 'maxAccounts' | 'maxTransactionsPerMonth' | 'maxGoals' | 'maxBudgets' | 'maxFamilyMembers', currentCount: number): number => {
    const limit = limits[feature];
    if (limit === -1) return -1;
    return Math.max(0, limit - currentCount);
  };

  const isUnlimited = (feature: 'maxAccounts' | 'maxTransactionsPerMonth' | 'maxGoals' | 'maxBudgets' | 'maxFamilyMembers'): boolean => {
    return limits[feature] === -1;
  };

  const isPro = plan === 'pro' || plan === 'family';
  const isFamily = plan === 'family';

  const getPlanLabel = (p: SubscriptionPlan): string => {
    switch (p) {
      case 'free': return 'Gratuito';
      case 'pro': return 'Pro';
      case 'family': return 'Familiar';
      default: return 'Gratuito';
    }
  };

  return {
    subscription,
    plan,
    limits,
    isLoading: isLoadingSubscription || isLoadingSettings,
    canAccess,
    checkLimit,
    getRemainingCount,
    isUnlimited,
    isPro,
    isFamily,
    getPlanLabel,
  };
}