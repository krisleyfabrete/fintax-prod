import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Broker } from './useBrokers';

export interface Portfolio {
  id: string;
  user_id: string;
  broker_id: string | null;
  name: string;
  description: string | null;
  shared_with_family: boolean;
  is_shared_with_family: boolean;
  created_at: string;
  updated_at: string | null;
  brokers?: Broker;
}

export interface PortfolioFormData {
  name: string;
  broker_id?: string | null;
  description?: string;
  is_shared_with_family?: boolean;
}

export function usePortfolios() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: portfolios = [], isLoading } = useQuery({
    queryKey: ['portfolios', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('investment_portfolios')
        .select('*, brokers(*)')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error fetching portfolios:', error);
        throw error;
      }

      return data as Portfolio[];
    },
    enabled: !!user?.id,
  });

  const createPortfolio = useMutation({
    mutationFn: async (formData: PortfolioFormData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('investment_portfolios')
        .insert({
          user_id: user.id,
          name: formData.name,
          broker_id: formData.broker_id || null,
          description: formData.description || null,
          is_shared_with_family: formData.is_shared_with_family ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      toast({ title: 'Carteira criada com sucesso!' });
    },
    onError: (error) => {
      console.error('Error creating portfolio:', error);
      toast({ title: 'Erro ao criar carteira', variant: 'destructive' });
    },
  });

  const updatePortfolio = useMutation({
    mutationFn: async ({ id, ...formData }: PortfolioFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('investment_portfolios')
        .update({
          name: formData.name,
          broker_id: formData.broker_id,
          description: formData.description,
          is_shared_with_family: formData.is_shared_with_family,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      toast({ title: 'Carteira atualizada com sucesso!' });
    },
    onError: (error) => {
      console.error('Error updating portfolio:', error);
      toast({ title: 'Erro ao atualizar carteira', variant: 'destructive' });
    },
  });

  const deletePortfolio = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('investment_portfolios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast({ title: 'Carteira excluída com sucesso!' });
    },
    onError: (error) => {
      console.error('Error deleting portfolio:', error);
      toast({ title: 'Erro ao excluir carteira', variant: 'destructive' });
    },
  });

  return {
    portfolios,
    isLoading,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
  };
}
