import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useOfflineData } from '@/hooks/useOfflineData';
import { getAllFromStore, saveToStore } from '@/lib/offlineStorage';
import { useSubscription } from '@/hooks/useSubscription';
import { useTransactionCount } from '@/hooks/useTransactionCount';
import { recalculateDebt as recalculateDebtUtil } from '@/lib/debtRecalculation';

export type Transaction = Tables<'transactions'>;
export type TransactionInsert = TablesInsert<'transactions'>;
export type TransactionUpdate = TablesUpdate<'transactions'>;

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: 'income' | 'expense';
  categoryId?: string;
  accountId?: string;
  status?: 'pending' | 'confirmed';
  search?: string;
}

export function useTransactions(filters?: TransactionFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { queueForSync, saveOfflineData } = useOfflineData<Transaction>('transactions', 'transactions');
  const { checkLimit, limits, isUnlimited, plan } = useSubscription();
  const { count: transactionCount } = useTransactionCount();

  const canCreateTransaction = checkLimit('maxTransactionsPerMonth', transactionCount);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', user?.id, filters],
    queryFn: async () => {
      // Try online fetch first
      if (navigator.onLine) {
        let query = supabase
          .from('transactions')
          .select(`
            *,
            category:categories(*),
            account:accounts(*)
          `)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });

        if (filters?.startDate) {
          query = query.gte('date', filters.startDate);
        }
        if (filters?.endDate) {
          query = query.lte('date', filters.endDate);
        }
        if (filters?.type) {
          query = query.eq('type', filters.type);
        }
        if (filters?.categoryId) {
          query = query.eq('category_id', filters.categoryId);
        }
        if (filters?.accountId) {
          query = query.eq('account_id', filters.accountId);
        }
        if (filters?.status) {
          query = query.eq('status', filters.status);
        }
        if (filters?.search) {
          query = query.ilike('description', `%${filters.search}%`);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        // Cache for offline use
        if (data) {
          saveOfflineData(data as Transaction[]);
        }
        
        return data;
      } else {
        // Offline - get from IndexedDB
        const offlineData = await getAllFromStore<Transaction>('transactions');
        
        // Apply filters to offline data
        let filtered = offlineData;
        
        if (filters?.startDate) {
          filtered = filtered.filter(t => t.date >= filters.startDate!);
        }
        if (filters?.endDate) {
          filtered = filtered.filter(t => t.date <= filters.endDate!);
        }
        if (filters?.type) {
          filtered = filtered.filter(t => t.type === filters.type);
        }
        if (filters?.categoryId) {
          filtered = filtered.filter(t => t.category_id === filters.categoryId);
        }
        if (filters?.accountId) {
          filtered = filtered.filter(t => t.account_id === filters.accountId);
        }
        if (filters?.status) {
          filtered = filtered.filter(t => t.status === filters.status);
        }
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter(t => 
            t.description?.toLowerCase().includes(searchLower)
          );
        }
        
        // Sort by date descending
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return filtered;
      }
    },
    enabled: !!user,
  });

  const createTransaction = useMutation({
    mutationFn: async (transaction: Omit<TransactionInsert, 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      // Check transaction limit before creating
      if (!canCreateTransaction) {
        const limit = limits.maxTransactionsPerMonth;
        const planLabel = plan === 'free' ? 'gratuito' : plan === 'pro' ? 'Pro' : 'Familiar';
        throw new Error(`Você atingiu o limite de ${limit} transações por mês do plano ${planLabel}. Faça upgrade para continuar registrando transações.`);
      }
      
      const newTransaction = {
        ...transaction,
        user_id: user.id,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('transactions')
          .insert(newTransaction)
          .select()
          .single();
        
        if (error) throw error;
        
        // Save to offline cache
        await saveToStore('transactions', data);
        
        return data;
      } else {
        // Save offline and queue for sync
        await saveToStore('transactions', newTransaction as Transaction);
        await queueForSync('insert', newTransaction);
        
        toast.info('Transação salva offline. Será sincronizada quando voltar online.');
        
        return newTransaction as Transaction;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-count'] });
      if (navigator.onLine) {
        toast.success('Transação criada com sucesso!');
      }
      if (data?.debt_id) {
        recalculateDebtUtil(data.debt_id);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: TransactionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Transação atualizada com sucesso!');
      if (data?.debt_id) {
        recalculateDebtUtil(data.debt_id);
      }
    },
    onError: (error) => {
      toast.error('Erro ao atualizar transação: ' + error.message);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('transactions')
        .select('debt_id')
        .eq('id', id)
        .single();

      if (error) throw error;

      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-count'] });
      toast.success('Transação excluída com sucesso!');

      if (data?.debt_id) {
        recalculateDebtUtil(data.debt_id);
      }
    },
    onError: (error) => {
      toast.error('Erro ao excluir transação: ' + error.message);
    },
  });

  // Calcula totais
  const totalIncome = transactions
    ?.filter(t => t.type === 'income' && t.status === 'confirmed')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const totalExpense = transactions
    ?.filter(t => t.type === 'expense' && t.status === 'confirmed')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const remainingTransactions = isUnlimited('maxTransactionsPerMonth') 
    ? -1 
    : Math.max(0, limits.maxTransactionsPerMonth - transactionCount);

  return {
    transactions: transactions || [],
    isLoading,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    isCreating: createTransaction.isPending,
    isUpdating: updateTransaction.isPending,
    isDeleting: deleteTransaction.isPending,
    canCreateTransaction,
    remainingTransactions,
    transactionCount,
  };
}
