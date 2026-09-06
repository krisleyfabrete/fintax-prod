import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useSubscription } from '@/hooks/useSubscription';

export type Account = Tables<'accounts'>;
export type AccountInsert = TablesInsert<'accounts'>;
export type AccountUpdate = TablesUpdate<'accounts'>;

export function useAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { checkLimit } = useSubscription();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Account[];
    },
    enabled: !!user,
  });

  const accountCount = accounts?.length || 0;
  const canCreateAccount = checkLimit('maxAccounts', accountCount);

  const createAccount = useMutation({
    mutationFn: async (account: Omit<AccountInsert, 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      if (!canCreateAccount) {
        throw new Error('Você atingiu o limite de contas do seu plano. Faça upgrade para criar mais contas.');
      }
      
      const { data, error } = await supabase
        .from('accounts')
        .insert({ ...account, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Conta criada com sucesso!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: AccountUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Conta atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar conta: ' + error.message);
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Conta excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir conta: ' + error.message);
    },
  });

  const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.is_active ? Number(acc.balance) : 0), 0) || 0;

  return {
    accounts: accounts || [],
    isLoading,
    totalBalance,
    accountCount,
    canCreateAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    isCreating: createAccount.isPending,
    isUpdating: updateAccount.isPending,
    isDeleting: deleteAccount.isPending,
  };
}
