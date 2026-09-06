import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown } from 'lucide-react';

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

interface TopCategoriesTableProps {
  transactions: Transaction[];
  type: 'income' | 'expense';
  limit?: number;
}

export function TopCategoriesTable({ transactions, type, limit = 10 }: TopCategoriesTableProps) {
  const data = useMemo(() => {
    const filtered = transactions.filter((t) => t.type === type);
    const categoryTotals: Record<string, { name: string; total: number; count: number; color: string }> = {};

    filtered.forEach((t) => {
      const categoryName = t.category?.name || 'Sem categoria';
      const categoryColor = t.category?.color || '#94a3b8';

      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = { name: categoryName, total: 0, count: 0, color: categoryColor };
      }
      categoryTotals[categoryName].total += Number(t.amount);
      categoryTotals[categoryName].count += 1;
    });

    const sorted = Object.values(categoryTotals).sort((a, b) => b.total - a.total);
    const total = sorted.reduce((sum, d) => sum + d.total, 0);

    return sorted.slice(0, limit).map((item) => ({
      ...item,
      percentage: total > 0 ? (item.total / total) * 100 : 0,
      average: item.count > 0 ? item.total / item.count : 0,
    }));
  }, [transactions, type, limit]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const Icon = type === 'income' ? TrendingUp : TrendingDown;
  const iconColor = type === 'income' ? 'text-green-500' : 'text-red-500';

  if (data.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon className={`h-5 w-5 ${iconColor}`} />
            Top {type === 'income' ? 'Receitas' : 'Despesas'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Nenhuma transação encontrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          Top {type === 'income' ? 'Receitas' : 'Despesas'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Média</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium">{item.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{item.percentage.toFixed(1)}%</TableCell>
                <TableCell className="text-right text-muted-foreground">{item.count}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrency(item.average)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
