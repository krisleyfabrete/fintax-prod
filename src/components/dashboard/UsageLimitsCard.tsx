import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useTransactionCount } from '@/hooks/useTransactionCount';
import { useAccounts } from '@/hooks/useAccounts';
import { useBudgets } from '@/hooks/useBudgets';
import { useGoals } from '@/hooks/useGoals';
import { useUpgradeModal } from '@/components/subscription/UpgradeModal';
import { 
  Receipt, 
  Wallet, 
  Target, 
  PieChart, 
  TrendingUp,
  Infinity as InfinityIcon,
  Sparkles
} from 'lucide-react';

interface LimitItemProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  limit: number;
  isUnlimited: boolean;
}

function LimitItem({ icon, label, current, limit, isUnlimited }: LimitItemProps) {
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${isAtLimit ? 'bg-destructive/10 text-destructive' : isNearLimit ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
            {icon}
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className={isAtLimit ? 'text-destructive font-semibold' : isNearLimit ? 'text-warning font-medium' : 'text-muted-foreground'}>
            {current}
          </span>
          <span className="text-muted-foreground">/</span>
          {isUnlimited ? (
            <InfinityIcon className="h-4 w-4 text-primary" />
          ) : (
            <span className="text-muted-foreground">{limit}</span>
          )}
        </div>
      </div>
      {!isUnlimited && (
        <Progress 
          value={percentage} 
          className={`h-1.5 ${isAtLimit ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-warning' : ''}`}
        />
      )}
      {isUnlimited && (
        <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40 animate-pulse" />
        </div>
      )}
    </div>
  );
}

export function UsageLimitsCard() {
  const { plan, limits, isUnlimited, getPlanLabel } = useSubscription();
  const { count: transactionCount, isLoading: isLoadingTransactions } = useTransactionCount();
  const { accounts, isLoading: isLoadingAccounts } = useAccounts();
  const { budgets, isLoading: isLoadingBudgets } = useBudgets(new Date().getMonth() + 1, new Date().getFullYear());
  const { goals, isLoading: isLoadingGoals } = useGoals();
  const { showUpgradeModal } = useUpgradeModal();

  const isLoading = isLoadingTransactions || isLoadingAccounts || isLoadingBudgets || isLoadingGoals;

  const accountCount = accounts?.length || 0;
  const budgetCount = budgets?.length || 0;
  const goalCount = goals?.length || 0;

  // Check if any limit is near or at max
  const hasNearLimit = !isUnlimited('maxTransactionsPerMonth') && transactionCount >= limits.maxTransactionsPerMonth * 0.8 ||
    !isUnlimited('maxAccounts') && accountCount >= limits.maxAccounts * 0.8 ||
    !isUnlimited('maxBudgets') && budgetCount >= limits.maxBudgets * 0.8 ||
    !isUnlimited('maxGoals') && goalCount >= limits.maxGoals * 0.8;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-1.5 bg-muted rounded w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={hasNearLimit && plan === 'free' ? 'border-warning/50 bg-warning/5' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Uso do Plano
          </CardTitle>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            plan === 'free' ? 'bg-muted text-muted-foreground' : 
            plan === 'pro' ? 'bg-primary/10 text-primary' : 
            'bg-gradient-to-r from-primary/10 to-accent/10 text-primary'
          }`}>
            {getPlanLabel(plan)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <LimitItem
          icon={<Receipt className="h-3.5 w-3.5" />}
          label="Transações/mês"
          current={transactionCount}
          limit={limits.maxTransactionsPerMonth}
          isUnlimited={isUnlimited('maxTransactionsPerMonth')}
        />
        
        <LimitItem
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Contas"
          current={accountCount}
          limit={limits.maxAccounts}
          isUnlimited={isUnlimited('maxAccounts')}
        />
        
        <LimitItem
          icon={<PieChart className="h-3.5 w-3.5" />}
          label="Orçamentos"
          current={budgetCount}
          limit={limits.maxBudgets}
          isUnlimited={isUnlimited('maxBudgets')}
        />
        
        <LimitItem
          icon={<Target className="h-3.5 w-3.5" />}
          label="Metas"
          current={goalCount}
          limit={limits.maxGoals}
          isUnlimited={isUnlimited('maxGoals')}
        />

        {plan === 'free' && (
          <Button 
            onClick={() => showUpgradeModal(hasNearLimit ? 'unlimited-transactions' : 'unlimited-accounts', 'pro')} 
            className="w-full mt-2 gap-2"
            variant={hasNearLimit ? 'default' : 'outline'}
            size="sm"
          >
            <Sparkles className="h-4 w-4" />
            {hasNearLimit ? 'Solicitar upgrade' : 'Ver recursos'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
