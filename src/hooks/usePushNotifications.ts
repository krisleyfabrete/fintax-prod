import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
}

export function usePushNotifications() {
  const { toast } = useToast();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    if (isSupported) {
      setState({
        isSupported: true,
        permission: Notification.permission,
        isSubscribed: Notification.permission === 'granted',
      });

      // Register service worker
      if (navigator.serviceWorker) {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
          console.log('Service Worker registered:', registration);
        }).catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
      }
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast({
        title: 'Não suportado',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);

    try {
      const permission = await Notification.requestPermission();
      
      setState(prev => ({
        ...prev,
        permission,
        isSubscribed: permission === 'granted',
      }));

      if (permission === 'granted') {
        toast({
          title: 'Notificações ativadas!',
          description: 'Você receberá alertas de orçamento e lembretes de metas.',
        });
        return true;
      } else if (permission === 'denied') {
        toast({
          title: 'Permissão negada',
          description: 'Você não receberá notificações. Altere nas configurações do navegador.',
          variant: 'destructive',
        });
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar as notificações.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [state.isSupported, toast]);

  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (state.permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } catch (error) {
      // Fallback for service worker notifications
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            ...options,
          });
        });
      }
    }
  }, [state.permission]);

  const sendBudgetAlert = useCallback((categoryName: string, percentUsed: number) => {
    const isOver = percentUsed >= 100;
    sendLocalNotification(
      isOver ? '⚠️ Orçamento excedido!' : '⚠️ Orçamento próximo do limite',
      {
        body: isOver 
          ? `Você ultrapassou o orçamento de ${categoryName}.`
          : `Você já usou ${percentUsed}% do orçamento de ${categoryName}.`,
        tag: `budget-${categoryName}`,
        requireInteraction: isOver,
      }
    );
  }, [sendLocalNotification]);

  const sendGoalReminder = useCallback((goalName: string, progress: number) => {
    const isComplete = progress >= 100;
    sendLocalNotification(
      isComplete ? '🎉 Meta alcançada!' : '🎯 Lembrete de meta',
      {
        body: isComplete
          ? `Parabéns! Você atingiu sua meta "${goalName}"!`
          : `Não esqueça de contribuir para "${goalName}". Progresso: ${progress}%`,
        tag: `goal-${goalName}`,
      }
    );
  }, [sendLocalNotification]);

  return {
    isSupported: state.isSupported,
    permission: state.permission,
    isSubscribed: state.isSubscribed,
    isLoading,
    requestPermission,
    sendLocalNotification,
    sendBudgetAlert,
    sendGoalReminder,
  };
}
