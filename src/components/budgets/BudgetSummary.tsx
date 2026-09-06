import { Wallet, TrendingDown, PiggyBank } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BudgetSummaryProps {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
}

export function BudgetSummary({
  totalBudgeted,
  totalSpent,
  totalRemaining,
}: BudgetSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const percentageUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  const cards = [
    {
      title: 'Total Orçado',
      value: totalBudgeted,
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Gasto',
      value: totalSpent,
      icon: TrendingDown,
      color: totalSpent > totalBudgeted ? 'text-destructive' : 'text-orange-600 dark:text-orange-400',
      bgColor: totalSpent > totalBudgeted ? 'bg-destructive/10' : 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      title: 'Saldo Disponível',
      value: totalRemaining,
      icon: PiggyBank,
      color: totalRemaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive',
      bgColor: totalRemaining >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-destructive/10',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', card.bgColor)}>
                  <card.icon className={cn('h-5 w-5', card.color)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className={cn('text-xl font-bold', card.color)}>
                    {formatCurrency(card.value)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalBudgeted > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Utilização do orçamento</span>
              <span className="text-sm font-medium">{percentageUsed.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  percentageUsed >= 100
                    ? 'bg-destructive'
                    : percentageUsed >= 80
                    ? 'bg-yellow-500'
                    : 'bg-primary'
                )}
                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
