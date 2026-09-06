import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import {
  Users,
  CreditCard,
  TrendingUp,
  DollarSign,
  UsersRound,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Clock,
  BarChart3,
  Sparkles,
  Shield,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisMonth: number;
  totalSubscriptions: {
    free: number;
    pro: number;
    family: number;
  };
  totalFamilies: number;
  totalTransactions: number;
  mrr: number;
  pendingPixPayments: number;
  confirmedPixRevenue: number;
  aiUsageToday: number;
  aiUsageThisMonth: number;
}

function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<AdminStats> => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const startMonth = startOfMonth(new Date()).toISOString();
        const endMonth = endOfMonth(new Date()).toISOString();

        const [
          totalUsersRes,
          newUsersTodayRes,
          newUsersThisMonthRes,
          subscriptionsRes,
          totalFamiliesRes,
          totalTransactionsRes,
          pendingPixRes,
          confirmedPixRes,
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startMonth).lte('created_at', endMonth),
          supabase.from('subscriptions').select('plan'),
          supabase.from('family_groups').select('*', { count: 'exact', head: true }),
          supabase.from('transactions').select('*', { count: 'exact', head: true }),
          supabase.from('pix_payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('pix_payments').select('amount').eq('status', 'confirmed'),
        ]);

        if (totalUsersRes.error) throw totalUsersRes.error;
        if (newUsersTodayRes.error) throw newUsersTodayRes.error;
        if (newUsersThisMonthRes.error) throw newUsersThisMonthRes.error;
        if (subscriptionsRes.error) throw subscriptionsRes.error;
        if (totalFamiliesRes.error) throw totalFamiliesRes.error;
        if (totalTransactionsRes.error) throw totalTransactionsRes.error;
        if (pendingPixRes.error) throw pendingPixRes.error;
        if (confirmedPixRes.error) throw confirmedPixRes.error;

        const subscriptions = subscriptionsRes.data || [];
        const confirmedPix = confirmedPixRes.data || [];

        const totalSubscriptions = {
          free: subscriptions.filter((s: { plan: string }) => s.plan === 'free').length || 0,
          pro: subscriptions.filter((s: { plan: string }) => s.plan === 'pro').length || 0,
          family: subscriptions.filter((s: { plan: string }) => s.plan === 'family').length || 0,
        };

        const mrr = totalSubscriptions.pro * 29.9 + totalSubscriptions.family * 49.9;
        const confirmedPixRevenue = confirmedPix.reduce((acc, p: { amount: number }) => acc + Number(p.amount), 0) || 0;

        let aiUsageToday = 0;
        let aiUsageThisMonth = 0;
        try {
          const raw = localStorage.getItem('fintax_ai_usage');
          if (raw) {
            const data = JSON.parse(raw);
            const keys = Object.keys(data).filter((k: string) => k !== 'updated_at');
            for (const key of keys) {
              const [context, date] = key.split('_');
              if (date === today) aiUsageToday += data[key] || 0;
              if (date >= startMonth && date <= endMonth) aiUsageThisMonth += data[key] || 0;
            }
          }
        } catch {
          // ignore
        }

        return {
          totalUsers: totalUsersRes.count || 0,
          newUsersToday: newUsersTodayRes.count || 0,
          newUsersThisMonth: newUsersThisMonthRes.count || 0,
          totalSubscriptions,
          totalFamilies: totalFamiliesRes.count || 0,
          totalTransactions: totalTransactionsRes.count || 0,
          mrr,
          pendingPixPayments: pendingPixRes.count || 0,
          confirmedPixRevenue,
          aiUsageToday,
          aiUsageThisMonth,
        };
      } catch (error) {
        console.error('Error loading admin stats:', error);
        return {
          totalUsers: 0,
          newUsersToday: 0,
          newUsersThisMonth: 0,
          totalSubscriptions: { free: 0, pro: 0, family: 0 },
          totalFamilies: 0,
          totalTransactions: 0,
          mrr: 0,
          pendingPixPayments: 0,
          confirmedPixRevenue: 0,
          aiUsageToday: 0,
          aiUsageThisMonth: 0,
        };
      }
    },
    staleTime: 60 * 1000,
  });
}

