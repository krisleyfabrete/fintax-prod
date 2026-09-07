import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { TransactionSummary } from '@/components/transactions/TransactionSummary';
import { IncomeExpenseChart } from '@/components/transactions/IncomeExpenseChart';
import { TransactionLimitBanner } from '@/components/transactions/TransactionLimitBanner';
import { useTransactions, TransactionFilters as Filters, Transaction } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { useHasFamily } from '@/hooks/useFamily';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Transactions() {
  const hasFamily = useHasFamily();
  const [filters, setFilters] = useState<Filters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { 
    transactions, 
    isLoading, 
    totalIncome, 
    totalExpense, 
    balance,
    createTransaction, 
    updateTransaction, 
    deleteTransaction,
    isCreating,
    isUpdating,
  } = useTransactions(filters);
  
  const { categories } = useCategories();
  const { accounts } = useAccounts();

  const handleEdit = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      setEditingTransaction(transaction as Transaction);
      setDialogOpen(true);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteTransaction.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleSave = async (data: {
    type: 'income' | 'expense';
    amount: string;
    description?: string;
    date: string;
    category_id?: string;
    subcategory_id?: string;
    account_id: string;
    status: 'pending' | 'confirmed';
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    receipt_url?: string;
    debt_id?: string;
    is_shared_with_family?: boolean;
  }) => {
    // Converte valor formatado para número
    const parseCurrency = (value: string): number => {
      if (!value) return 0;
      const numericValue = value.replace(/\./g, '').replace(',', '.');
      return parseFloat(numericValue) || 0;
    };

    const transactionData = {
      type: data.type,
      amount: data.type === 'expense' ? -parseCurrency(data.amount) : parseCurrency(data.amount),
      description: data.description || null,
      date: data.date,
      category_id: data.category_id || null,
      subcategory_id: data.subcategory_id || null,
      account_id: data.account_id,
      status: data.status,
      recurrence: data.recurrence,
      receipt_url: data.receipt_url || null,
      debt_id: data.debt_id || null,
      is_shared_with_family: data.is_shared_with_family || false,
    };

    if (editingTransaction) {
      await updateTransaction.mutateAsync({ id: editingTransaction.id, ...transactionData });
    } else {
      await createTransaction.mutateAsync(transactionData);
    }

    setDialogOpen(false);
    setEditingTransaction(null);
  };

  const handleOpenDialog = () => {
    setEditingTransaction(null);
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Transaction Limit Banner */}
        <TransactionLimitBanner />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Transações</h1>
            <p className="text-muted-foreground">
              Gerencie suas receitas e despesas
            </p>
          </div>
          <Button onClick={handleOpenDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </div>

        {/* Summary */}
        <TransactionSummary
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          balance={balance}
        />

        {/* Chart */}
        <IncomeExpenseChart
          transactions={transactions}
          isLoading={isLoading}
          startDate={filters.startDate}
          endDate={filters.endDate}
        />

        {/* Filters */}
        <TransactionFilters
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          accounts={accounts}
        />

        {/* List */}
        <TransactionList
          transactions={transactions}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Dialog */}
        <TransactionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          transaction={editingTransaction}
          categories={categories}
          accounts={accounts}
          onSave={handleSave}
          isLoading={isCreating || isUpdating}
          hasFamily={hasFamily}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A transação será removida permanentemente
                e o saldo da conta será atualizado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
