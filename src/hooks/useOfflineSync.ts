import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getSyncQueue,
  removeFromSyncQueue,
  updateSyncQueueItem,
  getSyncQueueCount,
  initDB,
  SyncQueueItem,
} from '@/lib/offlineStorage';

const MAX_RETRIES = 3;

export function useOfflineSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Initialize DB on mount
  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getSyncQueueCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Error getting sync queue count:', error);
    }
  }, []);

  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, [updatePendingCount]);

  // Process a single sync item
  const processSyncItem = useCallback(async (item: SyncQueueItem): Promise<boolean> => {
    try {
      const { table, operation, data } = item;

      switch (operation) {
        case 'insert': {
          const { error } = await supabase.from(table).insert(data);
          if (error) throw error;
          break;
        }
        case 'update': {
          const { id, ...updates } = data;
          const { error } = await supabase.from(table).update(updates).eq('id', id);
          if (error) throw error;
          break;
        }
        case 'delete': {
          const { error } = await supabase.from(table).delete().eq('id', data.id);
          if (error) throw error;
          break;
        }
      }

      return true;
    } catch (error) {
      console.error('Error processing sync item:', error);
      return false;
    }
  }, []);

  // Sync all pending items
  const syncPendingItems = useCallback(async () => {
    if (!user || isSyncing) return;

    setIsSyncing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const queue = await getSyncQueue();

      for (const item of queue) {
        const success = await processSyncItem(item);

        if (success) {
          await removeFromSyncQueue(item.id);
          successCount++;
        } else {
          if (item.retries >= MAX_RETRIES) {
            // Remove permanently failed items
            await removeFromSyncQueue(item.id);
            failCount++;
          } else {
            // Increment retry count
            await updateSyncQueueItem(item.id, { retries: item.retries + 1 });
          }
        }
      }

      // Invalidate queries to refresh data
      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
        queryClient.invalidateQueries({ queryKey: ['goals'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`${successCount} item(s) sincronizado(s) com sucesso!`);
      } else if (failCount > 0) {
        toast.warning(`${successCount} sincronizado(s), ${failCount} falha(s)`);
      }

      await updatePendingCount();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erro durante a sincronização');
    } finally {
      setIsSyncing(false);
    }
  }, [user, isSyncing, processSyncItem, queryClient, updatePendingCount]);

  // Listen for online event
  useEffect(() => {
    const handleOnline = () => {
      if (navigator.onLine) {
        syncPendingItems();
      }
    };

    window.addEventListener('app:online', handleOnline);
    window.addEventListener('online', handleOnline);

    // Sync on mount if online and has pending items
    if (navigator.onLine) {
      syncPendingItems();
    }

    return () => {
      window.removeEventListener('app:online', handleOnline);
      window.removeEventListener('online', handleOnline);
    };
  }, [syncPendingItems]);

  return {
    isSyncing,
    pendingCount,
    syncPendingItems,
    updatePendingCount,
  };
}
