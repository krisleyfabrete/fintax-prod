import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryExpense } from '@/hooks/useDashboardData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CategoryChartProps {
  data: CategoryExpense[];
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function CategoryChart({ data, isLoading }: CategoryChartProps) {
  if (isLoading) {
    return (
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle>Gastos por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="animate-pulse h-48 w-48 rounded-full bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle>Gastos por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          <p>Nenhuma despesa registrada este mês</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle>Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="amount"
                nameKey="name"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value: string) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Lista de categorias */}
        <div className="mt-4 space-y-2">
          {data.slice(0, 4).map((category) => (
            <div key={category.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: category.color }} 
                />
                <span className="text-sm">{category.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {category.percentage.toFixed(1)}%
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(category.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
