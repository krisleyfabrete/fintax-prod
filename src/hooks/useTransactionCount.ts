import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export function useTransactionCount() {
  const { user } = useAuth();
  
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: count = 0, isLoading } = useQuery({
    queryKey: ['transaction-count', user?.id, monthStart],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  return {
    count,
    isLoading,
    monthStart,
    monthEnd,
  };
}
