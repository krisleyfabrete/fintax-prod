import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/hooks/useDashboardData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface RecentTransactionsProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <Card className="shadow-card border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Últimas Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Últimas Transações</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/transactions">Ver todas</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma transação ainda</p>
            <Button variant="link" asChild className="mt-2">
              <Link to="/transactions">Adicionar primeira transação</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div 
                key={transaction.id} 
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div 
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${transaction.category?.color}20` }}
                >
                  {transaction.type === 'income' ? (
                    <ArrowUpRight 
                      className="h-5 w-5" 
                      style={{ color: transaction.category?.color || 'hsl(var(--income))' }} 
                    />
                  ) : (
                    <ArrowDownRight 
                      className="h-5 w-5" 
                      style={{ color: transaction.category?.color || 'hsl(var(--expense))' }} 
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {transaction.description || transaction.category?.name || 'Transação'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.account.name} • {format(new Date(transaction.date), "dd 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
                <div className={`font-semibold whitespace-nowrap ${
                  transaction.type === 'income' ? 'text-income' : 'text-expense'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
