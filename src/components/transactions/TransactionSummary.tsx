import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TransactionSummaryProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function TransactionSummary({ totalIncome, totalExpense, balance }: TransactionSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="glass-card">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <ArrowUpCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Receitas</p>
            <p className="text-2xl font-bold text-green-500">
              {formatCurrency(totalIncome)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <ArrowDownCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Despesas</p>
            <p className="text-2xl font-bold text-red-500">
              {formatCurrency(totalExpense)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            balance >= 0 ? 'bg-primary/10' : 'bg-red-500/10'
          )}>
            <Wallet className={cn('w-6 h-6', balance >= 0 ? 'text-primary' : 'text-red-500')} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo do período</p>
            <p className={cn(
              'text-2xl font-bold',
              balance >= 0 ? 'text-primary' : 'text-red-500'
            )}>
              {formatCurrency(balance)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
