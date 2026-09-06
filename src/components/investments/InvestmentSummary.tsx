import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvestmentSummaryProps {
  totalInvested: number;
  totalCurrentValue: number;
  totalProfit: number;
  profitPercentage: number;
}

export function InvestmentSummary({
  totalInvested,
  totalCurrentValue,
  totalProfit,
  profitPercentage,
}: InvestmentSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const isPositive = totalProfit >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
          <p className="text-xs text-muted-foreground">
            Valor total aplicado
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Atual</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalCurrentValue)}</div>
          <p className="text-xs text-muted-foreground">
            Patrimônio total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lucro/Prejuízo</CardTitle>
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold",
            isPositive ? "text-green-500" : "text-red-500"
          )}>
            {isPositive ? '+' : ''}{formatCurrency(totalProfit)}
          </div>
          <p className="text-xs text-muted-foreground">
            Resultado total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rentabilidade</CardTitle>
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold",
            isPositive ? "text-green-500" : "text-red-500"
          )}>
            {isPositive ? '+' : ''}{profitPercentage.toFixed(2)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Variação percentual
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
