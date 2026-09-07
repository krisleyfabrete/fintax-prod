import { useState, useEffect } from 'react';
import { Plus, Target, Pencil, Trash2, Bell, PiggyBank, History, ArrowUpRight, CalendarClock, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useGoals, Goal, GoalInsert } from '@/hooks/useGoals';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useHasFamily } from '@/hooks/useFamily';
import { GoalDialog } from '@/components/goals/GoalDialog';
import { GoalDepositDialog } from '@/components/goals/GoalDepositDialog';
import { GoalWithdrawDialog } from '@/components/goals/GoalWithdrawDialog';
import { GoalHistoryDialog } from '@/components/goals/GoalHistoryDialog';
import { GoalProgressChart } from '@/components/goals/GoalProgressChart';
import { GoalAutoDepositDialog } from '@/components/goals/GoalAutoDepositDialog';
import { GoalEvolutionChart } from '@/components/goals/GoalEvolutionChart';
import { GoalPrediction } from '@/components/goals/GoalPrediction';
import { GoalRanking } from '@/components/goals/GoalRanking';
import { GoalNotifications } from '@/components/goals/GoalNotifications';
import { GoalSavingsSuggestion } from '@/components/goals/GoalSavingsSuggestion';
import { GoalReminderDialog } from '@/components/goals/GoalReminderDialog';
import { GoalLimitBanner } from '@/components/goals/GoalLimitBanner';
import { useGoalReminders } from '@/hooks/useGoalReminders';
import { useAutoDeposits } from '@/hooks/useAutoDeposits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Goals() {
  const hasFamily = useHasFamily();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialGoalType, setInitialGoalType] = useState<'limit' | 'target'>('limit');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const [reminderGoal, setReminderGoal] = useState<Goal | null>(null);
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<Goal | null>(null);
  const [historyGoal, setHistoryGoal] = useState<Goal | null>(null);
  const [autoDepositGoal, setAutoDepositGoal] = useState<Goal | null>(null);
  const [chartGoal, setChartGoal] = useState<Goal | null>(null);

  const { goals, isLoading, createGoal, updateGoal, deleteGoal, depositToGoal, withdrawFromGoal, isCreating, isUpdating, isDeleting, isDepositing, isWithdrawing, canCreateGoal } = useGoals();
  const { categories } = useCategories();
  const { transactions } = useTransactions();
  const { getReminderForGoal } = useGoalReminders();
  const { getAutoDepositForGoal, createAutoDeposit } = useAutoDeposits();

  const handleOpenDialog = (goal?: Goal, goalType?: 'limit' | 'target') => {
    setEditingGoal(goal || null);
    if (goalType) {
      setInitialGoalType(goalType);
    }
    setDialogOpen(true);
  };

  const handleSaveGoal = (data: GoalInsert) => {
    // Converte valor formatado para número
    const parseCurrency = (value: string): number => {
      if (!value) return 0;
      const numericValue = value.replace(/\./g, '').replace(',', '.');
      return parseFloat(numericValue) || 0;
    };

    const goalData: GoalInsert = {
      name: data.name,
      target_amount: parseCurrency(data.target_amount),
      goal_type: data.goal_type,
      period_type: data.period_type,
      category_id: data.category_id || null,
      start_date: data.start_date,
    };

    // Extract auto-deposit config if provided
    const monthlyAmount = parseCurrency(data.monthly_amount || '');
    const autoDepositAccountId = data.auto_deposit_account_id;
    const autoDepositDay = data.auto_deposit_day || 5;

    if (editingGoal) {
      updateGoal.mutate({ id: editingGoal.id, ...goalData }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingGoal(null);
        },
      });
    } else {
      createGoal.mutate(goalData, {
        onSuccess: (newGoal: Goal) => {
          // If monthly amount and account were provided, create auto-deposit
          if (monthlyAmount > 0 && autoDepositAccountId && autoDepositAccountId !== 'none' && newGoal?.id) {
            createAutoDeposit.mutate({
              goal_id: newGoal.id,
              account_id: autoDepositAccountId,
              amount: monthlyAmount,
              day_of_month: autoDepositDay,
              frequency: 'monthly',
              is_active: true,
            });
          }
          setDialogOpen(false);
        },
      });
    }
  };

  const handleDeleteGoal = () => {
    if (deleteGoalId) {
      deleteGoal.mutate(deleteGoalId, {
        onSuccess: () => setDeleteGoalId(null),
      });
    }
  };

  const toggleGoalActive = (goal: Goal) => {
    updateGoal.mutate({ id: goal.id, is_active: !goal.is_active });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const periodLabels: Record<string, string> = {
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
  };

  const calculateProgress = (goal: Goal) => {
    let currentAmount: number;
    
    // Para metas de economia (target), usar o current_amount da própria meta
    // Para limites de gasto (limit), calcular baseado nas transações
    if (goal.goal_type === 'target') {
      currentAmount = goal.current_amount || 0;
    } else {
      const relevantTransactions = transactions.filter(
        (t) => t.category_id === goal.category_id && t.status === 'confirmed'
      );
      currentAmount = relevantTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    }
    
    const percentage = goal.target_amount > 0 ? (currentAmount / goal.target_amount) * 100 : 0;

    let status: 'on_track' | 'warning' | 'exceeded' | 'completed';
    if (goal.goal_type === 'limit') {
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= 80) status = 'warning';
      else status = 'on_track';
    } else {
      if (percentage >= 100) status = 'completed';
      else if (percentage >= 70) status = 'on_track';
      else status = 'warning';
    }

    return { currentAmount, percentage: Math.min(percentage, 100), actualPercentage: percentage, status };
  };

  const getStatusConfig = (status: string, goalType: string) => {
    if (goalType === 'limit') {
      switch (status) {
        case 'exceeded':
          return { color: 'bg-red-500', textColor: 'text-red-500', icon: AlertTriangle, label: 'Excedido' };
        case 'warning':
          return { color: 'bg-yellow-500', textColor: 'text-yellow-500', icon: AlertTriangle, label: 'Atenção' };
        default:
          return { color: 'bg-green-500', textColor: 'text-green-500', icon: CheckCircle, label: 'OK' };
      }
    } else {
      switch (status) {
        case 'completed':
          return { color: 'bg-green-500', textColor: 'text-green-500', icon: CheckCircle, label: 'Atingida' };
        case 'on_track':
          return { color: 'bg-blue-500', textColor: 'text-blue-500', icon: CheckCircle, label: 'No caminho' };
        default:
          return { color: 'bg-yellow-500', textColor: 'text-yellow-500', icon: AlertTriangle, label: 'Acelerar' };
      }
    }
  };

  const activeGoals = goals.filter((g) => g.is_active);
  const inactiveGoals = goals.filter((g) => !g.is_active);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Metas</h1>
            <p className="text-muted-foreground">
              Acompanhe seu progresso em direção aos seus objetivos financeiros
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2" disabled={!canCreateGoal}>
                <Plus className="h-4 w-4" />
                Nova Meta
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border shadow-lg">
              <DropdownMenuItem 
                onClick={() => handleOpenDialog(undefined, 'limit')}
                className="flex items-center gap-3 cursor-pointer py-3"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Limite de Gastos</span>
                  <span className="text-xs text-muted-foreground">Controle seus gastos</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleOpenDialog(undefined, 'target')}
                className="flex items-center gap-3 cursor-pointer py-3"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10">
                  <PiggyBank className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Meta de Economia</span>
                  <span className="text-xs text-muted-foreground">Junte dinheiro para um objetivo</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <>
            <GoalLimitBanner currentCount={goals.length} />
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma meta criada</h3>
                <p className="text-muted-foreground text-center">
                  Crie metas para acompanhar seus gastos e economias
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Goal Limit Banner */}
            <GoalLimitBanner currentCount={goals.length} />

            {/* Goal Notifications */}
            <GoalNotifications goals={goals} transactions={transactions} />

            {/* Savings Suggestions */}
            <GoalSavingsSuggestion goals={goals} transactions={transactions} />

            {/* Goal Evolution Chart */}
            <GoalEvolutionChart goals={goals} transactions={transactions} />

            {/* Goal Prediction & Ranking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GoalPrediction goals={goals} transactions={transactions} />
              <GoalRanking goals={goals} transactions={transactions} />
            </div>

            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Metas Ativas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeGoals.map((goal) => {
                    const progress = calculateProgress(goal);
                    const statusConfig = getStatusConfig(progress.status, goal.goal_type);
                    const StatusIcon = statusConfig.icon;
                    const hasReminder = !!getReminderForGoal(goal.id);
                    const hasAutoDeposit = !!getAutoDepositForGoal(goal.id);

                    return (
                      <Card key={goal.id} className="relative">
                        {/* Badges for active features */}
                        <div className="absolute top-2 right-12 z-10 flex gap-1">
                          {hasAutoDeposit && (
                            <div className="bg-green-500/10 text-green-500 p-1 rounded-full" title="Depósito automático ativo">
                              <CalendarClock className="h-3.5 w-3.5" />
                            </div>
                          )}
                          {hasReminder && (
                            <div className="bg-primary/10 text-primary p-1 rounded-full" title="Lembrete ativo">
                              <Bell className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-base flex items-center gap-2">
                                {goal.category && (
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: goal.category.color }}
                                  />
                                )}
                                {goal.name}
                              </CardTitle>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {goal.goal_type === 'limit' ? 'Limite' : 'Meta'}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {periodLabels[goal.period_type]}
                                </Badge>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog(goal)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setReminderGoal(goal)}>
                                  <Bell className="h-4 w-4 mr-2" />
                                  {getReminderForGoal(goal.id) ? 'Editar lembrete' : 'Criar lembrete'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleGoalActive(goal)}>
                                  Desativar
                                </DropdownMenuItem>
                                {goal.goal_type === 'target' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setDepositGoal(goal)}>
                                      <PiggyBank className="h-4 w-4 mr-2" />
                                      Depositar
                                    </DropdownMenuItem>
                                    {goal.current_amount > 0 && (
                                      <DropdownMenuItem onClick={() => setWithdrawGoal(goal)}>
                                        <ArrowUpRight className="h-4 w-4 mr-2" />
                                        Sacar
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => setAutoDepositGoal(goal)}>
                                      <CalendarClock className="h-4 w-4 mr-2" />
                                      {getAutoDepositForGoal(goal.id) ? 'Editar automático' : 'Depósito automático'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setChartGoal(goal)}>
                                      <TrendingUp className="h-4 w-4 mr-2" />
                                      Ver evolução
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setHistoryGoal(goal)}>
                                      <History className="h-4 w-4 mr-2" />
                                      Histórico
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteGoalId(goal.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {goal.category && (
                            <p className="text-sm text-muted-foreground">{goal.category.name}</p>
                          )}

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {formatCurrency(progress.currentAmount)} de {formatCurrency(goal.target_amount)}
                              </span>
                              <span className={`font-medium ${statusConfig.textColor}`}>
                                {progress.actualPercentage.toFixed(0)}%
                              </span>
                            </div>
                            <Progress value={progress.percentage} className="h-2" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-1 ${statusConfig.textColor}`}>
                              <StatusIcon className="h-4 w-4" />
                              <span className="text-sm font-medium">{statusConfig.label}</span>
                            </div>
                            
                            {/* Botão de Depositar para metas de economia */}
                            {goal.goal_type === 'target' && progress.actualPercentage < 100 && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => setDepositGoal(goal)}
                              >
                                <PiggyBank className="h-3 w-3" />
                                Depositar
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inactive Goals */}
            {inactiveGoals.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-muted-foreground">Metas Inativas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inactiveGoals.map((goal) => (
                    <Card key={goal.id} className="opacity-60">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{goal.name}</CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toggleGoalActive(goal)}>
                                Ativar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteGoalId(goal.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Meta: {formatCurrency(goal.target_amount)} / {periodLabels[goal.period_type]}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Goal Dialog */}
      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        goal={editingGoal}
        categories={categories}
        onSave={handleSaveGoal}
        isLoading={isCreating || isUpdating}
        initialGoalType={initialGoalType}
        hasFamily={hasFamily}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A meta será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGoal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reminder Dialog */}
      {reminderGoal && (
        <GoalReminderDialog
          open={!!reminderGoal}
          onOpenChange={(open) => !open && setReminderGoal(null)}
          goal={reminderGoal}
        />
      )}

      {/* Deposit Dialog */}
      {depositGoal && (
        <GoalDepositDialog
          open={!!depositGoal}
          onOpenChange={(open) => !open && setDepositGoal(null)}
          goal={depositGoal}
          onDeposit={(goalId, amount, accountId) => {
            depositToGoal.mutate(
              { goalId, amount, accountId },
              {
                onSuccess: () => setDepositGoal(null),
              }
            );
          }}
          isLoading={isDepositing}
        />
      )}

      {/* Withdraw Dialog */}
      {withdrawGoal && (
        <GoalWithdrawDialog
          open={!!withdrawGoal}
          onOpenChange={(open) => !open && setWithdrawGoal(null)}
          goal={withdrawGoal}
          onWithdraw={(goalId, amount, accountId) => {
            withdrawFromGoal.mutate(
              { goalId, amount, accountId },
              {
                onSuccess: () => setWithdrawGoal(null),
              }
            );
          }}
          isLoading={isWithdrawing}
        />
      )}

      {/* History Dialog */}
      {historyGoal && (
        <GoalHistoryDialog
          open={!!historyGoal}
          onOpenChange={(open) => !open && setHistoryGoal(null)}
          goal={historyGoal}
        />
      )}

      {/* Auto Deposit Dialog */}
      {autoDepositGoal && (
        <GoalAutoDepositDialog
          open={!!autoDepositGoal}
          onOpenChange={(open) => !open && setAutoDepositGoal(null)}
          goal={autoDepositGoal}
        />
      )}

      {/* Chart Dialog */}
      {chartGoal && (
        <Dialog open={!!chartGoal} onOpenChange={(open) => !open && setChartGoal(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <GoalProgressChart goal={chartGoal} />
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
