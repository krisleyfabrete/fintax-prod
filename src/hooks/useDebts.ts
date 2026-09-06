import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { recalculateDebt as recalculateDebtUtil } from '@/lib/debtRecalculation';

export type Debt = Tables<'debts'>;
export type DebtInsert = TablesInsert<'debts'>;
export type DebtUpdate = TablesUpdate<'debts'>;

export type DebtStatus = 'open' | 'negotiating' | 'installment' | 'overdue' | 'paid' | 'canceled';
export type DebtPriority = 'low' | 'medium' | 'high' | 'critical';
export type DebtVisibility = 'private' | 'shared' | 'household';
export type DebtInterestType = 'monthly' | 'annual' | 'fixed' | 'unknown';

export interface DebtFilters {
  status?: DebtStatus;
  responsibleUserId?: string;
  creditor?: string;
  categoryId?: string;
  priority?: DebtPriority;
  dueDateFrom?: string;
  dueDateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  hasInterest?: boolean;
  installmentEnabled?: boolean;
  paid?: boolean;
  search?: string;
}

export const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  open: 'Em aberto',
  negotiating: 'Em negociação',
  installment: 'Parcelada',
  overdue: 'Atrasada',
  paid: 'Quitada',
  canceled: 'Cancelada',
};

export const DEBT_PRIORITY_LABELS: Record<DebtPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export const DEBT_VISIBILITY_LABELS: Record<DebtVisibility, string> = {
  private: 'Privada',
  shared: 'Compartilhada',
  household: 'Casa',
};

export const DEBT_INTEREST_TYPE_LABELS: Record<DebtInterestType, string> = {
  monthly: 'Mensal',
  annual: 'Anual',
  fixed: 'Fixo',
  unknown: 'Desconhecido',
};

export function useDebts(filters?: DebtFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: debts, isLoading } = useQuery({
    queryKey: ['debts', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.responsibleUserId) {
        query = query.eq('responsible_user_id', filters.responsibleUserId);
      }
      if (filters?.creditor) {
        query = query.ilike('creditor', `%${filters.creditor}%`);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.dueDateFrom) {
        query = query.gte('due_date', filters.dueDateFrom);
      }
      if (filters?.dueDateTo) {
        query = query.lte('due_date', filters.dueDateTo);
      }
      if (filters?.minAmount !== undefined) {
        query = query.gte('remaining_amount', filters.minAmount);
      }
      if (filters?.maxAmount !== undefined) {
        query = query.lte('remaining_amount', filters.maxAmount);
      }
      if (filters?.hasInterest !== undefined) {
        query = query.eq('has_interest', filters.hasInterest);
      }
      if (filters?.installmentEnabled !== undefined) {
        query = query.eq('installment_enabled', filters.installmentEnabled);
      }
      if (filters?.paid !== undefined) {
        query = query.eq('status', filters.paid ? 'paid' : 'open');
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,creditor.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching debts:', error);
        throw error;
      }

      return data as Debt[];
    },
    enabled: !!user?.id,
  });

  const createDebt = useMutation({
    mutationFn: async (debt: Omit<DebtInsert, 'user_id' | 'paid_amount' | 'remaining_amount' | 'paid_percentage'>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const newDebt = {
        ...debt,
        user_id: user.id,
        paid_amount: 0,
        remaining_amount: debt.original_amount,
        paid_percentage: 0,
        status: 'open' as DebtStatus,
      };

      console.log('createDebt payload:', newDebt);

      const { data, error } = await supabase
        .from('debts')
        .insert(newDebt)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast.success('Dívida criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating debt:', error);
      toast.error('Erro ao criar dívida');
    },
  });

  const updateDebt = useMutation({
    mutationFn: async ({ id, ...updates }: DebtUpdate & { id: string }) => {
      console.log('updateDebt payload:', { id, updates });
      const { data, error } = await supabase
        .from('debts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast.success('Dívida atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating debt:', error);
      toast.error('Erro ao atualizar dívida');
    },
  });

  const deleteDebt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast.success('Dívida excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting debt:', error);
      toast.error('Erro ao excluir dívida');
    },
  });

  const archiveDebt = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('debts')
        .update({ status: 'canceled' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast.success('Dívida arquivada com sucesso!');
    },
    onError: (error) => {
      console.error('Error archiving debt:', error);
      toast.error('Erro ao arquivar dívida');
    },
  });

  const recalculateDebt = async (debtId: string) => {
    if (!user?.id) return;
    await recalculateDebtUtil(debtId);
    queryClient.invalidateQueries({ queryKey: ['debts'] });
  };

  return {
    debts: debts || [],
    isLoading,
    createDebt,
    updateDebt,
    deleteDebt,
    archiveDebt,
    recalculateDebt,
    isCreating: createDebt.isPending,
    isUpdating: updateDebt.isPending,
    isDeleting: deleteDebt.isPending,
    isArchiving: archiveDebt.isPending,
  };
}
