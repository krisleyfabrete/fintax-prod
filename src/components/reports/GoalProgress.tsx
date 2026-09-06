import { useMemo } from 'react';
import { Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

interface GoalProgressProps {
  goals: Goal[];
  transactions: Transaction[];
}

export function GoalProgress({ goals, transactions }: GoalProgressProps) {
  const goalsWithProgress = useMemo(() => {
    return goals
      .filter((g) => g.is_active)
      .map((goal) => {
        // Calculate current amount based on transactions
        const relevantTransactions = transactions.filter(
          (t) => t.category_id === goal.category_id && t.status === 'confirmed'
        );

        const currentAmount = relevantTransactions.reduce(
          (sum, t) => sum + Number(t.amount),
          0
        );

        const percentage = goal.target_amount > 0
          ? (currentAmount / goal.target_amount) * 100
          : 0;

        let status: 'on_track' | 'warning' | 'exceeded' | 'completed';
        if (goal.goal_type === 'limit') {
          // For limits (expense goals), lower is better
          if (percentage >= 100) status = 'exceeded';
          else if (percentage >= 80) status = 'warning';
          else status = 'on_track';
        } else {
          // For targets (savings goals), higher is better
          if (percentage >= 100) status = 'completed';
          else if (percentage >= 70) status = 'on_track';
          else status = 'warning';
        }

        return {
          ...goal,
          currentAmount,
          percentage: Math.min(percentage, 100),
          actualPercentage: percentage,
          status,
        };
      });
  }, [goals, transactions]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getStatusConfig = (status: string, goalType: string) => {
    if (goalType === 'limit') {
      switch (status) {
        case 'exceeded':
          return { color: 'bg-red-500', textColor: 'text-red-500', icon: AlertTriangle, label: 'Limite excedido' };
        case 'warning':
          return { color: 'bg-yellow-500', textColor: 'text-yellow-500', icon: AlertTriangle, label: 'Atenção' };
        default:
          return { color: 'bg-green-500', textColor: 'text-green-500', icon: CheckCircle, label: 'Dentro do limite' };
      }
    } else {
      switch (status) {
        case 'completed':
          return { color: 'bg-green-500', textColor: 'text-green-500', icon: CheckCircle, label: 'Meta atingida!' };
        case 'on_track':
          return { color: 'bg-blue-500', textColor: 'text-blue-500', icon: TrendingUp, label: 'No caminho certo' };
        default:
          return { color: 'bg-yellow-500', textColor: 'text-yellow-500', icon: AlertTriangle, label: 'Precisa acelerar' };
      }
    }
  };

  const periodLabels: Record<string, string> = {
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
  };

  if (goalsWithProgress.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Metas Financeiras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhuma meta ativa encontrada</p>
            <p className="text-sm">Crie metas na página de Metas para acompanhar seu progresso</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          Metas Financeiras
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goalsWithProgress.map((goal) => {
          const statusConfig = getStatusConfig(goal.status, goal.goal_type);
          const StatusIcon = statusConfig.icon;

          return (
            <div
              key={goal.id}
              className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {goal.category && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: goal.category.color }}
                      />
                    )}
                    <span className="font-medium">{goal.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {goal.goal_type === 'limit' ? 'Limite' : 'Meta'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {periodLabels[goal.period_type]}
                    </Badge>
                    {goal.category && (
                      <span className="text-xs text-muted-foreground">
                        {goal.category.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`flex items-center gap-1 ${statusConfig.textColor}`}>
                  <StatusIcon className="h-4 w-4" />
                  <span className="text-xs font-medium">{statusConfig.label}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.target_amount)}
                  </span>
                  <span className={`font-medium ${statusConfig.textColor}`}>
                    {goal.actualPercentage.toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={goal.percentage}
                  className="h-2"
                  style={{
                    ['--progress-background' as string]: statusConfig.color.replace('bg-', 'var(--'),
                  }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
