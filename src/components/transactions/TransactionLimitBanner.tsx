import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTransactionCount } from '@/hooks/useTransactionCount';
import { useSubscription } from '@/hooks/useSubscription';
import { useUpgradeModal } from '@/components/subscription/UpgradeModal';

export function TransactionLimitBanner() {
  const { count } = useTransactionCount();
  const { limits, isUnlimited } = useSubscription();
  const { showUpgradeModal } = useUpgradeModal();

  const limit = limits.maxTransactionsPerMonth;

  // Don't show for unlimited plans
  if (isUnlimited('maxTransactionsPerMonth')) return null;

  const percentage = limit > 0 ? (count / limit) * 100 : 0;
  const remaining = limit - count;
  const isWarning = percentage >= 75;
  const isLimitReached = percentage >= 100;

  if (percentage < 50) return null;

  return (
    <div
      className={`p-4 rounded-lg border ${
        isLimitReached
          ? 'bg-destructive/10 border-destructive/30'
          : isWarning
          ? 'bg-yellow-500/10 border-yellow-500/30'
          : 'bg-muted/50 border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {isLimitReached ? (
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          ) : (
            <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5" />
          )}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="font-medium">
                {isLimitReached ? 'Limite de transações atingido' : 'Você está próximo do limite'}
              </p>
              <Badge variant={isLimitReached ? 'destructive' : 'secondary'}>
                {count}/{limit}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {isLimitReached
                ? 'Faça upgrade para continuar registrando transações este mês.'
                : `Restam ${remaining} transações disponíveis neste mês.`}
            </p>
            <Progress value={Math.min(percentage, 100)} className="h-2 w-48" />
          </div>
        </div>
        <Button size="sm" onClick={() => showUpgradeModal('unlimited-transactions')}>
          Ver planos
        </Button>
      </div>
    </div>
  );
}
