import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO, startOfMonth, subMonths, isAfter, isBefore, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  status: string;
}

interface MonthlyTrendChartProps {
  transactions: Transaction[];
  months?: number;
  startDate?: string;
  endDate?: string;
}

export function MonthlyTrendChart({ transactions, months = 6, startDate, endDate }: MonthlyTrendChartProps) {
  const data = useMemo(() => {
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = startOfMonth(parseISO(startDate));
      end = endOfMonth(parseISO(endDate));
    } else {
      end = new Date();
      start = startOfMonth(subMonths(end, months - 1));
    }

    const monthlyData: Record<string, { month: string; income: number; expense: number; balance: number }> = {};

    // Initialize months
    let current = start;
    while (!isAfter(current, end)) {
      const key = format(current, 'yyyy-MM');
      monthlyData[key] = {
        month: format(current, 'MMM/yy', { locale: ptBR }),
        income: 0,
        expense: 0,
        balance: 0,
      };
      current = startOfMonth(subMonths(current, -1));
    }

    // Aggregate transactions
    transactions
      .filter((t) => t.status === 'confirmed')
      .forEach((t) => {
        const date = parseISO(t.date);
        if (isBefore(date, start) || isAfter(date, end)) return;

        const key = format(date, 'yyyy-MM');
        if (monthlyData[key]) {
          if (t.type === 'income') {
            monthlyData[key].income += Number(t.amount);
          } else {
            monthlyData[key].expense += Number(t.amount);
          }
          monthlyData[key].balance = monthlyData[key].income - monthlyData[key].expense;
        }
      });

    return Object.values(monthlyData);
  }, [transactions, months, startDate, endDate]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (data.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Evolução Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhum dado disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Evolução Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'income' ? 'Receitas' : name === 'expense' ? 'Despesas' : 'Saldo',
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend
              formatter={(value) =>
                value === 'income' ? 'Receitas' : value === 'expense' ? 'Despesas' : 'Saldo'
              }
            />
            <Bar dataKey="income" name="income" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="expense" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
