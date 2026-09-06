import { supabase } from '@/integrations/supabase/client';
import type { DebtStatus } from '@/hooks/useDebts';

export async function recalculateDebt(debtId: string, userId?: string) {
  const { data: debt, error: debtError } = await supabase
    .from('debts')
    .select('*')
    .eq('id', debtId)
    .single();

  if (debtError || !debt) {
    console.error('Error fetching debt for recalculation:', debtError);
    return;
  }

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('amount, type, status')
    .eq('debt_id', debtId)
    .eq('type', 'expense')
    .eq('status', 'confirmed');

  if (txError) {
    console.error('Error fetching transactions for debt recalculation:', txError);
    return;
  }

  const paidAmount = (transactions || [])
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const remainingAmount = Math.max(0, Number(debt.original_amount) - paidAmount);
  const paidPercentage = Number(debt.original_amount) > 0
    ? Math.min(100, (paidAmount / Number(debt.original_amount)) * 100)
    : 0;

  let status: DebtStatus = debt.status;
  if (remainingAmount <= 0) {
    status = 'paid';
  } else if (debt.due_date && new Date(debt.due_date) < new Date() && debt.status !== 'paid') {
    status = 'overdue';
  } else if (debt.installment_enabled && debt.installment_count && debt.installment_count > 1) {
    status = 'installment';
  }

  const updates: Record<string, unknown> = {
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    paid_percentage: paidPercentage,
    status,
  };

  if (status === 'paid' && !debt.settled_at) {
    updates.settled_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from('debts')
    .update(updates)
    .eq('id', debtId);

  if (updateError) {
    console.error('Error updating debt after recalculation:', updateError);
  }
}
