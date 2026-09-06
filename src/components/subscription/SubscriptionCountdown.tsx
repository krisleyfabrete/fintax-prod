import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, Crown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSubscription } from '@/hooks/useSubscription';
import { differenceInDays, differenceInHours, differenceInMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SubscriptionCountdown() {
  const { subscription, plan, isPro } = useSubscription();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [daysLeft, setDaysLeft] = useState<number>(0);

  useEffect(() => {
    if (!subscription?.current_period_end) return;

    const updateCountdown = () => {
      const endDate = new Date(subscription.current_period_end!);
      const now = new Date();

      const days = differenceInDays(endDate, now);
      const hours = differenceInHours(endDate, now) % 24;
      const minutes = differenceInMinutes(endDate, now) % 60;

      setDaysLeft(days);

      if (days > 0) {
        setTimeLeft(`${days} dia${days > 1 ? 's' : ''} e ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}min`);
      } else {
        setTimeLeft(`${minutes} minuto${minutes > 1 ? 's' : ''}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [subscription?.current_period_end]);

  if (!isPro || !subscription?.current_period_end) return null;

  const endDate = new Date(subscription.current_period_end);
  const isExpiringSoon = daysLeft <= 7;
  const isExpiringVeryClose = daysLeft <= 3;

  if (!isExpiringSoon) return null;

  return (
    <Alert 
      variant={isExpiringVeryClose ? 'destructive' : 'default'} 
      className="mb-4"
    >
      {isExpiringVeryClose ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <AlertTitle className="flex items-center gap-2 flex-wrap">
        <Crown className="h-4 w-4" />
        {isExpiringVeryClose ? 'Seu plano expirando!' : 'Seu plano está próximo do fim'}
      </AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
        <div className="space-y-1">
          <p>
            Seu plano <strong>{plan === 'pro' ? 'Pro' : 'Familiar'}</strong> vigora até{' '}
            <strong>{format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</strong>{' '}
            ({timeLeft}).
          </p>
          <p className="text-sm text-muted-foreground">
            Para renovar ou alterar o plano, entre em contato com a administração.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}