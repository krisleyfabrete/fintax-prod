import { useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Transaction {
  date: string;
  type: string;
  amount: number;
  status: string;
}

interface IncomeExpenseChartProps {
  transactions: Transaction[];
  isLoading?: boolean;
  startDate?: string;
  endDate?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function IncomeExpenseChart({ transactions, isLoading, startDate, endDate }: IncomeExpenseChartProps) {
  const chartData = useMemo(() => {
    if (!transactions.length) return [];

    // Define o período
    const now = new Date();
    const start = startDate ? parseISO(startDate) : subMonths(now, 5);
    const end = endDate ? parseISO(endDate) : now;

    // Agrupa por mês
    const months = eachMonthOfInterval({ start: startOfMonth(start), end: endOfMonth(end) });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthTransactions = transactions.filter((t) => {
        const date = parseISO(t.date);
        return date >= monthStart && date <= monthEnd && t.status === 'confirmed';
      });

      const income = monthTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = monthTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        receitas: income,
        despesas: expense,
        saldo: income - expense,
      };
    });
  }, [transactions, startDate, endDate]);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Evolução Receitas vs Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Evolução Receitas vs Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Adicione transações para visualizar o gráfico
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Evolução Receitas vs Despesas</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              className="text-muted-foreground"
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'receitas' ? 'Receitas' : 'Despesas',
              ]}
            />
            <Legend
              formatter={(value) => (value === 'receitas' ? 'Receitas' : 'Despesas')}
            />
            <Area
              type="monotone"
              dataKey="receitas"
              stroke="#22c55e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorReceitas)"
            />
            <Area
              type="monotone"
              dataKey="despesas"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorDespesas)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
