import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useHasFamily } from '@/hooks/useFamily';

export interface SavingsBox {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  household_id: string | null;
  is_shared_with_family: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavingsBoxInsert {
  name: string;
  description?: string | null;
  target_amount: number;
  current_amount?: number;
  color?: string | null;
  icon?: string | null;
  is_active?: boolean;
  is_shared_with_family?: boolean;
  household_id?: string | null;
}

export function useSavingsBoxes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasFamily = useHasFamily();

  const { data: savingsBoxes = [], isLoading } = useQuery({
    queryKey: ['savings-boxes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_boxes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SavingsBox[];
    },
    enabled: !!user,
  });

  const createSavingsBox = useMutation({
    mutationFn: async (box: SavingsBoxInsert) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('savings_boxes')
        .insert({ ...box, user_id: user.id, current_amount: box.current_amount || 0 })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-boxes'] });
      toast.success('Caixinha criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating savings box:', error);
      toast.error('Erro ao criar caixinha');
    },
  });

  const updateSavingsBox = useMutation({
    mutationFn: async ({ id, ...updates }: SavingsBoxInsert & { id: string }) => {
      const { data, error } = await supabase
        .from('savings_boxes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-boxes'] });
      toast.success('Caixinha atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating savings box:', error);
      toast.error('Erro ao atualizar caixinha');
    },
  });

  const deleteSavingsBox = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('savings_boxes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-boxes'] });
      toast.success('Caixinha excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting savings box:', error);
      toast.error('Erro ao excluir caixinha');
    },
  });

  const addToSavingsBox = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { data: box, error: fetchError } = await supabase
        .from('savings_boxes')
        .select('current_amount, target_amount')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newAmount = Math.min(box.current_amount + amount, box.target_amount);

      const { data, error } = await supabase
        .from('savings_boxes')
        .update({ current_amount: newAmount })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-boxes'] });
      toast.success('Valor adicionado à caixinha!');
    },
    onError: (error) => {
      console.error('Error adding to savings box:', error);
      toast.error('Erro ao adicionar valor');
    },
  });

  const withdrawFromSavingsBox = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { data: box, error: fetchError } = await supabase
        .from('savings_boxes')
        .select('current_amount')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newAmount = Math.max(box.current_amount - amount, 0);

      const { data, error } = supabase
        .from('savings_boxes')
        .update({ current_amount: newAmount })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-boxes'] });
      toast.success('Valor resgatado da caixinha!');
    },
    onError: (error) => {
      console.error('Error withdrawing from savings box:', error);
      toast.error('Erro ao resgatar valor');
    },
  });

  return {
    savingsBoxes,
    isLoading,
    hasFamily,
    createSavingsBox,
    updateSavingsBox,
    deleteSavingsBox,
    addToSavingsBox,
    withdrawFromSavingsBox,
    isCreating: createSavingsBox.isPending,
    isUpdating: updateSavingsBox.isPending,
    isDeleting: deleteSavingsBox.isPending,
  };
}
