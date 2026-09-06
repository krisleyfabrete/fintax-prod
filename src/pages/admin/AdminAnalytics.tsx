import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import {
  BarChart3,
  Users,
  TrendingUp,
  Target,
  Activity,
  Zap,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

// Cohort Analysis Hook
function useCohortAnalysis() {
  return useQuery({
    queryKey: ['admin-cohort-analysis'],
    queryFn: async () => {
      const cohorts: Record<string, { month: string; users: string[]; retention: number[] }> = {};
      
      // Buscar todos os usuários com data de criação
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, created_at')
        .order('created_at', { ascending: true });

      if (!profiles) return [];

      // Agrupar usuários por mês de criação
      profiles.forEach(profile => {
        const monthKey = format(new Date(profile.created_at), 'yyyy-MM');
        if (!cohorts[monthKey]) {
          cohorts[monthKey] = { month: monthKey, users: [], retention: [] };
        }
        cohorts[monthKey].users.push(profile.id);
      });

      // Para cada cohort, calcular retenção baseada em transações
      const cohortData = await Promise.all(
        Object.entries(cohorts).slice(-6).map(async ([monthKey, cohort]) => {
          const cohortStart = new Date(monthKey + '-01');
          const retentionRates: number[] = [];

          // Calcular retenção para os próximos 5 meses
          for (let i = 0; i <= 5; i++) {
            const checkMonth = subMonths(new Date(), -i);
            const monthStart = startOfMonth(checkMonth);
            const monthEnd = endOfMonth(checkMonth);

            if (monthStart < cohortStart) {
              retentionRates.push(0);
              continue;
            }

            // Contar usuários ativos (com transações) nesse mês
            const { data: activeUsers } = await supabase
              .from('transactions')
              .select('user_id')
              .in('user_id', cohort.users)
              .gte('created_at', monthStart.toISOString())
              .lte('created_at', monthEnd.toISOString());

            const uniqueActive = new Set(activeUsers?.map(t => t.user_id) || []);
            const retention = cohort.users.length > 0 
              ? Math.round((uniqueActive.size / cohort.users.length) * 100)
              : 0;
            retentionRates.push(retention);
          }

          return {
            month: format(cohortStart, 'MMM yyyy', { locale: ptBR }),
            users: cohort.users.length,
            m0: retentionRates[0] || 100,
            m1: retentionRates[1] || 0,
            m2: retentionRates[2] || 0,
            m3: retentionRates[3] || 0,
            m4: retentionRates[4] || 0,
            m5: retentionRates[5] || 0,
          };
        })
      );

      return cohortData;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Conversion Funnel Hook
function useConversionFunnel() {
  return useQuery({
    queryKey: ['admin-conversion-funnel'],
    queryFn: async () => {
      // Total de usuários
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Usuários com pelo menos 1 conta
      const { data: usersWithAccounts } = await supabase
        .from('accounts')
        .select('user_id');
      const uniqueWithAccounts = new Set(usersWithAccounts?.map(a => a.user_id) || []);

      // Usuários com pelo menos 1 transação
      const { data: usersWithTransactions } = await supabase
        .from('transactions')
        .select('user_id');
      const uniqueWithTransactions = new Set(usersWithTransactions?.map(t => t.user_id) || []);

      // Usuários Pro
      const { count: proUsers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('plan', 'pro');

      // Usuários Family
      const { count: familyUsers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('plan', 'family');

      return [
        { name: 'Cadastros', value: totalUsers || 0, fill: 'hsl(var(--primary))' },
        { name: 'Com Conta', value: uniqueWithAccounts.size, fill: 'hsl(var(--chart-2))' },
        { name: 'Com Transação', value: uniqueWithTransactions.size, fill: 'hsl(var(--chart-3))' },
        { name: 'Plano Pro', value: proUsers || 0, fill: 'hsl(var(--chart-4))' },
        { name: 'Plano Family', value: familyUsers || 0, fill: 'hsl(var(--chart-5))' },
      ];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Engagement Metrics Hook
function useEngagementMetrics() {
  return useQuery({
    queryKey: ['admin-engagement-metrics'],
    queryFn: async () => {
      const today = new Date();
      const last7Days = subDays(today, 7);
      const last30Days = subDays(today, 30);

      // DAU (Daily Active Users) - usuários com transações hoje
      const { data: dauData } = await supabase
        .from('transactions')
        .select('user_id')
        .gte('created_at', today.toISOString().split('T')[0]);
      const dau = new Set(dauData?.map(t => t.user_id) || []).size;

      // WAU (Weekly Active Users)
      const { data: wauData } = await supabase
        .from('transactions')
        .select('user_id')
        .gte('created_at', last7Days.toISOString());
      const wau = new Set(wauData?.map(t => t.user_id) || []).size;

      // MAU (Monthly Active Users)
      const { data: mauData } = await supabase
        .from('transactions')
        .select('user_id')
        .gte('created_at', last30Days.toISOString());
      const mau = new Set(mauData?.map(t => t.user_id) || []).size;

      // Feature usage
      const { count: totalTransactions } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last30Days.toISOString());

      const { count: totalGoals } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last30Days.toISOString());

      const { count: totalBudgets } = await supabase
        .from('budgets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last30Days.toISOString());

      const { count: totalFamilies } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true })
        .gte('joined_at', last30Days.toISOString());

      // Stickiness (DAU/MAU ratio)
      const stickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0;

      // Engagement trend (last 14 days)
      const engagementTrend = [];
      for (let i = 13; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = date.toISOString().split('T')[0];
        
        const { data: dayData } = await supabase
          .from('transactions')
          .select('user_id')
          .gte('created_at', dateStr)
          .lt('created_at', subDays(date, -1).toISOString().split('T')[0]);
        
        engagementTrend.push({
          date: format(date, 'dd/MM', { locale: ptBR }),
          users: new Set(dayData?.map(t => t.user_id) || []).size,
        });
      }

      return {
        dau,
        wau,
        mau,
        stickiness,
        featureUsage: {
          transactions: totalTransactions || 0,
          goals: totalGoals || 0,
          budgets: totalBudgets || 0,
          families: totalFamilies || 0,
        },
        engagementTrend,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// User Activity Distribution
function useActivityDistribution() {
  return useQuery({
    queryKey: ['admin-activity-distribution'],
    queryFn: async () => {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('created_at')
        .gte('created_at', subDays(new Date(), 30).toISOString());

      const hourlyDistribution: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourlyDistribution[i] = 0;

      transactions?.forEach(tx => {
        const hour = new Date(tx.created_at).getHours();
        hourlyDistribution[hour]++;
      });

      return Object.entries(hourlyDistribution).map(([hour, count]) => ({
        hour: `${hour}h`,
        atividades: count,
      }));
    },
    staleTime: 10 * 60 * 1000,
  });
}

export default function AdminAnalytics() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { data: cohortData, isLoading: cohortLoading } = useCohortAnalysis();
  const { data: funnelData, isLoading: funnelLoading } = useConversionFunnel();
  const { data: engagement, isLoading: engagementLoading } = useEngagementMetrics();
  const { data: activityData, isLoading: activityLoading } = useActivityDistribution();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-cohort-analysis'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-conversion-funnel'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-engagement-metrics'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-activity-distribution'] });
  };

  const content = (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Analytics</h1>
        <p className="text-sm lg:text-base text-muted-foreground">Análises avançadas de usuários e engajamento</p>
      </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <Card>
            <CardHeader className="pb-2 px-3 lg:px-6">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                DAU
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 lg:px-6">
              {engagementLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-xl lg:text-2xl font-bold">{engagement?.dau}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-3 lg:px-6">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                WAU
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 lg:px-6">
              {engagementLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-xl lg:text-2xl font-bold">{engagement?.wau}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-3 lg:px-6">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                MAU
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 lg:px-6">
              {engagementLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-xl lg:text-2xl font-bold">{engagement?.mau}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-3 lg:px-6">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Stickiness
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 lg:px-6">
              {engagementLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div className="text-xl lg:text-2xl font-bold">{engagement?.stickiness}%</div>
                  <p className="text-xs text-muted-foreground hidden lg:block">DAU/MAU ratio</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="engagement" className="space-y-4">
          <TabsList className="w-full grid grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="engagement" className="text-xs lg:text-sm">Engajamento</TabsTrigger>
            <TabsTrigger value="funnel" className="text-xs lg:text-sm">Funil</TabsTrigger>
            <TabsTrigger value="cohort" className="text-xs lg:text-sm">Cohort</TabsTrigger>
            <TabsTrigger value="features" className="text-xs lg:text-sm">Features</TabsTrigger>
          </TabsList>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2 lg:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <TrendingUp className="h-5 w-5" />
                    Usuários Ativos (14 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 lg:px-6">
                  {engagementLoading ? <Skeleton className="h-48 lg:h-64 w-full" /> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={engagement?.engagementTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10 }} width={30} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 lg:pb-6">
                  <CardTitle className="text-base lg:text-lg">Distribuição Horária</CardTitle>
                  <CardDescription className="text-xs lg:text-sm">Atividade por hora (30 dias)</CardDescription>
                </CardHeader>
                <CardContent className="px-2 lg:px-6">
                  {activityLoading ? <Skeleton className="h-48 lg:h-64 w-full" /> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={activityData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="hour" tick={{ fontSize: 8 }} interval={2} />
                        <YAxis tick={{ fontSize: 10 }} width={30} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="atividades" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Funnel Tab */}
          <TabsContent value="funnel">
            <Card>
              <CardHeader className="pb-3 lg:pb-6">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <Target className="h-5 w-5" />
                  Funil de Conversão
                </CardTitle>
                <CardDescription className="text-xs lg:text-sm">Do cadastro à assinatura</CardDescription>
              </CardHeader>
              <CardContent>
                {funnelLoading ? <Skeleton className="h-64 lg:h-80 w-full" /> : (
                  <div className="space-y-3 lg:space-y-4">
                    {funnelData?.map((step, index) => {
                      const prevValue = index > 0 ? funnelData[index - 1].value : step.value;
                      const conversionRate = prevValue > 0 ? Math.round((step.value / prevValue) * 100) : 100;
                      const totalRate = funnelData[0].value > 0 ? Math.round((step.value / funnelData[0].value) * 100) : 0;
                      
                      return (
                        <div key={step.name} className="space-y-1 lg:space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 lg:gap-3">
                              <span className="font-medium text-xs lg:text-sm">{step.name}</span>
                              <Badge variant="secondary" className="text-xs">{step.value}</Badge>
                            </div>
                            <div className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm text-muted-foreground">
                              {index > 0 && (
                                <span className="text-primary font-medium">{conversionRate}%</span>
                              )}
                              <span className="hidden lg:inline">({totalRate}% do total)</span>
                            </div>
                          </div>
                          <div className="h-6 lg:h-8 bg-muted rounded-lg overflow-hidden">
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${totalRate}%`,
                                backgroundColor: step.fill,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cohort Tab */}
          <TabsContent value="cohort">
            <Card>
              <CardHeader className="pb-3 lg:pb-6">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <BarChart3 className="h-5 w-5" />
                  Análise de Cohort
                </CardTitle>
                <CardDescription className="text-xs lg:text-sm">Retenção por mês após cadastro</CardDescription>
              </CardHeader>
              <CardContent className="px-2 lg:px-6">
                {cohortLoading ? <Skeleton className="h-64 lg:h-80 w-full" /> : (
                  <>
                    {/* Mobile Cards */}
                    <div className="lg:hidden space-y-3">
                      {cohortData?.map((cohort) => (
                        <div key={cohort.month} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{cohort.month}</span>
                            <Badge variant="secondary">{cohort.users} usuários</Badge>
                          </div>
                          <div className="grid grid-cols-6 gap-1">
                            {[cohort.m0, cohort.m1, cohort.m2, cohort.m3, cohort.m4, cohort.m5].map((rate, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-center h-8 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: `hsl(var(--primary) / ${rate / 100})`,
                                  color: rate > 50 ? 'white' : 'inherit',
                                }}
                              >
                                {rate}%
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium">Cohort</th>
                            <th className="text-center p-3 font-medium">Usuários</th>
                            <th className="text-center p-3 font-medium">Mês 0</th>
                            <th className="text-center p-3 font-medium">Mês 1</th>
                            <th className="text-center p-3 font-medium">Mês 2</th>
                            <th className="text-center p-3 font-medium">Mês 3</th>
                            <th className="text-center p-3 font-medium">Mês 4</th>
                            <th className="text-center p-3 font-medium">Mês 5</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cohortData?.map((cohort) => (
                            <tr key={cohort.month} className="border-b">
                              <td className="p-3 font-medium">{cohort.month}</td>
                              <td className="text-center p-3">{cohort.users}</td>
                              {[cohort.m0, cohort.m1, cohort.m2, cohort.m3, cohort.m4, cohort.m5].map((rate, i) => (
                                <td key={i} className="text-center p-3">
                                  <div
                                    className="inline-flex items-center justify-center w-12 h-8 rounded text-xs font-medium"
                                    style={{
                                      backgroundColor: `hsl(var(--primary) / ${rate / 100})`,
                                      color: rate > 50 ? 'white' : 'inherit',
                                    }}
                                  >
                                    {rate}%
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <Card>
                <CardHeader className="pb-2 px-3 lg:px-6">
                  <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">Transações</CardTitle>
                </CardHeader>
                <CardContent className="px-3 lg:px-6">
                  {engagementLoading ? <Skeleton className="h-8 w-16" /> : (
                    <div className="text-xl lg:text-2xl font-bold">{engagement?.featureUsage.transactions}</div>
                  )}
                  <p className="text-xs text-muted-foreground">últimos 30d</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 px-3 lg:px-6">
                  <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">Metas</CardTitle>
                </CardHeader>
                <CardContent className="px-3 lg:px-6">
                  {engagementLoading ? <Skeleton className="h-8 w-16" /> : (
                    <div className="text-xl lg:text-2xl font-bold">{engagement?.featureUsage.goals}</div>
                  )}
                  <p className="text-xs text-muted-foreground">últimos 30d</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 px-3 lg:px-6">
                  <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">Orçamentos</CardTitle>
                </CardHeader>
                <CardContent className="px-3 lg:px-6">
                  {engagementLoading ? <Skeleton className="h-8 w-16" /> : (
                    <div className="text-xl lg:text-2xl font-bold">{engagement?.featureUsage.budgets}</div>
                  )}
                  <p className="text-xs text-muted-foreground">últimos 30d</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 px-3 lg:px-6">
                  <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">Família</CardTitle>
                </CardHeader>
                <CardContent className="px-3 lg:px-6">
                  {engagementLoading ? <Skeleton className="h-8 w-16" /> : (
                    <div className="text-xl lg:text-2xl font-bold">{engagement?.featureUsage.families}</div>
                  )}
                  <p className="text-xs text-muted-foreground">novos membros</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );

  return (
    <AdminLayout>
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-4rem)]">
          {content}
        </PullToRefresh>
      ) : (
        content
      )}
    </AdminLayout>
  );
}
