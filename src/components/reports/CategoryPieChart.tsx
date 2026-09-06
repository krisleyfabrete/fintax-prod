import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface CategoryPieChartProps {
  transactions: Transaction[];
  type: 'income' | 'expense';
  title?: string;
}

export function CategoryPieChart({ transactions, type, title }: CategoryPieChartProps) {
  const data = useMemo(() => {
    const filtered = transactions.filter((t) => t.type === type);
    const categoryTotals: Record<string, { name: string; value: number; color: string }> = {};

    filtered.forEach((t) => {
      const categoryName = t.category?.name || 'Sem categoria';
      const categoryColor = t.category?.color || '#94a3b8';

      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = { name: categoryName, value: 0, color: categoryColor };
      }
      categoryTotals[categoryName].value += Number(t.amount);
    });

    return Object.values(categoryTotals).sort((a, b) => b.value - a.value);
  }, [transactions, type]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatPercent = (value: number) => `${((value / total) * 100).toFixed(1)}%`;

  if (data.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">{title || (type === 'income' ? 'Receitas por Categoria' : 'Despesas por Categoria')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhuma transação encontrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">{title || (type === 'income' ? 'Receitas por Categoria' : 'Despesas por Categoria')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Valor']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Legend with values */}
        <div className="mt-4 space-y-2">
          {data.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate max-w-[150px]">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatCurrency(item.value)}</span>
                <span className="text-muted-foreground">({formatPercent(item.value)})</span>
              </div>
            </div>
          ))}
          {data.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              e mais {data.length - 5} categorias...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
