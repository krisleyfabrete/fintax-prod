import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  user_id: string | null;
  created_at: string;
}

export interface CreateSubcategoryData {
  category_id: string;
  name: string;
  icon?: string;
  color?: string;
}

export function useSubcategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subcategories = [], isLoading, error, refetch } = useQuery({
    queryKey: ['subcategories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching subcategories:', error);
        throw error;
      }

      return data as Subcategory[];
    },
    enabled: !!user?.id,
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: async (data: CreateSubcategoryData) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data: newSubcategory, error } = await supabase
        .from('subcategories')
        .insert({
          category_id: data.category_id,
          name: data.name,
          icon: data.icon || 'tag',
          color: data.color || '#8B5CF6',
          user_id: user.id,
          is_default: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating subcategory:', error);
        throw error;
      }

      return newSubcategory as Subcategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      toast.success('Subcategoria criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar subcategoria: ${error.message}`);
    },
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: async (subcategoryId: string) => {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', subcategoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      toast.success('Subcategoria excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir subcategoria: ${error.message}`);
    },
  });

  const getSubcategoriesByCategory = (categoryId: string): Subcategory[] => {
    return subcategories.filter(sub => sub.category_id === categoryId);
  };

  return {
    subcategories,
    isLoading,
    error,
    refetch,
    getSubcategoriesByCategory,
    createSubcategory: createSubcategoryMutation.mutateAsync,
    isCreating: createSubcategoryMutation.isPending,
    deleteSubcategory: deleteSubcategoryMutation.mutateAsync,
    isDeleting: deleteSubcategoryMutation.isPending,
  };
}
