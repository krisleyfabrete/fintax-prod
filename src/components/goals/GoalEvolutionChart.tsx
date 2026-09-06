import { useMemo, useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Goal } from '@/hooks/useGoals';

type PeriodType = 3 | 6 | 12;

interface Transaction {
  id: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  status: string;
  category_id: string | null;
}

interface GoalEvolutionChartProps {
  goals: Goal[];
  transactions: Transaction[];
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)', // green
  'hsl(38, 92%, 50%)', // amber
  'hsl(280, 65%, 60%)', // purple
  'hsl(190, 90%, 40%)', // cyan
  'hsl(350, 80%, 55%)', // red
];

export function GoalEvolutionChart({ goals, transactions }: GoalEvolutionChartProps) {
  const activeGoals = goals.filter((g) => g.is_active);
  const [period, setPeriod] = useState<PeriodType>(6);

  const chartData = useMemo(() => {
    if (activeGoals.length === 0) return [];

    const now = new Date();
    const months = Array.from({ length: period }, (_, i) => {
      const date = subMonths(now, period - 1 - i);
      return {
        date,
        start: startOfMonth(date),
        end: endOfMonth(date),
        label: format(date, 'MMM/yy', { locale: ptBR }),
      };
    });

    return months.map(({ start, end, label }) => {
      const dataPoint: Record<string, string | number> = { month: label };

      activeGoals.forEach((goal) => {
        // Filter transactions for this goal's category within the month
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

        const amount = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const percentage = goal.target_amount > 0 
          ? Math.round((amount / goal.target_amount) * 100) 
          : 0;

        dataPoint[goal.id] = percentage;
        dataPoint[`${goal.id}_amount`] = amount;
        dataPoint[`${goal.id}_name`] = goal.name;
        dataPoint[`${goal.id}_target`] = goal.target_amount;
      });

      return dataPoint;
    });
  }, [activeGoals, transactions, period]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (activeGoals.length === 0) {
    return null;
  }

interface TooltipPayloadEntry {
  dataKey: string;
  payload: Record<string, number>;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 space-y-2">
      <p className="font-medium text-sm">{label}</p>
      {payload.map((entry, index) => {
        const goalId = entry.dataKey;
        const goal = activeGoals.find((g) => g.id === goalId);
        if (!goal) return null;

        const amount = entry.payload[`${goalId}_amount`] || 0;
        const target = entry.payload[`${goalId}_target`] || 0;

          return (
            <div key={index} className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.stroke }}
                />
                <span className="font-medium">{goal.name}</span>
              </div>
              <div className="ml-5 text-muted-foreground">
                <p>{formatCurrency(amount)} de {formatCurrency(target)}</p>
                <p className="font-medium" style={{ color: entry.stroke }}>
                  {entry.value}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const periodOptions: { value: PeriodType; label: string }[] = [
    { value: 3, label: '3 meses' },
    { value: 6, label: '6 meses' },
    { value: 12, label: '12 meses' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Evolução das Metas
        </CardTitle>
        <div className="flex gap-1">
          {periodOptions.map((option) => (
            <Button
              key={option.value}
              variant={period === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(option.value)}
              className="text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => {
                  const goal = activeGoals.find((g) => g.id === value);
                  return goal?.name || value;
                }}
              />
              {activeGoals.map((goal, index) => (
                <Line
                  key={goal.id}
                  type="monotone"
                  dataKey={goal.id}
                  name={goal.id}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              ))}
              {/* Reference line at 100% */}
              <Line
                type="monotone"
                dataKey={() => 100}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                legendType="none"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Linha tracejada representa 100% da meta • Comparando {activeGoals.length} meta{activeGoals.length > 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  );
}
