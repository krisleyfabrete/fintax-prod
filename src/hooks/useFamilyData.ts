import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FamilyDataFilters {
  memberId?: string;
  startDate?: string;
  endDate?: string;
}

export function useFamilyData(groupId: string | null, filters?: FamilyDataFilters) {
  const { user } = useAuth();

  // Get all member user IDs for the group
  const { data: memberIds = [] } = useQuery({
    queryKey: ['family-member-ids', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .rpc('get_group_members_with_profiles', { _group_id: groupId });

      if (error) throw error;
      return (data || []).map((m: { user_id: string }) => m.user_id);
    },
    enabled: !!groupId && !!user,
  });

  // Get shared transactions from family members
  const { data: sharedTransactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['family-shared-transactions', groupId, memberIds, filters],
    queryFn: async () => {
      if (!groupId || memberIds.length === 0) return [];

      const query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*),
          account:accounts(name, color, icon)
        `)
        .in('user_id', filters?.memberId ? [filters.memberId] : memberIds)
        .eq('is_shared_with_family', true)
        .order('date', { ascending: false });

      let finalQuery = query;
      if (filters?.startDate) {
        finalQuery = finalQuery.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        finalQuery = finalQuery.lte('date', filters.endDate);
      }

      const { data, error } = await finalQuery.limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!groupId && memberIds.length > 0,
  });

  // Get shared accounts from family members
  const { data: sharedAccounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['family-shared-accounts', groupId, memberIds, filters?.memberId],
    queryFn: async () => {
      if (!groupId || memberIds.length === 0) return [];

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .in('user_id', filters?.memberId ? [filters.memberId] : memberIds)
        .eq('is_shared_with_family', true);

      if (error) throw error;
      return data;
    },
    enabled: !!groupId && memberIds.length > 0,
  });

  // Get shared budgets from family members
  const { data: sharedBudgets = [], isLoading: isLoadingBudgets } = useQuery({
    queryKey: ['family-shared-budgets', groupId, memberIds, filters?.memberId],
    queryFn: async () => {
      if (!groupId || memberIds.length === 0) return [];

      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          category:categories(*)
        `)
        .in('user_id', filters?.memberId ? [filters.memberId] : memberIds)
        .eq('is_shared_with_family', true);

      if (error) throw error;
      return data;
    },
    enabled: !!groupId && memberIds.length > 0,
  });

  // Get shared goals from family members
  const { data: sharedGoals = [], isLoading: isLoadingGoals } = useQuery({
    queryKey: ['family-shared-goals', groupId, memberIds, filters?.memberId],
    queryFn: async () => {
      if (!groupId || memberIds.length === 0) return [];

      const { data, error } = await supabase
        .from('goals')
        .select(`
          *,
          category:categories(*)
        `)
        .in('user_id', filters?.memberId ? [filters.memberId] : memberIds)
        .eq('is_shared_with_family', true);

      if (error) throw error;
      return data;
    },
    enabled: !!groupId && memberIds.length > 0,
  });

  // Get shared debts from family members
  const { data: sharedDebts = [], isLoading: isLoadingDebts } = useQuery({
    queryKey: ['family-shared-debts', groupId, memberIds, filters?.memberId],
    queryFn: async () => {
      if (!groupId || memberIds.length === 0) return [];

      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .in('user_id', filters?.memberId ? [filters.memberId] : memberIds)
        .in('visibility', ['shared', 'household'])
        .eq('household_id', groupId);

      if (error) throw error;
      return data;
    },
    enabled: !!groupId && memberIds.length > 0,
  });

  // Get shared savings boxes from family members
  const { data: sharedSavingsBoxes = [], isLoading: isLoadingSavingsBoxes } = useQuery({
    queryKey: ['family-shared-savings-boxes', groupId, memberIds, filters?.memberId],
    queryFn: async () => {
      if (!groupId || memberIds.length === 0) return [];

      const { data, error } = await supabase
        .from('savings_boxes')
        .select('*')
        .in('user_id', filters?.memberId ? [filters.memberId] : memberIds)
        .eq('is_shared_with_family', true)
        .eq('household_id', groupId);

      if (error) throw error;
      return data;
    },
    enabled: !!groupId && memberIds.length > 0,
  });

  // Get profiles for members to show who shared what
  const { data: memberProfiles = [] } = useQuery({
    queryKey: ['family-member-profiles', memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', memberIds);

      if (error) throw error;
      return data;
    },
    enabled: memberIds.length > 0,
  });

  const getMemberName = (userId: string) => {
    const profile = memberProfiles.find(p => p.id === userId);
    return profile?.full_name || 'Membro';
  };

  // Calculate summary
  const totalSharedIncome = sharedTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSharedExpense = sharedTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSharedBalance = sharedAccounts
    .reduce((sum, a) => sum + Number(a.balance), 0);

  return {
    sharedTransactions,
    sharedAccounts,
    sharedBudgets,
    sharedGoals,
    sharedDebts,
    sharedSavingsBoxes,
    memberProfiles,
    memberIds,
    getMemberName,
    totalSharedIncome,
    totalSharedExpense,
    totalSharedBalance,
    isLoading: isLoadingTransactions || isLoadingAccounts || isLoadingBudgets || isLoadingGoals || isLoadingDebts || isLoadingSavingsBoxes,
  };
}