function useUserGrowthChart() {
  return useQuery({
    queryKey: ['admin-user-growth'],
    queryFn: async () => {
      const days = 30;
      const data = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = date.toISOString().split('T')[0];

        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', `${dateStr}T23:59:59`);

        if (error) {
          console.warn('Error loading user growth:', error.message);
          data.push({ date: format(date, 'dd/MM', { locale: ptBR }), users: 0 });
          continue;
        }

        data.push({
          date: format(date, 'dd/MM', { locale: ptBR }),
          users: count || 0,
        });
      }

      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useNewUsersPerDay() {
  return useQuery({
    queryKey: ['admin-new-users-per-day'],
    queryFn: async () => {
      const days = 14;
      const data = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = date.toISOString().split('T')[0];

        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', `${dateStr}T00:00:00`)
          .lte('created_at', `${dateStr}T23:59:59`);

        if (error) {
          console.warn('Error loading new users per day:', error.message);
          data.push({ date: format(date, 'dd/MM', { locale: ptBR }), novos: 0 });
          continue;
        }

        data.push({
          date: format(date, 'dd/MM', { locale: ptBR }),
          novos: count || 0,
        });
      }

      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useRecentUsers() {
  return useQuery({
    queryKey: ['admin-recent-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('Error loading recent users:', error.message);
        return [];
      }

      return data || [];
    },
  });
}

const COLORS = ['hsl(var(--muted))', 'hsl(var(--primary))', 'hsl(var(--chart-5))'];

function AdminDashboardContent() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: growthData, isLoading: growthLoading } = useUserGrowthChart();
  const { data: recentUsers, isLoading: usersLoading } = useRecentUsers();
  const { data: newUsersData, isLoading: newUsersLoading } = useNewUsersPerDay();
  const { data: blockedIps, isLoading: blockedIpsLoading } = useQuery({
    queryKey: ['admin-blocked-ips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_blocked_ips')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('blocked_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('ai_blocked_ips table not ready:', error.message);
        return [];
      }

      return data || [];
    },
    retry: false,
    staleTime: 60 * 1000,
  });

  // Realtime subscriptions for dashboard metrics
  useEffect(() => {
    const channels = [
      supabase
        .channel('admin-dashboard-pix')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pix_payments' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
          }
        )
        .subscribe(),
      supabase
        .channel('admin-dashboard-subscriptions')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'subscriptions' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
          }
        )
        .subscribe(),
      supabase
        .channel('admin-dashboard-profiles')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
            queryClient.invalidateQueries({ queryKey: ['admin-user-growth'] });
            queryClient.invalidateQueries({ queryKey: ['admin-recent-users'] });
          }
        )
        .subscribe(),
      supabase
        .channel('admin-dashboard-transactions')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
          }
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [queryClient]);

  const pieData = stats
    ? [
        { name: 'Free', value: stats.totalSubscriptions.free },
        { name: 'Pro', value: stats.totalSubscriptions.pro },
        { name: 'Family', value: stats.totalSubscriptions.family },
      ]
    : [];

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-user-growth'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-recent-users'] });
  };

  const content = (
    <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            Visão geral do sistema em tempo real
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 lg:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                Total de Usuários
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
              {statsLoading ? (
                <Skeleton className="h-7 lg:h-8 w-16 lg:w-20" />
              ) : (
                <>
                  <div className="text-xl lg:text-2xl font-bold">{stats?.totalUsers}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">
                      +{stats?.newUsersToday}
                    </span>{' '}
                    <span className="hidden sm:inline">hoje</span>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                MRR
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
              {statsLoading ? (
                <Skeleton className="h-7 lg:h-8 w-20 lg:w-24" />
              ) : (
                <>
                  <div className="text-lg lg:text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(stats?.mrr || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {stats?.totalSubscriptions.pro} Pro +{' '}
                    {stats?.totalSubscriptions.family} Family
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                Grupos Familiares
              </CardTitle>
              <UsersRound className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
              {statsLoading ? (
                <Skeleton className="h-7 lg:h-8 w-12 lg:w-16" />
              ) : (
                <>
                  <div className="text-xl lg:text-2xl font-bold">{stats?.totalFamilies}</div>
                  <p className="text-xs text-muted-foreground">
                    Famílias ativas
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                Transações
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
              {statsLoading ? (
                <Skeleton className="h-7 lg:h-8 w-16 lg:w-20" />
              ) : (
                <>
                  <div className="text-xl lg:text-2xl font-bold">
                    {stats?.totalTransactions.toLocaleString('pt-BR')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total registradas
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue Stats Row */}
        <div className="grid gap-3 lg:gap-4 grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                Receita PIX Confirmada
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
              {statsLoading ? (
                <Skeleton className="h-7 lg:h-8 w-20 lg:w-24" />
              ) : (
                <>
                  <div className="text-lg lg:text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(stats?.confirmedPixRevenue || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total recebido via PIX
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                PIX Pendentes
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
              {statsLoading ? (
                <Skeleton className="h-7 lg:h-8 w-12 lg:w-16" />
              ) : (
                <>
                  <div className="text-xl lg:text-2xl font-bold text-yellow-600">
                    {stats?.pendingPixPayments}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Aguardando confirmação
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                Receita Total Estimada
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
              {statsLoading ? (
                <Skeleton className="h-7 lg:h-8 w-20 lg:w-24" />
              ) : (
                <>
                  <div className="text-lg lg:text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format((stats?.mrr || 0) + (stats?.confirmedPixRevenue || 0))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    MRR + PIX confirmado
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Usage Stats */}
        <div className="grid gap-3 lg:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                Interações de IA (hoje)
              </CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
              {statsLoading ? (
                <Skeleton className="h-7 lg:h-8 w-12 lg:w-16" />
              ) : (
                <>
                  <div className="text-xl lg:text-2xl font-bold">{stats?.aiUsageToday}</div>
                  <p className="text-xs text-muted-foreground">Clientes</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                Interações de IA (mês)
              </CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
              {statsLoading ? (
                <Skeleton className="h-7 lg:h-8 w-12 lg:w-16" />
              ) : (
                <>
                  <div className="text-xl lg:text-2xl font-bold">{stats?.aiUsageThisMonth}</div>
                  <p className="text-xs text-muted-foreground">Clientes</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                Modelo Atual
              </CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
              {statsLoading ? (
                <Skeleton className="h-7 lg:h-8 w-24 lg:w-32" />
              ) : (
                <>
                  <div className="text-sm lg:text-base font-bold truncate">gemini-3.6-flash</div>
                  <p className="text-xs text-muted-foreground">Configurável em Configurações</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 lg:p-6 lg:pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                Status IA
              </CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 lg:p-6 lg:pt-0">
              {statsLoading ? (
                <Skeleton className="h-7 lg:h-8 w-16 lg:w-20" />
              ) : (
                <>
                  <div className="text-xl lg:text-2xl font-bold text-green-600">Ativo</div>
                  <p className="text-xs text-muted-foreground">Para clientes e admin</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Blocked IPs */}
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-red-500/10">
                  <Shield className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-sm md:text-base">IPs Bloqueados</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Bloqueios automáticos por violações de moderação
                  </CardDescription>
                </div>
              </div>
              {blockedIps && blockedIps.length > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                  {blockedIps.length} bloqueados
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            {blockedIpsLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : blockedIps && blockedIps.length > 0 ? (
              <div className="space-y-2">
                {blockedIps.slice(0, 5).map((ip: { id: string; ip_address: string; reason: string; expires_at: string }) => (
                  <div key={ip.id} className="flex items-center justify-between p-2 rounded-lg border border-red-500/20 bg-red-500/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{ip.ip_address}</p>
                        <p className="text-xs text-muted-foreground truncate">{ip.reason}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {new Date(ip.expires_at).toLocaleString('pt-BR', { 
                        day: '2-digit', 
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum IP bloqueado no momento
              </p>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-3">
          {/* User Growth Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="p-4 lg:p-6">
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />
                Crescimento de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 lg:p-6 pt-0">
              {growthLoading ? (
                <Skeleton className="h-48 lg:h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 200 : 260}>
                  <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" width={40} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Subscription Distribution */}
          <Card>
            <CardHeader className="p-4 lg:p-6">
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                <CreditCard className="h-4 w-4 lg:h-5 lg:w-5" />
                Distribuição de Planos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 lg:p-6 pt-0">
              {statsLoading ? (
                <Skeleton className="h-48 lg:h-64 w-full" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 140 : 180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={window.innerWidth < 768 ? 35 : 50}
                        outerRadius={window.innerWidth < 768 ? 55 : 70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-2 lg:gap-4 text-xs lg:text-sm">
                    <div className="flex items-center gap-1 lg:gap-2">
                      <div className="h-2 w-2 lg:h-3 lg:w-3 rounded-full bg-muted" />
                      <span>Free ({stats?.totalSubscriptions.free})</span>
                    </div>
                    <div className="flex items-center gap-1 lg:gap-2">
                      <div className="h-2 w-2 lg:h-3 lg:w-3 rounded-full bg-primary" />
                      <span>Pro ({stats?.totalSubscriptions.pro})</span>
                    </div>
                    <div className="flex items-center gap-1 lg:gap-2">
                      <div
                        className="h-2 w-2 lg:h-3 lg:w-3 rounded-full"
                        style={{ backgroundColor: 'hsl(var(--chart-5))' }}
                      />
                      <span>Family ({stats?.totalSubscriptions.family})</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* New Users Per Day Chart */}
        <Card>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5" />
              Novos Usuários por Dia (14 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 lg:p-6 pt-0">
            {newUsersLoading ? (
              <Skeleton className="h-48 lg:h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 200 : 260}>
                <BarChart data={newUsersData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" width={30} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="novos"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">Usuários Recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 lg:p-6 pt-0">
            {usersLoading ? (
              <div className="space-y-3 lg:space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3 lg:space-y-4">
                {recentUsers?.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 lg:p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name || 'User'}
                          className="h-8 w-8 lg:h-10 lg:w-10 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm lg:text-base truncate">{user.full_name || 'Sem nome'}</p>
                      <p className="text-xs lg:text-sm text-muted-foreground">
                        {format(new Date(user.created_at), "dd/MM/yy HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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

export default AdminDashboardContent;
