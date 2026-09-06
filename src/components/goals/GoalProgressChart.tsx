import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Goal } from '@/hooks/useGoals';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChartData {
  date: string;
  displayDate: string;
  balance: number;
}

interface GoalProgressChartProps {
  goal: Goal;
}

export function GoalProgressChart({ goal }: GoalProgressChartProps) {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && goal) {
      fetchTransactionHistory();
    }
  }, [user, goal, fetchTransactionHistory]);

  const fetchTransactionHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all transactions related to this goal
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type, date, created_at')
        .eq('user_id', user?.id)
        .or(`description.ilike.%Depósito na meta: ${goal.name}%,description.ilike.%Saque da meta: ${goal.name}%`)
        .order('date', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // If no transactions, show starting point and current
        setChartData([
          {
            date: goal.start_date,
            displayDate: format(parseISO(goal.start_date), 'dd/MM', { locale: ptBR }),
            balance: 0,
          },
          {
            date: new Date().toISOString().split('T')[0],
            displayDate: format(new Date(), 'dd/MM', { locale: ptBR }),
            balance: goal.current_amount,
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Group transactions by date and calculate cumulative balance
      const transactionsByDate = new Map<string, number>();
      
      data.forEach((t) => {
        const dateKey = t.date;
        const currentValue = transactionsByDate.get(dateKey) || 0;
        // Deposits are expenses in transactions but add to goal
        // Withdrawals are income in transactions but subtract from goal
        const change = t.type === 'expense' ? t.amount : -t.amount;
        transactionsByDate.set(dateKey, currentValue + change);
      });

      // Convert to cumulative chart data
      let cumulativeBalance = 0;
      const chartPoints: ChartData[] = [];
      
      // Add starting point
      chartPoints.push({
        date: goal.start_date,
        displayDate: format(parseISO(goal.start_date), 'dd/MM', { locale: ptBR }),
        balance: 0,
      });

      // Add each transaction date
      const sortedDates = Array.from(transactionsByDate.keys()).sort();
      sortedDates.forEach((date) => {
        cumulativeBalance += transactionsByDate.get(date) || 0;
        chartPoints.push({
          date,
          displayDate: format(parseISO(date), 'dd/MM', { locale: ptBR }),
          balance: Math.max(0, cumulativeBalance),
        });
      });

      setChartData(chartPoints);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, goal]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const progressPercentage = goal.target_amount > 0 
    ? ((goal.current_amount / goal.target_amount) * 100).toFixed(1) 
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Evolução da Meta
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-sm mb-4">
          <div>
            <span className="text-muted-foreground">Atual: </span>
            <span className="font-medium">{formatCurrency(goal.current_amount)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Objetivo: </span>
            <span className="font-medium">{formatCurrency(goal.target_amount)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Progresso: </span>
            <span className="font-medium text-primary">{progressPercentage}%</span>
          </div>
        </div>

        {chartData.length > 1 ? (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`colorBalance-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="displayDate" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Saldo']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill={`url(#colorBalance-${goal.id})`}
                />
                {/* Target line */}
                <Line
                  type="monotone"
                  dataKey={() => goal.target_amount}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Faça depósitos para ver a evolução
          </div>
        )}
      </CardContent>
    </Card>
  );
}
