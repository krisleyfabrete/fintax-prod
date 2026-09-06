import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    if (wasOffline) {
      toast.success('Conexão restaurada! Sincronizando dados...');
      // Dispatch custom event for sync
      window.dispatchEvent(new CustomEvent('app:online'));
    }
    setWasOffline(false);
  }, [wasOffline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
    toast.warning('Você está offline. Os dados serão salvos localmente.');
    window.dispatchEvent(new CustomEvent('app:offline'));
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
}
