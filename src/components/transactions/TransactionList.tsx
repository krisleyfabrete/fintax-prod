import { TransactionCard } from './TransactionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';

interface TransactionListProps {
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string | null;
    date: string;
    status: string;
    category?: { name: string; icon: string; color: string } | null;
    account?: { name: string; icon: string; color: string } | null;
  }>;
  isLoading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TransactionList({ transactions, isLoading, onEdit, onDelete }: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Nenhuma transação encontrada</h3>
        <p className="text-muted-foreground mt-1">
          Adicione sua primeira transação clicando no botão acima.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
