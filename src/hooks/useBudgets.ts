import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { Category } from '@/hooks/useCategories';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  category?: Category;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetInsert {
  category_id: string;
  amount: number;
  month: number;
  year: number;
}

export interface BudgetWithProgress extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
}

export function useBudgets(month: number, year: number) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkLimit, getRemainingCount, plan } = useSubscription();

  // Fetch budgets for the selected month/year
  const { data: budgets, isLoading: isLoadingBudgets } = useQuery({
    queryKey: ['budgets', user?.id, month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('month', month)
        .eq('year', year)
        .order('created_at');

      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!user,
  });

  // Fetch transactions for the same month/year to calculate spending
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['transactions-for-budgets', user?.id, month, year],
    queryFn: async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

      const { data, error } = await supabase
        .from('transactions')
        .select('category_id, amount, type')
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Calculate spending per category
  const spendingByCategory = transactions?.reduce((acc, tx) => {
    if (tx.category_id) {
      acc[tx.category_id] = (acc[tx.category_id] || 0) + Number(tx.amount);
    }
    return acc;
  }, {} as Record<string, number>) || {};

  // Merge budgets with progress data
  const budgetsWithProgress: BudgetWithProgress[] = (budgets || []).map((budget) => {
    const spent = budget.category_id ? (spendingByCategory[budget.category_id] || 0) : 0;
    const remaining = Math.max(0, budget.amount - spent);
    const percentage = budget.amount > 0 ? Math.min(100, (spent / budget.amount) * 100) : 0;
    
    let status: 'ok' | 'warning' | 'exceeded' = 'ok';
    if (percentage >= 100) {
      status = 'exceeded';
    } else if (percentage >= 80) {
      status = 'warning';
    }

    return {
      ...budget,
      spent,
      remaining,
      percentage,
      status,
    };
  });

  // Summary calculations
  const totalBudgeted = budgetsWithProgress.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgetsWithProgress.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;

  // Budget limits
  const currentBudgetsCount = budgets?.length || 0;
  const canCreateBudget = checkLimit('maxBudgets', currentBudgetsCount);
  const remainingBudgets = getRemainingCount('maxBudgets', currentBudgetsCount);

  // Create budget
  const createBudget = useMutation({
    mutationFn: async (budget: BudgetInsert) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Check budget limit before creating
      if (!canCreateBudget) {
        const planLabel = plan === 'free' ? 'gratuito' : plan === 'pro' ? 'Pro' : 'Familiar';
        throw new Error(`Você atingiu o limite de orçamentos do plano ${planLabel}. Faça upgrade para criar mais.`);
      }

      const { data, error } = await supabase
        .from('budgets')
        .insert({
          ...budget,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Orçamento criado',
        description: 'Seu orçamento foi adicionado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar orçamento',
        description: error.message.includes('duplicate') 
          ? 'Já existe um orçamento para esta categoria neste mês.'
          : error.message,
        variant: 'destructive',
      });
    },
  });

  // Update budget
  const updateBudget = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; amount?: number; category_id?: string }) => {
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Orçamento atualizado',
        description: 'As alterações foram salvas.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar orçamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete budget
  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Orçamento excluído',
        description: 'O orçamento foi removido.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir orçamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Copy budgets from previous month
  const copyFromPreviousMonth = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');

      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;

      // Fetch previous month's budgets
      const { data: prevBudgets, error: fetchError } = await supabase
        .from('budgets')
        .select('category_id, amount')
        .eq('month', prevMonth)
        .eq('year', prevYear);

      if (fetchError) throw fetchError;
      if (!prevBudgets || prevBudgets.length === 0) {
        throw new Error('Não há orçamentos no mês anterior para copiar.');
      }

      // Insert budgets for current month
      const newBudgets = prevBudgets.map((b) => ({
        user_id: user.id,
        category_id: b.category_id,
        amount: b.amount,
        month,
        year,
      }));

      const { error: insertError } = await supabase
        .from('budgets')
        .insert(newBudgets);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Orçamentos copiados',
        description: 'Os orçamentos do mês anterior foram copiados.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao copiar orçamentos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    budgets: budgetsWithProgress,
    isLoading: isLoadingBudgets || isLoadingTransactions,
    totalBudgeted,
    totalSpent,
    totalRemaining,
    createBudget,
    updateBudget,
    deleteBudget,
    copyFromPreviousMonth,
    isCreating: createBudget.isPending,
    isUpdating: updateBudget.isPending,
    isDeleting: deleteBudget.isPending,
    isCopying: copyFromPreviousMonth.isPending,
    canCreateBudget,
    remainingBudgets,
  };
}
