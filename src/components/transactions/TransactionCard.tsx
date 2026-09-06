import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownCircle, ArrowUpCircle, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TransactionCardProps {
  transaction: {
    id: string;
    type: string;
    amount: number;
    description: string | null;
    date: string;
    status: string;
    category?: { name: string; icon: string; color: string } | null;
    account?: { name: string; icon: string; color: string } | null;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  confirmed: 'bg-green-500/10 text-green-500 border-green-500/20',
};

export function TransactionCard({ transaction, onEdit, onDelete }: TransactionCardProps) {
  const isIncome = transaction.type === 'income';

  return (
    <div className="glass-card flex items-center justify-between p-4 hover:bg-accent/5 transition-colors">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            isIncome ? 'bg-green-500/10' : 'bg-red-500/10'
          )}
        >
          {isIncome ? (
            <ArrowUpCircle className="w-5 h-5 text-green-500" />
          ) : (
            <ArrowDownCircle className="w-5 h-5 text-red-500" />
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{transaction.description || 'Sem descrição'}</p>
            {transaction.status !== 'confirmed' && (
              <Badge variant="outline" className={cn('text-xs', statusColors[transaction.status])}>
                {statusLabels[transaction.status]}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {transaction.category && (
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: `${transaction.category.color}20`, color: transaction.category.color }}
              >
                {transaction.category.name}
              </span>
            )}
            <span>•</span>
            <span>{transaction.account?.name || 'Conta não encontrada'}</span>
            <span>•</span>
            <span>{format(new Date(transaction.date), "dd 'de' MMM", { locale: ptBR })}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <p
          className={cn(
            'font-semibold tabular-nums',
            isIncome ? 'text-green-500' : 'text-red-500'
          )}
        >
          {isIncome ? '+' : '-'} {formatCurrency(Number(transaction.amount))}
        </p>

        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={() => onEdit(transaction.id)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(transaction.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
