import { useState } from 'react';
import { Plus, Copy, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useBudgets, BudgetWithProgress } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { BudgetDialog } from '@/components/budgets/BudgetDialog';
import { BudgetSummary } from '@/components/budgets/BudgetSummary';
import { BudgetMonthSelector } from '@/components/budgets/BudgetMonthSelector';
import { BudgetChart } from '@/components/budgets/BudgetChart';
import { BudgetAlerts } from '@/components/budgets/BudgetAlerts';
import { BudgetLimitBanner } from '@/components/budgets/BudgetLimitBanner';
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

export default function Budgets() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithProgress | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    budgets,
    isLoading,
    totalBudgeted,
    totalSpent,
    totalRemaining,
    createBudget,
    updateBudget,
    deleteBudget,
    copyFromPreviousMonth,
    isCreating,
    isUpdating,
    isDeleting,
    isCopying,
    canCreateBudget,
  } = useBudgets(month, year);

  const { expenseCategories } = useCategories();

  const handleMonthChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
  };

  const handleOpenNew = () => {
    setEditingBudget(null);
    setDialogOpen(true);
  };

  const handleEdit = (budget: BudgetWithProgress) => {
    setEditingBudget(budget);
    setDialogOpen(true);
  };

  const handleSave = (data: { category_id: string; amount: number; is_shared_with_family?: boolean }) => {
    if (editingBudget) {
      updateBudget.mutate({ id: editingBudget.id, ...data });
    } else {
      createBudget.mutate({ ...data, month, year });
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteBudget.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const existingCategoryIds = budgets.map((b) => b.category_id).filter(Boolean) as string[];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Orçamentos</h1>
            <p className="text-muted-foreground">
              Defina limites de gastos por categoria
            </p>
          </div>
          <BudgetMonthSelector
            month={month}
            year={year}
            onMonthChange={handleMonthChange}
          />
        </div>

        {/* Limit Banner */}
        <BudgetLimitBanner currentCount={budgets.length} />

        {/* Summary */}
        <BudgetSummary
          totalBudgeted={totalBudgeted}
          totalSpent={totalSpent}
          totalRemaining={totalRemaining}
        />

        {/* Alerts */}
        <BudgetAlerts budgets={budgets} />

        {/* Chart and Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BudgetChart budgets={budgets} />
          
          <div className="space-y-4">
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleOpenNew} disabled={!canCreateBudget}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Orçamento
              </Button>
              {budgets.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => copyFromPreviousMonth.mutate()}
                  disabled={isCopying}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {isCopying ? 'Copiando...' : 'Copiar do mês anterior'}
                </Button>
              )}
            </div>

            {/* Budget List in Card on larger screens when chart is shown */}
            {budgets.length > 0 && (
              <div className="space-y-3">
                {budgets.slice(0, 4).map((budget) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
                {budgets.length > 4 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{budgets.length - 4} outros orçamentos abaixo
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Full Budget List (shown below chart section) */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum orçamento definido</h3>
            <p className="text-muted-foreground max-w-sm mt-1">
              Crie orçamentos para controlar seus gastos por categoria ou copie do mês anterior.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Dialog */}
        <BudgetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          budget={editingBudget}
          categories={expenseCategories}
          existingCategoryIds={existingCategoryIds}
          onSave={handleSave}
          isLoading={isCreating || isUpdating}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Orçamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
