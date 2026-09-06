import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Portfolio } from './usePortfolios';

export type InvestmentType = 'stock' | 'fii' | 'crypto' | 'fixed_income' | 'treasury' | 'etf' | 'bdr' | 'other';

export interface Investment {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  ticker: string;
  name: string;
  type: InvestmentType;
  quantity: number;
  purchase_price: number;
  current_price: number;
  purchase_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  investment_portfolios?: Portfolio;
}

export interface InvestmentFormData {
  portfolio_id?: string | null;
  ticker: string;
  name: string;
  type: InvestmentType;
  quantity: number;
  purchase_price: number;
  current_price: number;
  purchase_date: string;
  notes?: string;
}

export const INVESTMENT_TYPES: { value: InvestmentType; label: string }[] = [
  { value: 'stock', label: 'Ações' },
  { value: 'fii', label: 'Fundos Imobiliários' },
  { value: 'crypto', label: 'Criptomoedas' },
  { value: 'fixed_income', label: 'Renda Fixa' },
  { value: 'treasury', label: 'Tesouro Direto' },
  { value: 'etf', label: 'ETFs' },
  { value: 'bdr', label: 'BDRs' },
  { value: 'other', label: 'Outros' },
];

export function useInvestments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: investments = [], isLoading } = useQuery({
    queryKey: ['investments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('investments')
        .select('*, investment_portfolios(*, brokers(*))')
        .eq('user_id', user.id)
        .order('ticker');

      if (error) {
        console.error('Error fetching investments:', error);
        throw error;
      }

      return data as Investment[];
    },
    enabled: !!user?.id,
  });

  const createInvestment = useMutation({
    mutationFn: async (formData: InvestmentFormData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('investments')
        .insert({
          user_id: user.id,
          portfolio_id: formData.portfolio_id || null,
          ticker: formData.ticker.toUpperCase(),
          name: formData.name,
          type: formData.type,
          quantity: formData.quantity,
          purchase_price: formData.purchase_price,
          current_price: formData.current_price,
          purchase_date: formData.purchase_date,
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast({ title: 'Investimento adicionado com sucesso!' });
    },
    onError: (error) => {
      console.error('Error creating investment:', error);
      toast({ title: 'Erro ao adicionar investimento', variant: 'destructive' });
    },
  });

  const updateInvestment = useMutation({
    mutationFn: async ({ id, ...formData }: InvestmentFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('investments')
        .update({
          portfolio_id: formData.portfolio_id,
          ticker: formData.ticker.toUpperCase(),
          name: formData.name,
          type: formData.type,
          quantity: formData.quantity,
          purchase_price: formData.purchase_price,
          current_price: formData.current_price,
          purchase_date: formData.purchase_date,
          notes: formData.notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast({ title: 'Investimento atualizado com sucesso!' });
    },
    onError: (error) => {
      console.error('Error updating investment:', error);
      toast({ title: 'Erro ao atualizar investimento', variant: 'destructive' });
    },
  });

  const deleteInvestment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast({ title: 'Investimento excluído com sucesso!' });
    },
    onError: (error) => {
      console.error('Error deleting investment:', error);
      toast({ title: 'Erro ao excluir investimento', variant: 'destructive' });
    },
  });

  // Cálculos de resumo
  const totalInvested = investments.reduce((sum, inv) => sum + (inv.quantity * inv.purchase_price), 0);
  const totalCurrentValue = investments.reduce((sum, inv) => sum + (inv.quantity * inv.current_price), 0);
  const totalProfit = totalCurrentValue - totalInvested;
  const profitPercentage = totalInvested > 0 ? ((totalProfit / totalInvested) * 100) : 0;

  // Distribuição por tipo
  const distributionByType = investments.reduce((acc, inv) => {
    const value = inv.quantity * inv.current_price;
    acc[inv.type] = (acc[inv.type] || 0) + value;
    return acc;
  }, {} as Record<InvestmentType, number>);

  return {
    investments,
    isLoading,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    totalInvested,
    totalCurrentValue,
    totalProfit,
    profitPercentage,
    distributionByType,
  };
}
