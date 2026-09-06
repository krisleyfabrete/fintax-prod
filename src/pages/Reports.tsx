import { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useGoals } from '@/hooks/useGoals';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { SummaryCards } from '@/components/reports/SummaryCards';
import { CategoryPieChart } from '@/components/reports/CategoryPieChart';
import { MonthlyTrendChart } from '@/components/reports/MonthlyTrendChart';
import { AccountBalanceChart } from '@/components/reports/AccountBalanceChart';
import { TopCategoriesTable } from '@/components/reports/TopCategoriesTable';
import { ExportButtons } from '@/components/reports/ExportButtons';
import { PeriodComparison } from '@/components/reports/PeriodComparison';
import { GoalProgress } from '@/components/reports/GoalProgress';
import { SavingsReport } from '@/components/reports/SavingsReport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function Reports() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(today, 5)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState('all');

  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { transactions, isLoading: transactionsLoading } = useTransactions({
    startDate,
    endDate,
    accountId: accountId !== 'all' ? accountId : undefined,
  });
  
  // Get all transactions for comparison (without date filter)
  const { transactions: allTransactions } = useTransactions();
  const { goals, isLoading: goalsLoading } = useGoals();

  const isLoading = accountsLoading || transactionsLoading || goalsLoading;

  // Filter confirmed transactions for calculations
  const confirmedTransactions = useMemo(() => 
    transactions.filter(t => t.status === 'confirmed'),
    [transactions]
  );

  // Calculate totals
  const totalIncome = useMemo(() =>
    confirmedTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0),
    [confirmedTransactions]
  );

  const totalExpense = useMemo(() =>
    confirmedTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0),
    [confirmedTransactions]
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">
              Analise suas finanças com gráficos e relatórios detalhados
            </p>
          </div>
          
          {!isLoading && (
            <ExportButtons
              transactions={confirmedTransactions}
              startDate={startDate}
              endDate={endDate}
              totalIncome={totalIncome}
              totalExpense={totalExpense}
            />
          )}
        </div>

        {/* Filters */}
        <ReportFilters
          startDate={startDate}
          endDate={endDate}
          accountId={accountId}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onAccountChange={setAccountId}
          accounts={accounts}
        />

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-[400px]" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <SummaryCards
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              transactionCount={confirmedTransactions.length}
            />

            {/* Period Comparison */}
            <PeriodComparison
              transactions={confirmedTransactions}
              allTransactions={allTransactions}
            />

            {/* Goals Progress */}
            <GoalProgress goals={goals} transactions={confirmedTransactions} />

            {/* Tabs for different views */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="savings">Economia</TabsTrigger>
                <TabsTrigger value="categories">Categorias</TabsTrigger>
                <TabsTrigger value="accounts">Contas</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Monthly Trend */}
                <MonthlyTrendChart
                  transactions={transactions}
                  startDate={startDate}
                  endDate={endDate}
                />

                {/* Category Charts Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CategoryPieChart transactions={confirmedTransactions} type="expense" />
                  <CategoryPieChart transactions={confirmedTransactions} type="income" />
                </div>
              </TabsContent>

              <TabsContent value="savings" className="space-y-6">
                <SavingsReport />
              </TabsContent>

              <TabsContent value="categories" className="space-y-6">
                {/* Top Categories Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TopCategoriesTable transactions={confirmedTransactions} type="expense" />
                  <TopCategoriesTable transactions={confirmedTransactions} type="income" />
                </div>

                {/* Category Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CategoryPieChart
                    transactions={confirmedTransactions}
                    type="expense"
                    title="Distribuição de Despesas"
                  />
                  <CategoryPieChart
                    transactions={confirmedTransactions}
                    type="income"
                    title="Distribuição de Receitas"
                  />
                </div>
              </TabsContent>

              <TabsContent value="accounts" className="space-y-6">
                {/* Account Balance Chart */}
                <AccountBalanceChart accounts={accounts} />

                {/* Monthly Trend by Account */}
                <MonthlyTrendChart
                  transactions={transactions}
                  startDate={startDate}
                  endDate={endDate}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}
