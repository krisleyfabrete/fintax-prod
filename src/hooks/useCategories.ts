import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type Category = Tables<'categories'>;

export function useCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'created_at' | 'user_id' | 'is_default'>) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('categories')
        .insert({
          ...category,
          user_id: user.id,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar categoria: ${error.message}`);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar categoria: ${error.message}`);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir categoria: ${error.message}`);
    },
  });

  const incomeCategories = categories?.filter(c => c.type === 'income') || [];
  const expenseCategories = categories?.filter(c => c.type === 'expense') || [];

  return {
    categories: categories || [],
    incomeCategories,
    expenseCategories,
    isLoading,
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    isCreatingCategory: createCategoryMutation.isPending,
    isUpdatingCategory: updateCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
  };
}
