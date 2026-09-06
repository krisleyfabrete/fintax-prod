import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NotificationSettings {
  budgetAlerts: boolean;
  goalAlerts: boolean;
  browserNotifications: boolean;
}

interface BudgetAlert {
  category: string;
  percentUsed: number;
  message: string;
}

interface GoalUpdate {
  name: string;
  progress: number;
  message: string;
}

export function useNotifications() {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('notification-settings');
    return saved ? JSON.parse(saved) : {
      budgetAlerts: true,
      goalAlerts: true,
      browserNotifications: false,
    };
  });

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('notification-settings', JSON.stringify(settings));
  }, [settings]);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notificações não suportadas',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      setSettings(prev => ({ ...prev, browserNotifications: true }));
      toast({
        title: 'Notificações ativadas',
        description: 'Você receberá alertas sobre orçamentos e metas.',
      });
      return true;
    } else {
      toast({
        title: 'Permissão negada',
        description: 'Você pode ativar notificações nas configurações do navegador.',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const sendBrowserNotification = useCallback((title: string, body: string, icon?: string) => {
    if (permission === 'granted' && settings.browserNotifications) {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'finance-alert',
        requireInteraction: false,
      });
    }
  }, [permission, settings.browserNotifications]);

  const checkBudgetAlerts = useCallback((alerts: BudgetAlert[]) => {
    if (!settings.budgetAlerts) return;

    alerts.forEach(alert => {
      if (alert.percentUsed >= 90) {
        const title = `⚠️ Orçamento crítico: ${alert.category}`;
        const body = alert.message;
        
        toast({
          title,
          description: body,
          variant: 'destructive',
        });
        
        sendBrowserNotification(title, body);
      } else if (alert.percentUsed >= 75) {
        const title = `📊 Orçamento em alerta: ${alert.category}`;
        const body = alert.message;
        
        toast({
          title,
          description: body,
        });
        
        sendBrowserNotification(title, body);
      }
    });
  }, [settings.budgetAlerts, toast, sendBrowserNotification]);

  const checkGoalUpdates = useCallback((updates: GoalUpdate[]) => {
    if (!settings.goalAlerts) return;

    updates.forEach(update => {
      if (update.progress >= 100) {
        const title = `🎉 Meta alcançada: ${update.name}`;
        const body = update.message;
        
        toast({
          title,
          description: body,
        });
        
        sendBrowserNotification(title, body);
      } else if (update.progress >= 75) {
        const title = `🎯 Quase lá: ${update.name}`;
        const body = update.message;
        
        toast({
          title,
          description: body,
        });
      }
    });
  }, [settings.goalAlerts, toast, sendBrowserNotification]);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return {
    permission,
    settings,
    requestPermission,
    updateSettings,
    checkBudgetAlerts,
    checkGoalUpdates,
    sendBrowserNotification,
  };
}
