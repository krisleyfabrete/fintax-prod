import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BudgetWithProgress } from '@/hooks/useBudgets';

interface BudgetAlertsProps {
  budgets: BudgetWithProgress[];
}

export function BudgetAlerts({ budgets }: BudgetAlertsProps) {
  const exceededBudgets = budgets.filter((b) => b.status === 'exceeded');
  const warningBudgets = budgets.filter((b) => b.status === 'warning');

  if (exceededBudgets.length === 0 && warningBudgets.length === 0) {
    if (budgets.length > 0) {
      return (
        <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-300">
            Tudo sob controle!
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-400">
            Todos os seus orçamentos estão dentro do limite. Continue assim!
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  return (
    <div className="space-y-3">
      {exceededBudgets.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {exceededBudgets.length} orçamento{exceededBudgets.length > 1 ? 's' : ''} excedido{exceededBudgets.length > 1 ? 's' : ''}
          </AlertTitle>
          <AlertDescription>
            {exceededBudgets.map((b) => b.category?.name || 'Sem categoria').join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {warningBudgets.length > 0 && (
        <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-300">
            {warningBudgets.length} orçamento{warningBudgets.length > 1 ? 's' : ''} próximo{warningBudgets.length > 1 ? 's' : ''} do limite
          </AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            {warningBudgets.map((b) => (
              <span key={b.id}>
                {b.category?.name || 'Sem categoria'} ({b.percentage.toFixed(0)}%)
              </span>
            )).reduce((prev, curr, i) => (
              <>{prev}{i > 0 && ', '}{curr}</>
            ), <></>)}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
