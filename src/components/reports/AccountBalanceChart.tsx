import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Account {
  id: string;
  name: string;
  balance: number;
  color?: string | null;
}

interface AccountBalanceChartProps {
  accounts: Account[];
}

export function AccountBalanceChart({ accounts }: AccountBalanceChartProps) {
  const data = useMemo(() => {
    return accounts
      .map((acc) => ({
        name: acc.name,
        balance: Number(acc.balance),
        color: acc.color || '#8b5cf6',
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [accounts]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const totalBalance = data.reduce((sum, d) => sum + d.balance, 0);

  if (data.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Saldo por Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhuma conta encontrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Saldo por Conta</CardTitle>
        <span className="text-sm font-medium text-muted-foreground">
          Total: {formatCurrency(totalBalance)}
        </span>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              width={100}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Saldo']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="balance" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.balance >= 0 ? entry.color : 'hsl(0, 84%, 60%)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Account list */}
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate max-w-[150px]">{item.name}</span>
              </div>
              <span className={`font-medium ${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(item.balance)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
