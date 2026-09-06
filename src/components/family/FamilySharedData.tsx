import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownRight, ArrowUpRight, Wallet, Target, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFamilyData, FamilyDataFilters as Filters } from '@/hooks/useFamilyData';
import { FamilyGroup } from '@/hooks/useFamily';
import { FamilyDataFilters } from './FamilyDataFilters';

interface FamilyTransaction {
  id: string;
  user_id: string;
  description?: string;
  category?: { name: string; icon?: string };
  date: string;
  type: string;
  amount: number;
}

interface FamilyAccount {
  id: string;
  user_id: string;
  name: string;
  type?: string;
  balance?: number;
  color?: string;
}

interface FamilyGoal {
  id: string;
  user_id: string;
  name: string;
  current_amount?: number;
  target_amount?: number;
}

interface FamilySharedDataProps {
  group: FamilyGroup;
}

export function FamilySharedData({ group }: FamilySharedDataProps) {
  const [filters, setFilters] = useState<Filters>({});
  
  const {
    sharedTransactions,
    sharedAccounts,
    sharedBudgets,
    sharedGoals,
    memberProfiles,
    getMemberName,
    totalSharedIncome,
    totalSharedExpense,
    totalSharedBalance,
    isLoading,
  } = useFamilyData(group.id, filters);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getMemberProfile = (userId: string) => {
    return memberProfiles.find(p => p.id === userId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const hasAnySharedData =
    sharedTransactions.length > 0 ||
    sharedAccounts.length > 0 ||
    sharedBudgets.length > 0 ||
    sharedGoals.length > 0;

  if (!hasAnySharedData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Nenhum dado compartilhado ainda. Membros podem compartilhar transações, contas, orçamentos e metas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <FamilyDataFilters
        memberProfiles={memberProfiles}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receitas Compartilhadas</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalSharedIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Despesas Compartilhadas</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalSharedExpense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo em Contas</p>
                <p className="text-xl font-bold">{formatCurrency(totalSharedBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different data types */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transactions">
            Transações ({sharedTransactions.length})
          </TabsTrigger>
          <TabsTrigger value="accounts">
            Contas ({sharedAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="budgets">
            Orçamentos ({sharedBudgets.length})
          </TabsTrigger>
          <TabsTrigger value="goals">
            Metas ({sharedGoals.length})
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-3 mt-4">
          {sharedTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma transação compartilhada</p>
          ) : (
            sharedTransactions.map((tx: FamilyTransaction) => {
              const profile = getMemberProfile(tx.user_id);
              return (
                <Card key={tx.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{tx.description || tx.category?.name || 'Transação'}</p>
                          <p className="text-xs text-muted-foreground">
                            {getMemberName(tx.user_id)} • {format(new Date(tx.date), "dd 'de' MMM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                        {tx.category && (
                          <Badge variant="secondary" className="text-xs">
                            {tx.category.icon} {tx.category.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-3 mt-4">
          {sharedAccounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma conta compartilhada</p>
          ) : (
            sharedAccounts.map((account: FamilyAccount) => {
              const profile = getMemberProfile(account.user_id);
              return (
                <Card key={account.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: account.color || '#8B5CF6' }}
                        >
                          {account.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getMemberName(account.user_id)}
                          </p>
                        </div>
                      </div>
                      <p className={`font-semibold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(account.balance)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Budgets Tab */}
        <TabsContent value="budgets" className="space-y-3 mt-4">
          {sharedBudgets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum orçamento compartilhado</p>
          ) : (
            sharedBudgets.map((budget: { id: string; user_id: string; category?: { name: string; icon?: string }; amount: number; spent: number; percentage: number; status?: string }) => {
              const profile = getMemberProfile(budget.user_id);
              return (
                <Card key={budget.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <PiggyBank className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{budget.category?.name || 'Orçamento'}</p>
                          <p className="text-xs text-muted-foreground">
                            {getMemberName(budget.user_id)} • {budget.month}/{budget.year}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">{formatCurrency(budget.amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-3 mt-4">
          {sharedGoals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma meta compartilhada</p>
          ) : (
            sharedGoals.map((goal: FamilyGoal) => {
              const profile = getMemberProfile(goal.user_id);
              const progress = (goal.current_amount / goal.target_amount) * 100;
              return (
                <Card key={goal.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Target className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{goal.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getMemberName(goal.user_id)} • {progress.toFixed(0)}% concluído
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(goal.target_amount)}</p>
                        <Badge variant={goal.goal_type === 'limit' ? 'destructive' : 'default'} className="text-xs">
                          {goal.goal_type === 'limit' ? 'Limite' : 'Meta'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
