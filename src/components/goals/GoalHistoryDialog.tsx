import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Goal } from '@/hooks/useGoals';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownLeft, ArrowUpRight, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string | null;
  date: string;
  created_at: string;
  account: {
    name: string;
    color: string | null;
  } | null;
}

interface GoalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
}

export function GoalHistoryDialog({
  open,
  onOpenChange,
  goal,
}: GoalHistoryDialogProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && user && goal) {
      fetchHistory();
    }
  }, [open, user, goal, fetchHistory]);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      // Buscar transações relacionadas à meta (depósitos e saques)
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          type,
          description,
          date,
          created_at,
          account:accounts(name, color)
        `)
        .eq('user_id', user?.id)
        .or(`description.ilike.%Depósito na meta: ${goal.name}%,description.ilike.%Saque da meta: ${goal.name}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions((data as Transaction[]) || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, goal]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const totalDeposits = transactions
    .filter(t => t.description?.includes('Depósito'))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = transactions
    .filter(t => t.description?.includes('Saque'))
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico da Meta
          </DialogTitle>
          <DialogDescription>
            Todas as movimentações da meta "{goal.name}"
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Depositado</p>
            <p className="text-lg font-bold text-green-500">{formatCurrency(totalDeposits)}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Sacado</p>
            <p className="text-lg font-bold text-red-500">{formatCurrency(totalWithdrawals)}</p>
          </div>
        </div>

        {/* Progress Info */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Saldo atual na meta:</span>
            <span className="font-medium">{formatCurrency(goal.current_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Objetivo:</span>
            <span className="font-medium">{formatCurrency(goal.target_amount)}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Transaction List */}
        <ScrollArea className="h-[250px]">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <History className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma movimentação registrada ainda
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => {
                const isDeposit = transaction.description?.includes('Depósito');
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${isDeposit ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {isDeposit ? (
                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {isDeposit ? 'Depósito' : 'Saque'}
                      </p>
                       <div className="flex items-center gap-2 text-xs text-muted-foreground">
                         {transaction.account && (
                           <>
                             <div
                               className="w-2 h-2 rounded-full"
                               style={{ backgroundColor: transaction.account.color || '#8B5CF6' }}
                             />
                             <span>{transaction.account.name || 'Sem conta'}</span>
                             <span>•</span>
                           </>
                         )}
                         <span>
                           {format(new Date(transaction.date), "dd 'de' MMM, yyyy", { locale: ptBR })}
                         </span>
                       </div>
                    </div>
                    <div className={`font-medium ${isDeposit ? 'text-green-500' : 'text-red-500'}`}>
                      {isDeposit ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
