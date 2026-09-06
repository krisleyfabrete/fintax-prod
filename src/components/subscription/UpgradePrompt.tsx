import { ReactNode } from 'react';
import { Crown, Lock, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription, SubscriptionPlan } from '@/hooks/useSubscription';
import { useUpgradeModal } from '@/components/subscription/UpgradeModal';

interface UpgradePromptProps {
  feature: string;
  description?: string;
  requiredPlan?: SubscriptionPlan;
  children?: ReactNode;
  variant?: 'card' | 'inline' | 'overlay';
}

export function UpgradePrompt({
  feature,
  description,
  requiredPlan = 'pro',
  children,
  variant = 'card',
}: UpgradePromptProps) {
  const { plan, getPlanLabel } = useSubscription();
  const { showUpgradeModal } = useUpgradeModal();

  const planLabel = getPlanLabel(requiredPlan);

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <Lock className="h-4 w-4 text-primary" />
        <span className="text-sm">
          {feature} requer o plano{' '}
          <Badge variant="default" className="ml-1">
            {planLabel}
          </Badge>
        </span>
        <Button size="sm" variant="outline" onClick={() => showUpgradeModal(feature, requiredPlan)} className="ml-auto">
          Fazer upgrade
        </Button>
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className="relative">
        {children}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">{feature}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {description || `Esta funcionalidade está disponível no plano ${planLabel}`}
            </p>
            <Button onClick={() => showUpgradeModal(feature, requiredPlan)} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Fazer upgrade
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
          <Crown className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          {feature}
          <Badge variant="default">{planLabel}</Badge>
        </CardTitle>
        <CardDescription>
          {description || `Disponível no plano ${planLabel}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={() => showUpgradeModal(feature, requiredPlan)} size="lg" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Solicitar acesso
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          Seu plano atual: <span className="font-medium">{getPlanLabel(plan)}</span>
        </p>
      </CardContent>
    </Card>
  );
}

interface FeatureGateProps {
  feature: keyof ReturnType<typeof useSubscription>['limits'];
  children: ReactNode;
  fallback?: ReactNode;
  featureLabel: string;
  featureDescription?: string;
  requiredPlan?: SubscriptionPlan;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  featureLabel,
  featureDescription,
  requiredPlan = 'pro',
}: FeatureGateProps) {
  const { canAccess } = useSubscription();

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <UpgradePrompt
      feature={featureLabel}
      description={featureDescription}
      requiredPlan={requiredPlan}
    />
  );
}

interface LimitGateProps {
  limit: 'maxAccounts' | 'maxTransactionsPerMonth' | 'maxGoals' | 'maxBudgets';
  currentCount: number;
  children: ReactNode;
  onLimitReached?: () => void;
  limitLabel: string;
}

export function LimitGate({
  limit,
  currentCount,
  children,
  onLimitReached,
  limitLabel,
}: LimitGateProps) {
  const { checkLimit, limits, getPlanLabel } = useSubscription();
  const { showUpgradeModal } = useUpgradeModal();

  const withinLimit = checkLimit(limit, currentCount);
  const maxValue = limits[limit];

  if (withinLimit) {
    return <>{children}</>;
  }

  return (
    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
      <div className="flex items-start gap-3">
        <Lock className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-yellow-700 dark:text-yellow-400">
            Limite atingido
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Você atingiu o limite de {maxValue} {limitLabel} do seu plano. Solicite um upgrade para continuar.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onLimitReached?.();
              showUpgradeModal('unlimited-transactions', 'pro');
            }}
            className="mt-3"
          >
            Solicitar acesso
          </Button>
        </div>
      </div>
    </div>
  );
}
