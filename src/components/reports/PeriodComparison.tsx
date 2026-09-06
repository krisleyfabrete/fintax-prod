import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  status: string;
}

interface PeriodComparisonProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
}

export function PeriodComparison({ transactions, allTransactions }: PeriodComparisonProps) {
  const comparison = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    const currentPeriod = { start: currentMonthStart, end: currentMonthEnd };
    const previousPeriod = { start: previousMonthStart, end: previousMonthEnd };

    const filterByPeriod = (txs: Transaction[], period: { start: Date; end: Date }) =>
      txs.filter((t) => {
        const date = parseISO(t.date);
        return t.status === 'confirmed' && isWithinInterval(date, period);
      });

    const currentTxs = filterByPeriod(allTransactions, currentPeriod);
    const previousTxs = filterByPeriod(allTransactions, previousPeriod);

    const calcTotals = (txs: Transaction[]) => ({
      income: txs.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
      expense: txs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
    });

    const current = calcTotals(currentTxs);
    const previous = calcTotals(previousTxs);

    const calcVariation = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      currentMonth: format(now, 'MMMM/yyyy', { locale: ptBR }),
      previousMonth: format(subMonths(now, 1), 'MMMM/yyyy', { locale: ptBR }),
      income: {
        current: current.income,
        previous: previous.income,
        variation: calcVariation(current.income, previous.income),
      },
      expense: {
        current: current.expense,
        previous: previous.expense,
        variation: calcVariation(current.expense, previous.expense),
      },
      balance: {
        current: current.income - current.expense,
        previous: previous.income - previous.expense,
        variation: calcVariation(current.income - current.expense, previous.income - previous.expense),
      },
    };
  }, [allTransactions]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const renderVariation = (variation: number, inverted = false) => {
    const isPositive = inverted ? variation < 0 : variation > 0;
    const isNegative = inverted ? variation > 0 : variation < 0;
    const Icon = variation > 0 ? TrendingUp : variation < 0 ? TrendingDown : Minus;
    const color = isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground';

    return (
      <div className={`flex items-center gap-1 text-sm ${color}`}>
        <Icon className="h-4 w-4" />
        <span>{Math.abs(variation).toFixed(1)}%</span>
      </div>
    );
  };

  const metrics = [
    {
      label: 'Receitas',
      data: comparison.income,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      inverted: false,
    },
    {
      label: 'Despesas',
      data: comparison.expense,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      inverted: true,
    },
    {
      label: 'Saldo',
      data: comparison.balance,
      color: comparison.balance.current >= 0 ? 'text-green-500' : 'text-red-500',
      bgColor: comparison.balance.current >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
      inverted: false,
    },
  ];

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Comparativo de Períodos
          <span className="text-sm font-normal text-muted-foreground">
            {comparison.previousMonth} <ArrowRight className="inline h-4 w-4" /> {comparison.currentMonth}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={`p-4 rounded-lg ${metric.bgColor} space-y-2`}
            >
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Mês anterior:</span>
                  <span className="text-sm font-medium">{formatCurrency(metric.data.previous)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Mês atual:</span>
                  <span className={`text-lg font-bold ${metric.color}`}>
                    {formatCurrency(metric.data.current)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">Variação:</span>
                {renderVariation(metric.data.variation, metric.inverted)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
