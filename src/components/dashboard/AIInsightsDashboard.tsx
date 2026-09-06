import { useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb,
  Trophy,
  Target,
  Wallet,
  Clock,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancialInsights } from '@/hooks/useFinancialInsights';
import { useNotifications } from '@/hooks/useNotifications';
import { useSubscription } from '@/hooks/useSubscription';
import { useUpgradeModal } from '@/components/subscription/UpgradeModal';
import { useNavigate } from 'react-router-dom';

interface AIInsightsDashboardProps {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  topCategories: { name: string; amount: number; type: string }[];
  budgets: { category: string; limit: number; spent: number }[];
  goals: { name: string; target: number; current: number; type: string }[];
  recentTransactions: { description: string; amount: number; type: string; date: string }[];
}

export function AIInsightsDashboard({
  totalIncome,
  totalExpenses,
  balance,
  topCategories,
  budgets,
  goals,
  recentTransactions,
}: AIInsightsDashboardProps) {
  const { insights, isLoading, error, lastUpdated, generateInsights } = useFinancialInsights();
  const { checkBudgetAlerts, checkGoalUpdates } = useNotifications();
  const { canAccess } = useSubscription();
  const { showUpgradeModal } = useUpgradeModal();
  const navigate = useNavigate();
  
  const canUseAI = canAccess('canUseAIInsights');

  const handleUpgradeClick = () => {
    showUpgradeModal('ai-insights');
  };

  const handleGenerateInsights = useCallback(async () => {
    if (!canUseAI) return;
    
    const result = await generateInsights({
      totalIncome,
      totalExpenses,
      balance,
      topCategories,
      budgets,
      goals,
      recentTransactions,
    });

    if (result) {
      checkBudgetAlerts(result.budgetAlerts);
      checkGoalUpdates(result.goalUpdates);
    }
  }, [canUseAI, generateInsights, totalIncome, totalExpenses, balance, topCategories, budgets, goals, recentTransactions, checkBudgetAlerts, checkGoalUpdates]);

  // Auto-generate insights on first load if we have data
  useEffect(() => {
    if (canUseAI && !insights && !isLoading && totalIncome + totalExpenses > 0) {
      handleGenerateInsights();
    }
  }, [canUseAI, handleGenerateInsights, insights, isLoading, totalExpenses, totalIncome]);

  if (!canUseAI) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Insights com IA
            <Badge variant="default" className="ml-2">Pro</Badge>
          </CardTitle>
          <CardDescription>
            Análise inteligente das suas finanças com inteligência artificial
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground mb-4 max-w-md">
            Obtenha análises personalizadas, previsões de gastos e recomendações inteligentes para suas finanças.
          </p>
          <Button onClick={handleUpgradeClick} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Fazer upgrade
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'tip':
        return <Lightbulb className="h-5 w-5 text-blue-500" />;
      case 'achievement':
        return <Trophy className="h-5 w-5 text-purple-500" />;
      default:
        return <Sparkles className="h-5 w-5 text-primary" />;
    }
  };

  const getInsightBgColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
      case 'tip':
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
      case 'achievement':
        return 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  if (totalIncome + totalExpenses === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Sem dados suficientes</h3>
          <p className="text-sm text-muted-foreground">
            Adicione transações para receber insights financeiros personalizados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Insights com IA</CardTitle>
              <CardDescription>
                Análise financeira personalizada
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateInsights}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Analisando...' : 'Atualizar'}
          </Button>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <Clock className="h-3 w-3" />
            Atualizado em {format(lastUpdated, "dd/MM 'às' HH:mm", { locale: ptBR })}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {isLoading && !insights && (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        )}

        {error && !insights && (
          <div className="text-center py-6">
            <AlertTriangle className="h-10 w-10 mx-auto text-destructive mb-3" />
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={handleGenerateInsights}>
              Tentar novamente
            </Button>
          </div>
        )}

        {insights && (
          <>
            {/* Summary */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium">{insights.summary}</p>
            </div>

            {/* Insights */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Insights
              </h4>
              {insights.insights?.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getInsightBgColor(insight.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{insight.title}</h5>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insight.description}
                      </p>
                      {insight.action && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          💡 {insight.action}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Budget Alerts */}
            {insights.budgetAlerts && insights.budgetAlerts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Alertas de Orçamento
                </h4>
                {insights.budgetAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      alert.percentUsed >= 90 
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' 
                        : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{alert.category}</span>
                      <Badge 
                        variant={alert.percentUsed >= 90 ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {alert.percentUsed}%
                      </Badge>
                    </div>
                    <Progress 
                      value={Math.min(alert.percentUsed, 100)} 
                      className="h-2 mb-2"
                    />
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Goal Updates */}
            {insights.goalUpdates && insights.goalUpdates.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Progresso de Metas
                </h4>
                {insights.goalUpdates.map((goal, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      goal.progress >= 100 
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{goal.name}</span>
                      <Badge 
                        variant={goal.progress >= 100 ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {goal.progress >= 100 ? '✓ Alcançada' : `${goal.progress}%`}
                      </Badge>
                    </div>
                    <Progress 
                      value={Math.min(goal.progress, 100)} 
                      className="h-2 mb-2"
                    />
                    <p className="text-xs text-muted-foreground">{goal.message}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
