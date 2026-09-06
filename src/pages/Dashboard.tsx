import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { CategoryChart } from '@/components/dashboard/CategoryChart';
import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { AIInsightsDashboard } from '@/components/dashboard/AIInsightsDashboard';
import { UsageLimitsCard } from '@/components/dashboard/UsageLimitsCard';
import { SavingsGoalsWidget } from '@/components/dashboard/SavingsGoalsWidget';
import { SubscriptionCountdown } from '@/components/subscription/SubscriptionCountdown';
import { CompleteProfileModal } from '@/components/profile/CompleteProfileModal';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useGoals } from '@/hooks/useGoals';
import { useCategories } from '@/hooks/useCategories';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank,
} from 'lucide-react';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default function Dashboard() {
  const { stats, recentTransactions, categoryExpenses, isLoading } = useDashboardData();
  const { goals } = useGoals();
  const { categories } = useCategories();

  // Prepare data for AI insights
  const topCategories = categoryExpenses.slice(0, 5).map(c => ({
    name: c.name,
    amount: c.amount,
    type: 'expense' as string,
  }));

  // Empty budget data for now (budgets hook requires month/year params)
  const budgetData: { category: string; limit: number; spent: number }[] = [];

  const goalData = (goals || []).map(g => ({
    name: g.name,
    target: Number(g.target_amount),
    current: Number(g.current_amount),
    type: g.goal_type,
  }));

  const recentTxData = recentTransactions.map(t => ({
    description: t.description || 'Sem descrição',
    amount: Number(t.amount),
    type: t.type,
    date: t.date,
  }));

  const statCards = [
    {
      title: 'Saldo Total',
      value: formatCurrency(stats.totalBalance),
      icon: Wallet,
      gradient: 'gradient-primary',
      href: '/accounts',
    },
    {
      title: 'Receitas do Mês',
      value: formatCurrency(stats.monthlyIncome),
      change: stats.monthlyIncome > 0 ? 'Este mês' : undefined,
      trend: 'up' as const,
      icon: TrendingUp,
      gradient: 'gradient-income',
      href: '/transactions?type=income',
    },
    {
      title: 'Despesas do Mês',
      value: formatCurrency(stats.monthlyExpenses),
      change: stats.monthlyExpenses > 0 ? 'Este mês' : undefined,
      trend: 'down' as const,
      icon: TrendingDown,
      gradient: 'gradient-expense',
      href: '/transactions?type=expense',
    },
    {
      title: 'Economia',
      value: formatCurrency(stats.monthlyIncome - stats.monthlyExpenses),
      change: stats.monthlyIncome - stats.monthlyExpenses >= 0 ? 'Positivo' : 'Negativo',
      trend: stats.monthlyIncome - stats.monthlyExpenses >= 0 ? 'up' as const : 'down' as const,
      icon: PiggyBank,
      gradient: 'gradient-accent',
      href: '/goals',
    },
  ];

  return (
    <AppLayout>
      {/* Modal para completar cadastro */}
      <CompleteProfileModal />
      
      <div className="space-y-6">
        {/* Subscription Countdown Alert */}
        <SubscriptionCountdown />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Bem-vindo de volta! Aqui está um resumo das suas finanças.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              trend={stat.trend}
              icon={stat.icon}
              gradient={stat.gradient}
              index={index}
              href={stat.href}
            />
          ))}
        </div>

        {/* AI Insights Dashboard */}
        <AIInsightsDashboard
          totalIncome={stats.monthlyIncome}
          totalExpenses={stats.monthlyExpenses}
          balance={stats.totalBalance}
          topCategories={topCategories}
          budgets={budgetData}
          goals={goalData}
          recentTransactions={recentTxData}
        />

        {/* Balance Evolution Chart */}
        <BalanceChart />

        {/* Charts, Transactions and Usage */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
          <CategoryChart data={categoryExpenses} isLoading={isLoading} />
          <RecentTransactions transactions={recentTransactions} isLoading={isLoading} />
          <div className="space-y-4 sm:space-y-6">
            <SavingsGoalsWidget />
            <UsageLimitsCard />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
