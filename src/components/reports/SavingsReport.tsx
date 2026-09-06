import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAutoDeposits } from '@/hooks/useAutoDeposits';
import { useGoals } from '@/hooks/useGoals';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PiggyBank, TrendingUp, Calendar, Wallet, CheckCircle2, Clock, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = ['#8B5CF6', '#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#06B6D4', '#EF4444'];

export function SavingsReport() {
  const { goals } = useGoals();
  const { autoDeposits } = useAutoDeposits();
  const { accounts } = useAccounts();
  
  // Generate last 12 months for selection
  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(today, i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: ptBR }),
      });
    }
    return options;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  const monthStart = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    return startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
  }, [selectedMonth]);

  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);

  const { transactions } = useTransactions({
    startDate: format(monthStart, 'yyyy-MM-dd'),
    endDate: format(monthEnd, 'yyyy-MM-dd'),
  });

  // Filter savings-related transactions (deposits and withdrawals from goals)
  const savingsTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.description?.includes('Depósito na meta:') || 
      t.description?.includes('Saque da meta:') ||
      t.description?.includes('Depósito automático na meta:')
    );
  }, [transactions]);

  // Calculate savings data per goal
  const goalSavingsData = useMemo(() => {
    const savingsGoals = goals.filter(g => g.goal_type === 'target');
    
    return savingsGoals.map(goal => {
      // Get transactions for this goal
      const goalTransactions = savingsTransactions.filter(t => 
        t.description?.includes(goal.name)
      );

      const deposits = goalTransactions
        .filter(t => t.description?.includes('Depósito'))
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const autoDepositsAmount = goalTransactions
        .filter(t => t.description?.includes('Depósito automático'))
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const manualDeposits = deposits - autoDepositsAmount;

      const withdrawals = goalTransactions
        .filter(t => t.description?.includes('Saque'))
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const netSavings = deposits - withdrawals;

      // Get auto deposit config for this goal
      const autoDepositConfig = autoDeposits?.find(ad => ad.goal_id === goal.id);
      const account = accounts?.find(a => a.id === autoDepositConfig?.account_id);

      const progress = goal.target_amount > 0 
        ? Math.min(100, (Number(goal.current_amount) / Number(goal.target_amount)) * 100)
        : 0;

      return {
        id: goal.id,
        name: goal.name,
        targetAmount: Number(goal.target_amount),
        currentAmount: Number(goal.current_amount),
        progress,
        deposits,
        autoDepositsAmount,
        manualDeposits,
        withdrawals,
        netSavings,
        transactionCount: goalTransactions.length,
        hasAutoDeposit: !!autoDepositConfig?.is_active,
        autoDepositAmount: autoDepositConfig?.amount || 0,
        autoDepositDay: autoDepositConfig?.day_of_month,
        accountName: account?.name,
      };
    });
  }, [goals, savingsTransactions, autoDeposits, accounts]);

  // Summary stats
  const summary = useMemo(() => {
    const totalDeposits = goalSavingsData.reduce((sum, g) => sum + g.deposits, 0);
    const totalAutoDeposits = goalSavingsData.reduce((sum, g) => sum + g.autoDepositsAmount, 0);
    const totalManualDeposits = goalSavingsData.reduce((sum, g) => sum + g.manualDeposits, 0);
    const totalWithdrawals = goalSavingsData.reduce((sum, g) => sum + g.withdrawals, 0);
    const netSavings = totalDeposits - totalWithdrawals;
    const goalsWithAutoDeposit = goalSavingsData.filter(g => g.hasAutoDeposit).length;
    const goalsWithActivity = goalSavingsData.filter(g => g.transactionCount > 0).length;

    return {
      totalDeposits,
      totalAutoDeposits,
      totalManualDeposits,
      totalWithdrawals,
      netSavings,
      goalsWithAutoDeposit,
      goalsWithActivity,
    };
  }, [goalSavingsData]);

  // Chart data
  const chartData = useMemo(() => {
    return goalSavingsData
      .filter(g => g.deposits > 0 || g.withdrawals > 0)
      .map(g => ({
        name: g.name.length > 15 ? g.name.substring(0, 15) + '...' : g.name,
        'Depósito Automático': g.autoDepositsAmount,
        'Depósito Manual': g.manualDeposits,
        'Saques': g.withdrawals,
      }));
  }, [goalSavingsData]);

interface ReportTooltipEntry {
  color: string;
  name: string;
  value: number;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: ReportTooltipEntry[]; label?: string }) => {
  if (!active || !payload) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

  if (goalSavingsData.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Relatório de Economia
          </CardTitle>
          <CardDescription>
            Nenhuma meta de economia encontrada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Crie metas de economia do tipo "Meta de Valor" para acompanhar seu progresso aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-primary" />
              Relatório de Economia
            </CardTitle>
            <CardDescription>
              Acompanhe seus depósitos e saques nas metas de economia
            </CardDescription>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card bg-primary/10 p-4">
          <div className="flex items-center gap-2 text-primary mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Total Depositado</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(summary.totalDeposits)}</p>
        </div>
        <div className="glass-card bg-green-500/10 p-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Automático</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(summary.totalAutoDeposits)}</p>
        </div>
        <div className="glass-card bg-blue-500/10 p-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <Wallet className="h-4 w-4" />
            <span className="text-sm font-medium">Manual</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(summary.totalManualDeposits)}</p>
        </div>
        <div className="glass-card bg-orange-500/10 p-4">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
            <Target className="h-4 w-4" />
            <span className="text-sm font-medium">Economia Líquida</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(summary.netSavings)}</p>
        </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="Depósito Automático" stackId="deposits" fill="#22C55E" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Depósito Manual" stackId="deposits" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saques" fill="#EF4444" radius={[4, 4, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Goals Detail */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Detalhes por Meta</h3>
          <div className="grid gap-4">
            {goalSavingsData.map((goal, index) => (
              <div 
                key={goal.id} 
                className="glass-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <h4 className="font-medium">{goal.name}</h4>
                    {goal.hasAutoDeposit && (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Auto: {formatCurrency(goal.autoDepositAmount)}/mês
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {goal.progress.toFixed(0)}% da meta
                  </span>
                </div>

                <Progress value={goal.progress} className="h-2" />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">Dep. Automático</p>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(goal.autoDepositsAmount)}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">Dep. Manual</p>
                    <p className="font-medium text-blue-600 dark:text-blue-400">
                      {formatCurrency(goal.manualDeposits)}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">Saques</p>
                    <p className="font-medium text-red-600 dark:text-red-400">
                      {formatCurrency(goal.withdrawals)}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">Líquido</p>
                    <p className={`font-medium ${goal.netSavings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(goal.netSavings)}
                    </p>
                  </div>
                </div>

                {goal.hasAutoDeposit && goal.accountName && (
                  <p className="text-xs text-muted-foreground">
                    Depósito automático: dia {goal.autoDepositDay} de cada mês via {goal.accountName}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Stats */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-border text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{goalSavingsData.length}</strong> metas de economia
          </span>
          <span>
            <strong className="text-foreground">{summary.goalsWithAutoDeposit}</strong> com depósito automático
          </span>
          <span>
            <strong className="text-foreground">{summary.goalsWithActivity}</strong> com movimentação no mês
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
