import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGoals } from '@/hooks/useGoals';
import { useAutoDeposits } from '@/hooks/useAutoDeposits';
import { PiggyBank, TrendingUp, CalendarCheck, ArrowRight, Sparkles } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface GoalWithPrediction {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  monthsRemaining: number | null;
  predictedDate: string | null;
  hasAutoDeposit: boolean;
  autoDepositAmount: number;
}

export function SavingsGoalsWidget() {
  const { goals, isLoading } = useGoals();
  const { autoDeposits } = useAutoDeposits();

  const savingsGoals = useMemo(() => {
    const targetGoals = goals.filter(g => g.goal_type === 'target' && g.is_active);

    return targetGoals.map(goal => {
      const autoDeposit = autoDeposits.find(ad => ad.goal_id === goal.id && ad.is_active);
      const currentAmount = Number(goal.current_amount);
      const targetAmount = Number(goal.target_amount);
      const progress = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0;
      const remaining = targetAmount - currentAmount;

      let monthsRemaining: number | null = null;
      let predictedDate: string | null = null;

      if (autoDeposit && remaining > 0) {
        monthsRemaining = Math.ceil(remaining / Number(autoDeposit.amount));
        const date = addMonths(new Date(), monthsRemaining);
        predictedDate = format(date, "MMM 'de' yyyy", { locale: ptBR });
      }

      return {
        id: goal.id,
        name: goal.name,
        targetAmount,
        currentAmount,
        progress,
        monthsRemaining,
        predictedDate,
        hasAutoDeposit: !!autoDeposit,
        autoDepositAmount: autoDeposit ? Number(autoDeposit.amount) : 0,
      } as GoalWithPrediction;
    });
  }, [goals, autoDeposits]);

  const summary = useMemo(() => {
    const totalTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalCurrent = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalMonthlyDeposits = savingsGoals.reduce((sum, g) => sum + g.autoDepositAmount, 0);
    const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
    const goalsWithAutoDeposit = savingsGoals.filter(g => g.hasAutoDeposit).length;
    const completedGoals = savingsGoals.filter(g => g.progress >= 100).length;

    return {
      totalTarget,
      totalCurrent,
      totalMonthlyDeposits,
      overallProgress,
      goalsWithAutoDeposit,
      completedGoals,
      totalGoals: savingsGoals.length,
    };
  }, [savingsGoals]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  if (savingsGoals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PiggyBank className="h-5 w-5 text-primary" />
            Metas de Economia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Comece a guardar dinheiro criando suas metas de economia
            </p>
            <Button asChild size="sm">
              <Link to="/goals">Criar Meta</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <PiggyBank className="h-5 w-5 text-primary" />
            Metas de Economia
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/goals" className="text-xs">
              Ver todas <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Total Acumulado</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(summary.totalCurrent)}
            </p>
            <p className="text-xs text-muted-foreground">
              de {formatCurrency(summary.totalTarget)}
            </p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Depósito Mensal</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(summary.totalMonthlyDeposits)}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.goalsWithAutoDeposit} meta{summary.goalsWithAutoDeposit !== 1 ? 's' : ''} automática{summary.goalsWithAutoDeposit !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso Geral</span>
            <span className="font-medium">{summary.overallProgress.toFixed(0)}%</span>
          </div>
          <Progress value={summary.overallProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {summary.completedGoals} de {summary.totalGoals} meta{summary.totalGoals !== 1 ? 's' : ''} concluída{summary.completedGoals !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Top Goals */}
        <div className="space-y-3">
          {savingsGoals.slice(0, 3).map((goal) => (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{goal.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </span>
                    {goal.hasAutoDeposit && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                        Auto
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {goal.progress >= 100 ? (
                    <Badge className="bg-green-500 text-white text-[10px]">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      Concluída
                    </Badge>
                  ) : goal.predictedDate ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarCheck className="h-3 w-3" />
                      <span>{goal.predictedDate}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {goal.progress.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <Progress value={goal.progress} className="h-1.5" />
            </div>
          ))}
        </div>

        {savingsGoals.length > 3 && (
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link to="/goals">
              Ver mais {savingsGoals.length - 3} meta{savingsGoals.length - 3 !== 1 ? 's' : ''}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
