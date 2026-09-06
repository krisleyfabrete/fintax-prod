import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

export interface Goal {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  target_amount: number;
  current_amount: number;
  period_type: 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  goal_type: 'limit' | 'target';
  created_at: string;
  updated_at: string;
  is_shared_with_family?: boolean;
  category?: {
    id: string;
    name: string;
    color: string;
    type: string;
  } | null;
}

export interface GoalInsert {
  category_id?: string | null;
  name: string;
  target_amount: number;
  period_type?: 'weekly' | 'monthly' | 'yearly';
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
  goal_type?: 'limit' | 'target';
}

export function useGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { checkLimit, getRemainingCount, plan } = useSubscription();

  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select(`
          *,
          category:categories(id, name, color, type)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!user,
  });

  const currentGoalsCount = goals?.length || 0;
  const canCreateGoal = checkLimit('maxGoals', currentGoalsCount);
  const remainingGoals = getRemainingCount('maxGoals', currentGoalsCount);

  const createGoal = useMutation({
    mutationFn: async (goal: GoalInsert) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Check goal limit before creating
      if (!canCreateGoal) {
        const planLabel = plan === 'free' ? 'gratuito' : plan === 'pro' ? 'Pro' : 'Familiar';
        throw new Error(`Você atingiu o limite de metas do plano ${planLabel}. Faça upgrade para criar mais metas.`);
      }

      const { data, error } = await supabase
        .from('goals')
        .insert({ ...goal, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar meta: ' + error.message);
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Goal> & { id: string }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar meta: ' + error.message);
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Meta excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir meta: ' + error.message);
    },
  });

  // Depositar valor na meta de economia
  const depositToGoal = useMutation({
    mutationFn: async ({ goalId, amount, accountId }: { goalId: string; amount: number; accountId: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar a meta
      const goal = goals?.find(g => g.id === goalId);
      if (!goal) throw new Error('Meta não encontrada');
      if (goal.goal_type !== 'target') throw new Error('Apenas metas de economia aceitam depósitos');

      // Criar transação de despesa (transferência para economia)
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: accountId,
          amount: amount,
          type: 'expense',
          description: `Depósito na meta: ${goal.name}`,
          date: new Date().toISOString().split('T')[0],
          status: 'confirmed',
        });

      if (transactionError) throw transactionError;

      // Atualizar current_amount da meta
      const newAmount = (goal.current_amount || 0) + amount;
      const { data, error: goalError } = await supabase
        .from('goals')
        .update({ current_amount: newAmount })
        .eq('id', goalId)
        .select()
        .single();

      if (goalError) throw goalError;

      // Verificar se atingiu a meta e criar notificação
      if (newAmount >= goal.target_amount) {
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title: '🎉 Meta Atingida!',
            message: `Parabéns! Você atingiu sua meta "${goal.name}" de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.target_amount)}!`,
            type: 'success',
            link: '/goals',
          });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Depósito realizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao depositar: ' + error.message);
    },
  });

  // Sacar valor da meta de economia
  const withdrawFromGoal = useMutation({
    mutationFn: async ({ goalId, amount, accountId }: { goalId: string; amount: number; accountId: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar a meta
      const goal = goals?.find(g => g.id === goalId);
      if (!goal) throw new Error('Meta não encontrada');
      if (goal.goal_type !== 'target') throw new Error('Apenas metas de economia permitem saques');
      if (amount > goal.current_amount) throw new Error('Saldo insuficiente na meta');

      // Criar transação de receita (transferência de volta para conta)
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: accountId,
          amount: amount,
          type: 'income',
          description: `Saque da meta: ${goal.name}`,
          date: new Date().toISOString().split('T')[0],
          status: 'confirmed',
        });

      if (transactionError) throw transactionError;

      // Atualizar current_amount da meta
      const newAmount = Math.max(0, (goal.current_amount || 0) - amount);
      const { data, error: goalError } = await supabase
        .from('goals')
        .update({ current_amount: newAmount })
        .eq('id', goalId)
        .select()
        .single();

      if (goalError) throw goalError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Saque realizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao sacar: ' + error.message);
    },
  });

  return {
    goals: goals || [],
    isLoading,
    createGoal,
    updateGoal,
    deleteGoal,
    depositToGoal,
    withdrawFromGoal,
    isCreating: createGoal.isPending,
    isUpdating: updateGoal.isPending,
    isDeleting: deleteGoal.isPending,
    isDepositing: depositToGoal.isPending,
    isWithdrawing: withdrawFromGoal.isPending,
    canCreateGoal,
    remainingGoals,
  };
}
