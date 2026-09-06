import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDebts, DEBT_STATUS_LABELS, DEBT_PRIORITY_LABELS } from '@/hooks/useDebts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { DebtDialog } from '@/components/debts/DebtDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Debt, DEBT_STATUS_LABELS as STATUS_LABELS, DEBT_PRIORITY_LABELS as PRIORITY_LABELS } from '@/hooks/useDebts';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string | null) => {
  if (!date) return '-';
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
};

export default function DebtDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { debts, isLoading: debtsLoading, updateDebt, recalculateDebt } = useDebts();
  const { transactions, isLoading: txLoading } = useTransactions();
  const { categories } = useCategories();

  const expenseCategories = categories.filter(c => c.type === 'expense');

  const debt = useMemo(
    () => debts.find((d) => d.id === id),
    [debts, id]
  );

  const linkedTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.debt_id === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, id]
  );

  if (debtsLoading || txLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!debt) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-muted-foreground">
          Dívida não encontrada.
        </div>
      </AppLayout>
    );
  }

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'overdue': return 'destructive';
      case 'installment': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/debts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{debt.name}</h1>
            <p className="text-muted-foreground">{debt.creditor}</p>
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Valor original</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatCurrency(Number(debt.original_amount))}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">{formatCurrency(Number(debt.paid_amount || 0))}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saldo devedor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">{formatCurrency(Number(debt.remaining_amount || 0))}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Quitado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{Number(debt.paid_percentage || 0).toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Condições</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={getStatusBadgeVariant(debt.status)}>
                  {STATUS_LABELS[debt.status as keyof typeof STATUS_LABELS] || debt.status}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prioridade</span>
                <Badge variant={getPriorityBadgeVariant(debt.priority)}>
                  {PRIORITY_LABELS[debt.priority as keyof typeof PRIORITY_LABELS] || debt.priority}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Credor</span>
                <span>{debt.creditor}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Juros</span>
                <span>{debt.has_interest ? `Sim (${debt.interest_rate}% ${debt.interest_type || ''})` : 'Não'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Multa</span>
                <span>{debt.has_penalty ? `Sim (${debt.penalty_rate}%)` : 'Não'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Parcelamento</span>
                <span>{debt.installment_enabled ? `${debt.installment_count}x de ${formatCurrency(Number(debt.installment_amount || 0))}` : 'Não'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vencimento</span>
                <span>{formatDate(debt.due_date)}</span>
              </div>
              {debt.lump_sum_settlement_amount && debt.lump_sum_settlement_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quitação à vista</span>
                  <span className="text-green-600">{formatCurrency(Number(debt.lump_sum_settlement_amount))}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {linkedTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
              ) : (
                <div className="space-y-3">
                  {linkedTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{tx.description || 'Pagamento'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                      </div>
                      <span className="font-semibold text-red-600">{formatCurrency(Math.abs(Number(tx.amount)))}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {debt.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{debt.notes}</p>
            </CardContent>
          </Card>
        )}

        {debt.status !== 'paid' && debt.status !== 'canceled' && (
          <Button onClick={() => navigate('/transactions')}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar pagamento
          </Button>
        )}

        <DebtDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          debt={debt}
          categories={expenseCategories}
          onSubmit={(data) => {
            const parseCurrency = (value: string): number => {
              if (!value) return 0;
              const numericValue = value.replace(/\./g, '').replace(',', '.');
              return parseFloat(numericValue) || 0;
            };

            const normalized = {
              ...data,
              original_amount: parseCurrency(data.original_amount),
              lump_sum_settlement_amount: data.lump_sum_settlement_amount ? parseCurrency(data.lump_sum_settlement_amount) : undefined,
              installment_amount: data.installment_amount ? parseCurrency(data.installment_amount) : undefined,
            };

            updateDebt.mutate({ id: debt.id, ...normalized });
            setEditOpen(false);
          }}
        />
      </div>
    </AppLayout>
  );
}
