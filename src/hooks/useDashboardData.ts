import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  balanceChange: number;
  incomeChange: number;
  expenseChange: number;
}

export interface Transaction {
  id: string;
  description: string | null;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: {
    name: string;
    icon: string;
    color: string;
  } | null;
  account: {
    name: string;
  };
}

export interface CategoryExpense {
  name: string;
  amount: number;
  color: string;
  icon: string;
  percentage: number;
}

export function useDashboardData() {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Buscar saldo total das contas
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Buscar transações do mês atual
  const { data: monthlyTransactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['transactions', 'monthly', user?.id, format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, icon, color),
          account:accounts(name)
        `)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Buscar últimas transações
  const { data: recentTransactions, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['transactions', 'recent', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, icon, color),
          account:accounts(name)
        `)
        .order('date', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });

  // Calcular estatísticas
  const stats: DashboardStats = {
    totalBalance: accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0,
    monthlyIncome: monthlyTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0,
    monthlyExpenses: monthlyTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0,
    balanceChange: 0,
    incomeChange: 0,
    expenseChange: 0,
  };

  // Calcular gastos por categoria
  const categoryExpenses: CategoryExpense[] = [];
  if (monthlyTransactions) {
    const expensesByCategory = monthlyTransactions
      .filter(t => t.type === 'expense' && t.category)
      .reduce((acc, t) => {
        const catName = t.category?.name || 'Outros';
        if (!acc[catName]) {
          acc[catName] = {
            name: catName,
            amount: 0,
            color: t.category?.color || '#8B5CF6',
            icon: t.category?.icon || 'tag',
          };
        }
        acc[catName].amount += Number(t.amount);
        return acc;
      }, {} as Record<string, { name: string; amount: number; color: string; icon: string }>);

    const totalExpenses = Object.values(expensesByCategory).reduce((sum, cat) => sum + cat.amount, 0);
    
    Object.values(expensesByCategory)
      .sort((a, b) => b.amount - a.amount)
      .forEach(cat => {
        categoryExpenses.push({
          ...cat,
          percentage: totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0,
        });
      });
  }

  return {
    stats,
    recentTransactions: recentTransactions || [],
    categoryExpenses,
    isLoading: isLoadingAccounts || isLoadingTransactions || isLoadingRecent,
  };
}
