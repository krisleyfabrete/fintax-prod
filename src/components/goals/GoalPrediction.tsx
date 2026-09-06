import { useMemo } from 'react';
import { format, addMonths, differenceInMonths, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Goal } from '@/hooks/useGoals';

interface Transaction {
  id: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  status: string;
  category_id: string | null;
}

interface GoalPredictionProps {
  goals: Goal[];
  transactions: Transaction[];
}

interface PredictionData {
  goal: Goal;
  currentAmount: number;
  monthlyAverage: number;
  predictedDate: Date | null;
  monthsRemaining: number | null;
  isOnTrack: boolean;
  trend: 'up' | 'down' | 'stable';
}

export function GoalPrediction({ goals, transactions }: GoalPredictionProps) {
  const activeGoals = goals.filter((g) => g.is_active && g.goal_type === 'target');

  const predictions = useMemo(() => {
    if (activeGoals.length === 0) return [];

    const now = new Date();
    const last3Months = Array.from({ length: 3 }, (_, i) => {
      const date = subMonths(now, 2 - i);
      return {
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    });

    return activeGoals.map((goal): PredictionData => {
      // Calculate monthly contributions for each of the last 3 months
      const monthlyAmounts = last3Months.map(({ start, end }) => {
        const monthTransactions = transactions.filter((t) => {
          if (t.category_id !== goal.category_id) return false;
          if (t.status !== 'confirmed') return false;
          try {
            const txDate = parseISO(t.date);
            return isWithinInterval(txDate, { start, end });
          } catch {
            return false;
          }
        });
        return monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      });

      // Calculate current total
      const currentAmount = transactions
        .filter((t) => t.category_id === goal.category_id && t.status === 'confirmed')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Calculate monthly average (last 3 months)
      const monthlyAverage = monthlyAmounts.reduce((a, b) => a + b, 0) / 3;

      // Determine trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (monthlyAmounts.length >= 2) {
        const recent = monthlyAmounts[monthlyAmounts.length - 1];
        const previous = monthlyAmounts[monthlyAmounts.length - 2];
        if (recent > previous * 1.1) trend = 'up';
        else if (recent < previous * 0.9) trend = 'down';
      }

      // Calculate prediction
      const remaining = goal.target_amount - currentAmount;
      let predictedDate: Date | null = null;
      let monthsRemaining: number | null = null;

      if (remaining <= 0) {
        // Already achieved
        predictedDate = new Date();
        monthsRemaining = 0;
      } else if (monthlyAverage > 0) {
        monthsRemaining = Math.ceil(remaining / monthlyAverage);
        predictedDate = addMonths(now, monthsRemaining);
      }

      // Check if on track (if end_date exists)
      let isOnTrack = true;
      if (goal.end_date && predictedDate) {
        const endDate = parseISO(goal.end_date);
        isOnTrack = predictedDate <= endDate;
      }

      return {
        goal,
        currentAmount,
        monthlyAverage,
        predictedDate,
        monthsRemaining,
        isOnTrack,
        trend,
      };
    });
  }, [activeGoals, transactions]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (predictions.length === 0) {
    return null;
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default:
        return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Previsão de Alcance das Metas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {predictions.map(({ goal, currentAmount, monthlyAverage, predictedDate, monthsRemaining, isOnTrack, trend }) => (
            <div key={goal.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {goal.category && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: goal.category.color }}
                    />
                  )}
                  <span className="font-medium">{goal.name}</span>
                  {getTrendIcon(trend)}
                </div>
                {monthsRemaining === 0 ? (
                  <Badge className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Alcançada
                  </Badge>
                ) : isOnTrack ? (
                  <Badge variant="outline" className="text-green-500 border-green-500">
                    No prazo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Atrasada
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Atual</p>
                  <p className="font-medium">{formatCurrency(currentAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Meta</p>
                  <p className="font-medium">{formatCurrency(goal.target_amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Média mensal</p>
                  <p className="font-medium">{formatCurrency(monthlyAverage)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Previsão</p>
                  {predictedDate ? (
                    <p className="font-medium">
                      {monthsRemaining === 0
                        ? 'Concluída!'
                        : format(predictedDate, 'MMM/yyyy', { locale: ptBR })}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">Sem dados</p>
                  )}
                </div>
              </div>

              {monthsRemaining !== null && monthsRemaining > 0 && (
                <p className="text-xs text-muted-foreground">
                  Faltam aproximadamente {monthsRemaining} {monthsRemaining === 1 ? 'mês' : 'meses'} para atingir a meta
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
