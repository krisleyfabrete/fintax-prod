import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { InvestmentType, INVESTMENT_TYPES } from '@/hooks/useInvestments';

interface InvestmentChartProps {
  distributionByType: Record<InvestmentType, number>;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#10b981',
  '#f59e0b',
  '#6366f1',
];

export function InvestmentChart({ distributionByType }: InvestmentChartProps) {
  const data = Object.entries(distributionByType)
    .filter(([_, value]) => value > 0)
    .map(([type, value]) => ({
      name: INVESTMENT_TYPES.find(t => t.value === type)?.label || type,
      value,
    }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Nenhum investimento cadastrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Tipo</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Valor']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Total: {formatCurrency(total)}
        </div>
      </CardContent>
    </Card>
  );
}
