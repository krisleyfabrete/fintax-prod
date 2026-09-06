import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Insight {
  type: 'positive' | 'warning' | 'tip' | 'achievement';
  title: string;
  description: string;
  action?: string;
}

interface BudgetAlert {
  category: string;
  percentUsed: number;
  message: string;
}

interface GoalUpdate {
  name: string;
  progress: number;
  message: string;
}

interface InsightsResponse {
  summary: string;
  insights: Insight[];
  budgetAlerts: BudgetAlert[];
  goalUpdates: GoalUpdate[];
}

interface FinancialData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  topCategories: { name: string; amount: number; type: string }[];
  budgets: { category: string; limit: number; spent: number }[];
  goals: { name: string; target: number; current: number; type: string }[];
  recentTransactions: { description: string; amount: number; type: string; date: string }[];
}

export function useFinancialInsights() {
  const { toast } = useToast();
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const generateInsights = useCallback(async (financialData: FinancialData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('financial-insights', {
        body: { financialData },
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setInsights(data);
      setLastUpdated(new Date());

      return data as InsightsResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar insights';
      setError(message);
      toast({
        title: 'Erro ao gerar insights',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearInsights = useCallback(() => {
    setInsights(null);
    setError(null);
    setLastUpdated(null);
  }, []);

  return {
    insights,
    isLoading,
    error,
    lastUpdated,
    generateInsights,
    clearInsights,
  };
}
