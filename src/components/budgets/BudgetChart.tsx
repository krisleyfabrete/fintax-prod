import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetWithProgress } from '@/hooks/useBudgets';

interface ChartDataItem {
  name: string;
  value: number;
  spent: number;
  color: string;
  icon: string;
  percentage: number;
  status: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataItem }>;
}

interface ChartLegendProps {
  payload?: Array<{ color: string; value: string }>;
}

interface BudgetChartProps {
  budgets: BudgetWithProgress[];
}

export function BudgetChart({ budgets }: BudgetChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const chartData = budgets.map((budget) => ({
    name: budget.category?.name || 'Sem categoria',
    value: budget.amount,
    spent: budget.spent,
    color: budget.category?.color || '#8B5CF6',
    icon: budget.category?.icon || '📦',
    percentage: budget.percentage,
    status: budget.status,
  }));

  const CustomTooltip = ({ active, payload }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium flex items-center gap-2">
            <span>{data.icon}</span>
            <span>{data.name}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Orçado: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">
            Gasto: {formatCurrency(data.spent)}
          </p>
          <p className="text-sm font-medium mt-1">
            {data.percentage.toFixed(0)}% utilizado
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: ChartLegendProps) => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload?.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (budgets.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Distribuição de Orçamentos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
