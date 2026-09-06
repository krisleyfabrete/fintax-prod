import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface MonthlyBalance {
  month: string;
  balance: number;
  income: number;
  expense: number;
}

export function BalanceChart() {
  const { user } = useAuth();

  const { data: chartData, isLoading } = useQuery({
    queryKey: ['balance-evolution', user?.id],
    queryFn: async () => {
      const now = new Date();
      const months: MonthlyBalance[] = [];
      
      // Buscar saldo atual das contas
      const { data: accounts } = await supabase
        .from('accounts')
        .select('balance')
        .eq('is_active', true);
      
      const currentBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;
      
      // Buscar transações dos últimos 6 meses
      const sixMonthsAgo = subMonths(now, 5);
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .gte('date', format(startOfMonth(sixMonthsAgo), 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      // Calcular saldo por mês (retroativo)
      const runningBalance = currentBalance;
      
      // Primeiro, calcular totais por mês
      const monthlyTotals: Record<string, { income: number; expense: number }> = {};
      
      for (let i = 0; i < 6; i++) {
        const monthDate = subMonths(now, i);
        const monthKey = format(monthDate, 'yyyy-MM');
        monthlyTotals[monthKey] = { income: 0, expense: 0 };
      }

      transactions?.forEach(t => {
        const monthKey = format(new Date(t.date), 'yyyy-MM');
        if (monthlyTotals[monthKey]) {
          if (t.type === 'income') {
            monthlyTotals[monthKey].income += Number(t.amount);
          } else {
            monthlyTotals[monthKey].expense += Number(t.amount);
          }
        }
      });

      // Calcular saldo retroativamente
      const sortedMonths = Object.keys(monthlyTotals).sort().reverse();
      let balance = currentBalance;
      
      const balances: Record<string, number> = {};
      balances[sortedMonths[0]] = currentBalance;
      
      for (let i = 1; i < sortedMonths.length; i++) {
        const prevMonth = sortedMonths[i - 1];
        const currentMonth = sortedMonths[i];
        // Subtrair receitas e adicionar despesas do mês anterior para obter saldo anterior
        balance = balance - monthlyTotals[prevMonth].income + monthlyTotals[prevMonth].expense;
        balances[currentMonth] = balance;
      }

      // Montar array final ordenado
      Object.keys(monthlyTotals).sort().forEach(monthKey => {
        const monthDate = new Date(monthKey + '-01');
        months.push({
          month: format(monthDate, 'MMM', { locale: ptBR }),
          balance: balances[monthKey] || 0,
          income: monthlyTotals[monthKey].income,
          expense: monthlyTotals[monthKey].expense,
        });
      });

      return months;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle>Evolução do Saldo</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="animate-pulse w-full h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  // Calcular domain dinâmico para o eixo Y
  const maxBalance = Math.max(...(chartData || []).map(d => d.balance), 0);
  const minBalance = Math.min(...(chartData || []).map(d => d.balance), 0);
  
  // Adicionar margem de 10% para melhor visualização
  const yMax = maxBalance > 0 ? Math.ceil(maxBalance * 1.1) : 0;
  const yMin = minBalance < 0 ? Math.floor(minBalance * 1.1) : 0;

  // Formatar valores do eixo Y de forma inteligente
  const formatYAxis = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (absValue >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle>Evolução do Saldo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData || []}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={[yMin, yMax]}
                tickFormatter={formatYAxis}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    balance: 'Saldo',
                    income: 'Receitas',
                    expense: 'Despesas'
                  };
                  return [formatCurrency(value), labels[name] || name];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorBalance)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
