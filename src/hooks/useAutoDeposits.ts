import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AutoDeposit {
  id: string;
  goal_id: string;
  user_id: string;
  account_id: string;
  amount: number;
  day_of_month: number;
  is_active: boolean;
  next_execution_at: string | null;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutoDepositInsert {
  goal_id: string;
  account_id: string;
  amount: number;
  day_of_month: number;
  frequency: string;
  is_active?: boolean;
}

export function useAutoDeposits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: autoDeposits, isLoading } = useQuery({
    queryKey: ['auto-deposits', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_auto_deposits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AutoDeposit[];
    },
    enabled: !!user,
  });

  const getAutoDepositForGoal = (goalId: string) => {
    return autoDeposits?.find((ad) => ad.goal_id === goalId);
  };

  const calculateNextExecution = (dayOfMonth: number): string => {
    const now = new Date();
    let nextDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    
    // If this month's day has passed, schedule for next month
    if (nextDate <= now) {
      nextDate = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
    }
    
    return nextDate.toISOString();
  };

  const createAutoDeposit = useMutation({
    mutationFn: async (data: AutoDepositInsert) => {
      if (!user) throw new Error('Usuário não autenticado');

      const nextExecution = calculateNextExecution(data.day_of_month);

      const { data: result, error } = await supabase
        .from('goal_auto_deposits')
        .insert({
          ...data,
          user_id: user.id,
          active: data.is_active,
          next_execution_at: nextExecution,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-deposits'] });
      toast.success('Depósito automático configurado!');
    },
    onError: (error) => {
      toast.error('Erro ao configurar: ' + error.message);
    },
  });

  const updateAutoDeposit = useMutation({
     mutationFn: async ({ id, ...data }: Partial<AutoDeposit> & { id: string }) => {
       const { is_active, ...rest } = data;
        const updates: Record<string, unknown> = { ...rest };
       if (is_active !== undefined) updates.active = is_active;
       
       if (data.day_of_month) {
         updates.next_execution_at = calculateNextExecution(data.day_of_month);
       }

      const { data: result, error } = await supabase
        .from('goal_auto_deposits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-deposits'] });
      toast.success('Depósito automático atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const deleteAutoDeposit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goal_auto_deposits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-deposits'] });
      toast.success('Depósito automático removido!');
    },
    onError: (error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });

  return {
    autoDeposits: autoDeposits || [],
    isLoading,
    getAutoDepositForGoal,
    createAutoDeposit,
    updateAutoDeposit,
    deleteAutoDeposit,
    isCreating: createAutoDeposit.isPending,
    isUpdating: updateAutoDeposit.isPending,
    isDeleting: deleteAutoDeposit.isPending,
  };
}
