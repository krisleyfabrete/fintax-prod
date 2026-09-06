import { AlertTriangle, Crown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useUpgradeModal } from '@/components/subscription/UpgradeModal';

interface AccountLimitBannerProps {
  currentCount: number;
}

export function AccountLimitBanner({ currentCount }: AccountLimitBannerProps) {
  const { limits, isUnlimited, plan } = useSubscription();
  const { showUpgradeModal } = useUpgradeModal();
  
  if (isUnlimited('maxAccounts')) return null;
  
  const maxAccounts = limits.maxAccounts;
  const remaining = maxAccounts - currentCount;
  const isAtLimit = remaining <= 0;
  const isNearLimit = remaining === 1;
  
  if (!isAtLimit && !isNearLimit) return null;

  const planLabel = plan === 'free' ? 'gratuito' : plan === 'pro' ? 'Pro' : 'Familiar';

  return (
    <Alert variant={isAtLimit ? 'destructive' : 'default'} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {isAtLimit ? 'Limite de contas atingido' : 'Quase no limite'}
      </AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
        <span>
          {isAtLimit 
            ? `Você atingiu o limite de ${maxAccounts} contas do plano ${planLabel}.`
            : `Você ainda pode criar mais ${remaining} conta no plano ${planLabel}.`
          }
        </span>
        <Button 
          size="sm" 
          variant={isAtLimit ? 'default' : 'outline'}
          className="gap-2 shrink-0"
          onClick={() => showUpgradeModal('unlimited-accounts')}
        >
          <Crown className="h-4 w-4" />
          Fazer upgrade
        </Button>
      </AlertDescription>
    </Alert>
  );
}
