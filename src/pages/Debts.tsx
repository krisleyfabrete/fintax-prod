import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDebts, Debt, DEBT_STATUS_LABELS, DEBT_PRIORITY_LABELS, DebtFilters } from '@/hooks/useDebts';
import { useCategories } from '@/hooks/useCategories';
import { DebtDialog } from '@/components/debts/DebtDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, MoreHorizontal, Pencil, Trash2, Archive, Eye, DollarSign, TrendingUp, CheckCircle, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';
import type { FormData } from '@/components/debts/DebtDialog';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string | null) => {
  if (!date) return '-';
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
};

export default function Debts() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [deleteDebtId, setDeleteDebtId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [creditorFilter, setCreditorFilter] = useState('');

  const { debts, isLoading, createDebt, updateDebt, deleteDebt, archiveDebt } = useDebts();
  const { categories } = useCategories();

  const expenseCategories = useMemo(
    () => categories.filter(c => c.type === 'expense'),
    [categories]
  );

  const filters: DebtFilters = useMemo(() => ({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter as Debt['status'] : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter as Debt['priority'] : undefined,
    creditor: creditorFilter || undefined,
  }), [search, statusFilter, priorityFilter, creditorFilter]);

  const { debts: filteredDebts } = useDebts(filters);

  const kpis = useMemo(() => {
    const openDebts = debts.filter(d => d.status !== 'paid' && d.status !== 'canceled');
    const totalBalance = openDebts.reduce((sum, d) => sum + Number(d.remaining_amount || 0), 0);
    const totalPaid = debts.reduce((sum, d) => sum + Number(d.paid_amount || 0), 0);
    const totalLumpSum = debts
      .filter(d => d.lump_sum_settlement_amount && d.status !== 'paid')
      .reduce((sum, d) => sum + Number(d.lump_sum_settlement_amount || 0), 0);
    const potentialSavings = debts
      .filter(d => d.lump_sum_settlement_amount && d.status !== 'paid' && d.remaining_amount && d.lump_sum_settlement_amount < d.remaining_amount)
      .reduce((sum, d) => sum + (Number(d.remaining_amount || 0) - Number(d.lump_sum_settlement_amount || 0)), 0);

    return {
      openCount: openDebts.length,
      totalBalance,
      totalPaid,
      totalLumpSum,
      potentialSavings,
    };
  }, [debts]);

  const handleSave = (data: FormData) => {
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
      start_date: data.start_date || null,
      due_date: data.due_date || null,
    };

    if (editingDebt) {
      updateDebt.mutate({ id: editingDebt.id, ...normalized });
    } else {
      createDebt.mutate(normalized);
    }
    setDialogOpen(false);
    setEditingDebt(null);
  };

  const handleDelete = () => {
    if (deleteDebtId) {
      deleteDebt.mutate(deleteDebtId);
      setDeleteDebtId(null);
    }
  };

  const handleArchive = (id: string) => {
    archiveDebt.mutate(id);
  };

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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Minhas Dívidas</h1>
            <p className="text-muted-foreground">
              Controle suas obrigações financeiras, pagamentos e oportunidades de quitação.
            </p>
          </div>
          <Button onClick={() => { setEditingDebt(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nova dívida
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em aberto</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.openCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo devedor</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(kpis.totalBalance)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total pago</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(kpis.totalPaid)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quitação à vista</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.totalLumpSum)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Economia potencial</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(kpis.potentialSavings)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Input
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="lg:col-span-2"
              />

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Em aberto</SelectItem>
                  <SelectItem value="negotiating">Em negociação</SelectItem>
                  <SelectItem value="installment">Parcelada</SelectItem>
                  <SelectItem value="overdue">Atrasada</SelectItem>
                  <SelectItem value="paid">Quitada</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Credor"
                value={creditorFilter}
                onChange={(e) => setCreditorFilter(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Debts List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDebts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Nenhuma dívida encontrada.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDebts.map((debt) => (
              <Card key={debt.id} className="flex flex-col cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/debts/${debt.id}`)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{debt.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{debt.creditor}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingDebt(debt); setDialogOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(debt.id); }}>
                          <Archive className="mr-2 h-4 w-4" />
                          Arquivar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setDeleteDebtId(debt.id); }}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getStatusBadgeVariant(debt.status)}>
                      {DEBT_STATUS_LABELS[debt.status as keyof typeof DEBT_STATUS_LABELS] || debt.status}
                    </Badge>
                    <Badge variant={getPriorityBadgeVariant(debt.priority)}>
                      {DEBT_PRIORITY_LABELS[debt.priority as keyof typeof DEBT_PRIORITY_LABELS] || debt.priority}
                    </Badge>
                    {debt.has_interest && <Badge variant="outline">Juros</Badge>}
                    {debt.installment_enabled && <Badge variant="outline">Parcelada</Badge>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Saldo devedor</span>
                      <span className="font-semibold text-red-600">{formatCurrency(Number(debt.remaining_amount || 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Original</span>
                      <span className="font-medium">{formatCurrency(Number(debt.original_amount))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pago</span>
                      <span className="font-medium text-green-600">{formatCurrency(Number(debt.paid_amount || 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quitado</span>
                      <span className="font-medium">{Number(debt.paid_percentage || 0).toFixed(1)}%</span>
                    </div>
                  </div>

                  {debt.due_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Vencimento</span>
                      <span className={debt.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                        {formatDate(debt.due_date)}
                      </span>
                    </div>
                  )}

                  {debt.installment_enabled && debt.installment_amount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Parcela</span>
                      <span className="font-medium">{formatCurrency(Number(debt.installment_amount))}</span>
                    </div>
                  )}

                  {debt.lump_sum_settlement_amount && debt.lump_sum_settlement_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quitação à vista</span>
                      <span className="font-medium text-green-600">{formatCurrency(Number(debt.lump_sum_settlement_amount))}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialogs */}
        <DebtDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          debt={editingDebt}
          categories={expenseCategories}
          onSubmit={handleSave}
        />

        <AlertDialog open={!!deleteDebtId} onOpenChange={(open) => !open && setDeleteDebtId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir dívida</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta dívida? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
