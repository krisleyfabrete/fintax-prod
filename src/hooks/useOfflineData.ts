import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  addToSyncQueue,
  saveToStore,
  getAllFromStore,
  deleteFromStore,
  bulkSaveToStore,
  cacheData,
  getCachedData,
} from '@/lib/offlineStorage';

interface OfflineOperations<T> {
  getOfflineData: () => Promise<T[]>;
  saveOfflineData: (data: T[]) => Promise<void>;
  addOfflineItem: (data: T) => Promise<void>;
  updateOfflineItem: (data: T) => Promise<void>;
  deleteOfflineItem: (id: string) => Promise<void>;
  queueForSync: (operation: 'insert' | 'update' | 'delete', data: unknown) => Promise<void>;
}

export function useOfflineData<T extends { id: string }>(
  tableName: string,
  storeName: string
): OfflineOperations<T> {
  const { user } = useAuth();

  const getOfflineData = useCallback(async (): Promise<T[]> => {
    try {
      return await getAllFromStore<T>(storeName);
    } catch (error) {
      console.error(`Error getting offline data for ${storeName}:`, error);
      return [];
    }
  }, [storeName]);

  const saveOfflineData = useCallback(async (data: T[]): Promise<void> => {
    try {
      await bulkSaveToStore(storeName, data);
    } catch (error) {
      console.error(`Error saving offline data for ${storeName}:`, error);
    }
  }, [storeName]);

  const addOfflineItem = useCallback(async (data: T): Promise<void> => {
    try {
      await saveToStore(storeName, data);
    } catch (error) {
      console.error(`Error adding offline item to ${storeName}:`, error);
    }
  }, [storeName]);

  const updateOfflineItem = useCallback(async (data: T): Promise<void> => {
    try {
      await saveToStore(storeName, data);
    } catch (error) {
      console.error(`Error updating offline item in ${storeName}:`, error);
    }
  }, [storeName]);

  const deleteOfflineItem = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteFromStore(storeName, id);
    } catch (error) {
      console.error(`Error deleting offline item from ${storeName}:`, error);
    }
  }, [storeName]);

  const queueForSync = useCallback(async (
    operation: 'insert' | 'update' | 'delete',
    data: unknown
  ): Promise<void> => {
    try {
      await addToSyncQueue({
        table: tableName,
        operation,
        data,
      });
    } catch (error) {
      console.error(`Error queuing for sync:`, error);
    }
  }, [tableName]);

  return {
    getOfflineData,
    saveOfflineData,
    addOfflineItem,
    updateOfflineItem,
    deleteOfflineItem,
    queueForSync,
  };
}

// Helper to decide whether to use online or offline data
export async function fetchWithOfflineFallback<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  cacheTtlMinutes: number = 30
): Promise<T | null> {
  // If online, try to fetch fresh data
  if (navigator.onLine) {
    try {
      const data = await fetchFn();
      // Cache the fresh data
      await cacheData(cacheKey, data, cacheTtlMinutes);
      return data;
    } catch (error) {
      console.error('Online fetch failed, falling back to cache:', error);
      // Fall back to cached data
      return await getCachedData<T>(cacheKey);
    }
  } else {
    // Offline - use cached data
    return await getCachedData<T>(cacheKey);
  }
}
