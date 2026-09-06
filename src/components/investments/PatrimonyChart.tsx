import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Investment } from '@/hooks/useInvestments';
import { TrendingUp } from 'lucide-react';

interface PatrimonyChartProps {
  investments: Investment[];
  totalCurrentValue: number;
  totalInvested: number;
}

export function PatrimonyChart({ investments, totalCurrentValue, totalInvested }: PatrimonyChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Gerar dados simulados baseados nos investimentos existentes
  // Em produção, usaria a tabela investment_snapshots
  const generateChartData = () => {
    const endDate = new Date();
    const startDate = subMonths(endDate, 11);
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    // Simular evolução baseada nos investimentos cadastrados
    return months.map((month, index) => {
      const progress = (index + 1) / months.length;
      
      // Simulação de crescimento gradual
      const simulatedValue = totalInvested * 0.3 + (totalCurrentValue * progress);
      const simulatedInvested = totalInvested * progress;
      
      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        fullMonth: format(month, 'MMMM yyyy', { locale: ptBR }),
        patrimony: Math.round(simulatedValue),
        invested: Math.round(simulatedInvested),
      };
    });
  };

  const data = generateChartData();

  if (investments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução Patrimonial
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Adicione investimentos para ver a evolução</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Evolução Patrimonial (12 meses)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPatrimony" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 11 }}
              width={80}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullMonth;
                }
                return label;
              }}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'patrimony' ? 'Patrimônio' : 'Investido'
              ]}
            />
            <Area
              type="monotone"
              dataKey="invested"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              fill="url(#colorInvested)"
              name="invested"
            />
            <Area
              type="monotone"
              dataKey="patrimony"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorPatrimony)"
              name="patrimony"
            />
          </AreaChart>
        </ResponsiveContainer>
        
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Patrimônio Atual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted-foreground" />
            <span>Total Investido</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
