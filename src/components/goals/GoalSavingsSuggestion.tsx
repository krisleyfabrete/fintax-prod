import { differenceInMonths, parseISO } from 'date-fns';
import { Goal } from '@/hooks/useGoals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface GoalSavingsSuggestionProps {
  goals: Goal[];
  transactions: unknown[];
}

export function GoalSavingsSuggestion({ goals, transactions }: GoalSavingsSuggestionProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const calculateSuggestion = (goal: Goal) => {
    const relevantTransactions = transactions.filter(
      (t) => t.category_id === goal.category_id && t.status === 'confirmed'
    );
    const currentAmount = relevantTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const remaining = goal.target_amount - currentAmount;

    if (remaining <= 0) {
      return { type: 'completed' as const, monthlySuggestion: 0, remaining: 0, monthsLeft: 0 };
    }

    const endDate = goal.end_date ? parseISO(goal.end_date) : null;
    const now = new Date();

    if (!endDate || endDate <= now) {
      // No end date or already passed - suggest based on 12 months
      return {
        type: 'no_deadline' as const,
        monthlySuggestion: remaining / 12,
        remaining,
        monthsLeft: 12,
      };
    }

    const monthsLeft = Math.max(1, differenceInMonths(endDate, now));
    const monthlySuggestion = remaining / monthsLeft;

    return {
      type: 'with_deadline' as const,
      monthlySuggestion,
      remaining,
      monthsLeft,
    };
  };

  const activeTargetGoals = goals.filter((g) => g.is_active && g.goal_type === 'target');

  if (activeTargetGoals.length === 0) return null;

  const suggestions = activeTargetGoals.map((goal) => ({
    goal,
    suggestion: calculateSuggestion(goal),
  }));

  const pendingSuggestions = suggestions.filter((s) => s.suggestion.type !== 'completed');

  if (pendingSuggestions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Sugestões de Economia Mensal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingSuggestions.map(({ goal, suggestion }) => (
            <div
              key={goal.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted/50 border"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {goal.category && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: goal.category.color }}
                    />
                  )}
                  <span className="font-medium">{goal.name}</span>
                  {suggestion.type === 'no_deadline' && (
                    <Badge variant="outline" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Sem prazo
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Faltam {formatCurrency(suggestion.remaining)} para atingir a meta
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-primary">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-bold text-lg">
                      {formatCurrency(suggestion.monthlySuggestion)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    por mês durante {suggestion.monthsLeft} meses
                  </p>
                </div>
              </div>
            </div>
          ))}

          {suggestions.some((s) => s.suggestion.type === 'completed') && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-2">
              <CheckCircle className="h-4 w-4" />
              <span>
                {suggestions.filter((s) => s.suggestion.type === 'completed').length} meta(s) já
                alcançada(s)!
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
