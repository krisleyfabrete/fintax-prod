import { TrendingUp, TrendingDown, Wallet, ArrowUpDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
}

export function SummaryCards({ totalIncome, totalExpense, transactionCount }: SummaryCardsProps) {
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const cards = [
    {
      title: 'Total de Receitas',
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total de Despesas',
      value: formatCurrency(totalExpense),
      icon: TrendingDown,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Saldo do Período',
      value: formatCurrency(balance),
      icon: Wallet,
      color: balance >= 0 ? 'text-green-500' : 'text-red-500',
      bgColor: balance >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
    {
      title: 'Taxa de Economia',
      value: `${savingsRate.toFixed(1)}%`,
      subtitle: `${transactionCount} transações`,
      icon: ArrowUpDown,
      color: savingsRate >= 0 ? 'text-blue-500' : 'text-red-500',
      bgColor: savingsRate >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                )}
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
