import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { initDB, bulkSaveToStore, clearExpiredCache } from '@/lib/offlineStorage';

interface OfflineProviderContextType {
  isInitialized: boolean;
}

const OfflineProviderContext = createContext<OfflineProviderContextType>({
  isInitialized: false,
});

export function useOfflineProvider() {
  return useContext(OfflineProviderContext);
}

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize IndexedDB and cache data on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        await clearExpiredCache();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize offline storage:', error);
      }
    };

    initialize();
  }, []);

  // Cache user data when authenticated
  useEffect(() => {
    if (!user || !isInitialized) return;

    const cacheUserData = async () => {
      try {
        // Cache transactions
        const { data: transactions } = await supabase
          .from('transactions')
          .select('*, categories(*), accounts(*)')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(100);

        if (transactions) {
          await bulkSaveToStore('transactions', transactions);
        }

        // Cache accounts
        const { data: accounts } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id);

        if (accounts) {
          await bulkSaveToStore('accounts', accounts);
        }

        // Cache categories
        const { data: categories } = await supabase
          .from('categories')
          .select('*')
          .or(`user_id.eq.${user.id},is_default.eq.true`);

        if (categories) {
          await bulkSaveToStore('categories', categories);
        }

        // Cache budgets
        const { data: budgets } = await supabase
          .from('budgets')
          .select('*, categories(*)')
          .eq('user_id', user.id);

        if (budgets) {
          await bulkSaveToStore('budgets', budgets);
        }

        // Cache goals
        const { data: goals } = await supabase
          .from('goals')
          .select('*, categories(*)')
          .eq('user_id', user.id);

        if (goals) {
          await bulkSaveToStore('goals', goals);
        }

        console.log('User data cached for offline use');
      } catch (error) {
        console.error('Failed to cache user data:', error);
      }
    };

    // Cache data on login and periodically
    cacheUserData();
    const interval = setInterval(cacheUserData, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [user, isInitialized]);

  // Listen for service worker messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_REQUIRED') {
        // Trigger a sync
        window.dispatchEvent(new CustomEvent('app:online'));
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <OfflineProviderContext.Provider value={{ isInitialized }}>
      {children}
    </OfflineProviderContext.Provider>
  );
}
