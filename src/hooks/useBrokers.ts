import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Broker {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface BrokerFormData {
  name: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
}

export function useBrokers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: brokers = [], isLoading } = useQuery({
    queryKey: ['brokers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('brokers')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error fetching brokers:', error);
        throw error;
      }

      return data as Broker[];
    },
    enabled: !!user?.id,
  });

  const createBroker = useMutation({
    mutationFn: async (formData: BrokerFormData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('brokers')
        .insert({
          user_id: user.id,
          name: formData.name,
          icon: formData.icon || 'building-2',
          color: formData.color || '#8B5CF6',
          is_active: formData.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      toast({ title: 'Corretora criada com sucesso!' });
    },
    onError: (error) => {
      console.error('Error creating broker:', error);
      toast({ title: 'Erro ao criar corretora', variant: 'destructive' });
    },
  });

  const updateBroker = useMutation({
    mutationFn: async ({ id, ...formData }: BrokerFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('brokers')
        .update({
          name: formData.name,
          icon: formData.icon,
          color: formData.color,
          is_active: formData.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      toast({ title: 'Corretora atualizada com sucesso!' });
    },
    onError: (error) => {
      console.error('Error updating broker:', error);
      toast({ title: 'Erro ao atualizar corretora', variant: 'destructive' });
    },
  });

  const deleteBroker = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('brokers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      toast({ title: 'Corretora excluída com sucesso!' });
    },
    onError: (error) => {
      console.error('Error deleting broker:', error);
      toast({ title: 'Erro ao excluir corretora', variant: 'destructive' });
    },
  });

  return {
    brokers,
    isLoading,
    createBroker,
    updateBroker,
    deleteBroker,
  };
}
