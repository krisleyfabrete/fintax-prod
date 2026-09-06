import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Percent,
  PiggyBank,
  BarChart3,
  QrCode,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart
} from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { DEFAULT_PLAN_PRICES_REAIS, normalizePlanPrices } from '@/lib/planPrices';

const COLORS = ['hsl(var(--muted))', 'hsl(var(--primary))', 'hsl(var(--chart-5))'];

type PixPaymentStatus = 'pending' | 'confirmed' | 'rejected';

interface PixPayment {
  id: string;
  user_id: string;
  user_email: string;
  plan: string;
  interval: string;
  amount: number;
  pix_code: string;
  status: PixPaymentStatus;
  created_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
  notes: string | null;
}

export default function AdminFinancial() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-financial-subscriptions'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-pix-payments-financial'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-plan-prices'] });
  };

  // Fetch plan prices from admin_settings
  const { data: planPricesData } = useQuery({
    queryKey: ['admin-plan-prices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'plan_prices')
        .maybeSingle();
      return data?.value ?? null;
    },
  });

  // Use real prices from database or fallback to defaults (em reais)
  const normalizedPrices = planPricesData ? normalizePlanPrices(planPricesData) : DEFAULT_PLAN_PRICES_REAIS;
  const PLAN_PRICES = {
    free: 0,
    pro: normalizedPrices.pro_monthly,
    family: normalizedPrices.family_monthly,
  };

  // Fetch subscription data
  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-financial-subscriptions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: true });
      return data || [];
    },
  });

  // Fetch PIX payments data
  const { data: pixPayments, isLoading: pixLoading } = useQuery({
    queryKey: ['admin-financial-pix-payments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pix_payments')
        .select('*')
        .order('created_at', { ascending: true });
      return (data || []) as PixPayment[];
    },
  });

  // Calculate PIX metrics
  const pixMetrics = {
    total: pixPayments?.length || 0,
    pending: pixPayments?.filter(p => p.status === 'pending').length || 0,
    confirmed: pixPayments?.filter(p => p.status === 'confirmed').length || 0,
    rejected: pixPayments?.filter(p => p.status === 'rejected').length || 0,
    totalAmount: pixPayments?.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0) || 0,
    pendingAmount: pixPayments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0,
    avgTicket: pixPayments?.filter(p => p.status === 'confirmed').length 
      ? (pixPayments.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0) / pixPayments.filter(p => p.status === 'confirmed').length)
      : 0,
    conversionRate: pixPayments?.length 
      ? ((pixPayments.filter(p => p.status === 'confirmed').length / pixPayments.length) * 100)
      : 0,
  };

  // PIX payments by day (last 30 days)
  const pixByDay = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date()
  }).map(date => {
    const dayPayments = pixPayments?.filter(p => {
      const paymentDate = parseISO(p.created_at);
      return format(paymentDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    }) || [];

    return {
      date: format(date, 'dd/MM', { locale: ptBR }),
      total: dayPayments.length,
      confirmed: dayPayments.filter(p => p.status === 'confirmed').length,
      pending: dayPayments.filter(p => p.status === 'pending').length,
      rejected: dayPayments.filter(p => p.status === 'rejected').length,
      amount: dayPayments.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0),
    };
  });

  // PIX payments by month (last 6 months)
  const pixByMonth = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  }).map(date => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const monthPayments = pixPayments?.filter(p => {
      const paymentDate = parseISO(p.created_at);
      return isWithinInterval(paymentDate, { start: monthStart, end: monthEnd });
    }) || [];

    return {
      month: format(date, 'MMM', { locale: ptBR }),
      fullMonth: format(date, 'MMMM yyyy', { locale: ptBR }),
      total: monthPayments.length,
      confirmed: monthPayments.filter(p => p.status === 'confirmed').length,
      pending: monthPayments.filter(p => p.status === 'pending').length,
      rejected: monthPayments.filter(p => p.status === 'rejected').length,
      amount: monthPayments.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0),
    };
  });

  // PIX by plan type
  const pixByPlan = [
    { 
      name: 'Pro Mensal', 
      value: pixPayments?.filter(p => p.plan === 'pro' && p.interval === 'monthly' && p.status === 'confirmed').length || 0,
      amount: pixPayments?.filter(p => p.plan === 'pro' && p.interval === 'monthly' && p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0) || 0,
    },
    { 
      name: 'Pro Anual', 
      value: pixPayments?.filter(p => p.plan === 'pro' && p.interval === 'yearly' && p.status === 'confirmed').length || 0,
      amount: pixPayments?.filter(p => p.plan === 'pro' && p.interval === 'yearly' && p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0) || 0,
    },
    { 
      name: 'Família Mensal', 
      value: pixPayments?.filter(p => p.plan === 'family' && p.interval === 'monthly' && p.status === 'confirmed').length || 0,
      amount: pixPayments?.filter(p => p.plan === 'family' && p.interval === 'monthly' && p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0) || 0,
    },
    { 
      name: 'Família Anual', 
      value: pixPayments?.filter(p => p.plan === 'family' && p.interval === 'yearly' && p.status === 'confirmed').length || 0,
      amount: pixPayments?.filter(p => p.plan === 'family' && p.interval === 'yearly' && p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0) || 0,
    },
  ];

  const PIX_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-5))', 'hsl(var(--chart-4))'];

  // Calculate MRR for a specific month end date (exclui grace licenses)
  const calculateMrrAtDate = (monthEndDate: Date) => {
    const proCount = subscriptions?.filter(s => {
      const createdAt = parseISO(s.created_at);
      return s.plan === 'pro' && !s.is_grace_license && createdAt <= monthEndDate;
    }).length || 0;
    
    const familyCount = subscriptions?.filter(s => {
      const createdAt = parseISO(s.created_at);
      return s.plan === 'family' && !s.is_grace_license && createdAt <= monthEndDate;
    }).length || 0;
    
    return (proCount * PLAN_PRICES.pro) + (familyCount * PLAN_PRICES.family);
  };

  // Calculate current and previous month MRR for variation
  const currentMonthEnd = endOfMonth(new Date());
  const previousMonthEnd = endOfMonth(subMonths(new Date(), 1));
  const currentMrr = calculateMrrAtDate(currentMonthEnd);
  const previousMrr = calculateMrrAtDate(previousMonthEnd);
  const mrrChange = previousMrr > 0 ? ((currentMrr - previousMrr) / previousMrr) * 100 : 0;

  // Calculate churn rate based on subscriptions that went from paid to free
  const calculateChurnRate = () => {
    const lastMonth = subMonths(new Date(), 1);
    const monthStart = startOfMonth(lastMonth);
    const monthEnd = endOfMonth(lastMonth);
    
    // Count paid subscribers at start of last month (exclui grace licenses)
    const paidAtStart = subscriptions?.filter(s => {
      const createdAt = parseISO(s.created_at);
      return s.plan !== 'free' && !s.is_grace_license && createdAt <= monthStart;
    }).length || 0;
    
    // Count subscriptions that were downgraded (now free but created before month end)
    // Since we don't have a downgrade date, we estimate based on current free users who were created before
    const churnedUsers = subscriptions?.filter(s => {
      const createdAt = parseISO(s.created_at);
      return s.plan === 'free' && createdAt <= monthEnd && createdAt >= monthStart;
    }).length || 0;
    
    return paidAtStart > 0 ? (churnedUsers / paidAtStart) * 100 : 0;
  };

  const churnRate = calculateChurnRate();

  // Calculate total revenue combining PIX and subscriptions
  const totalPixRevenue = pixPayments?.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalSubscriptionRevenue = currentMrr;
  const totalRevenue = totalPixRevenue + totalSubscriptionRevenue;

  // Calculate metrics
  const metrics = {
    totalSubscribers: subscriptions?.length || 0,
    paidSubscribers: subscriptions?.filter(s => s.plan !== 'free' && !s.is_grace_license).length || 0,
    freeSubscribers: subscriptions?.filter(s => s.plan === 'free').length || 0,
    graceSubscribers: subscriptions?.filter(s => s.is_grace_license).length || 0,
    proSubscribers: subscriptions?.filter(s => s.plan === 'pro' && !s.is_grace_license).length || 0,
    familySubscribers: subscriptions?.filter(s => s.plan === 'family' && !s.is_grace_license).length || 0,
    
    mrr: currentMrr,
    mrrChange: mrrChange,
    churnRate: churnRate,
    totalRevenue: totalRevenue,
    
    arr: currentMrr * 12,
    
    conversionRate: subscriptions?.length ? 
      ((subscriptions.filter(s => s.plan !== 'free' && !s.is_grace_license).length / subscriptions.length) * 100).toFixed(1) : '0',
    
    arpu: subscriptions?.filter(s => s.plan !== 'free' && !s.is_grace_license).length ? 
      ((subscriptions.filter(s => s.plan === 'pro' && !s.is_grace_license).length * PLAN_PRICES.pro +
        subscriptions.filter(s => s.plan === 'family' && !s.is_grace_license).length * PLAN_PRICES.family) / 
        subscriptions.filter(s => s.plan !== 'free' && !s.is_grace_license).length).toFixed(2) : '0',
  };

  // MRR by month (real data based on subscription creation dates)
  const mrrByMonth = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  }).map((date) => {
    const monthEnd = endOfMonth(date);
    const monthMrr = calculateMrrAtDate(monthEnd);
    
    return {
      month: format(date, 'MMM', { locale: ptBR }),
      mrr: Math.round(monthMrr * 100) / 100,
    };
  });

  // Combined revenue by month (PIX + Subscriptions)
  const combinedRevenueByMonth = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  }).map((date) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    // PIX revenue for this month
    const monthPixRevenue = pixPayments?.filter(p => {
      if (p.status !== 'confirmed' || !p.confirmed_at) return false;
      const confirmedAt = parseISO(p.confirmed_at);
      return isWithinInterval(confirmedAt, { start: monthStart, end: monthEnd });
    }).reduce((sum, p) => sum + p.amount, 0) || 0;
    
    // Subscription MRR for this month
    const monthMrr = calculateMrrAtDate(monthEnd);
    
    return {
      month: format(date, 'MMM', { locale: ptBR }),
      pix: Math.round(monthPixRevenue * 100) / 100,
      subscriptions: Math.round(monthMrr * 100) / 100,
      total: Math.round((monthPixRevenue + monthMrr) * 100) / 100,
    };
  });

  // Churn history by month (last 6 months)
  const churnHistoryByMonth = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  }).map((date) => {
    const monthStart = startOfMonth(date);
    const prevMonthStart = startOfMonth(subMonths(date, 1));
    
    // Paid subscribers at start of previous month
    const paidAtPrevMonth = subscriptions?.filter(s => {
      const createdAt = parseISO(s.created_at);
      return s.plan !== 'free' && !s.is_grace_license && createdAt <= prevMonthStart;
    }).length || 0;
    
    // Users who became free this month (approximate churn)
    const churnedThisMonth = subscriptions?.filter(s => {
      const createdAt = parseISO(s.created_at);
      return s.plan === 'free' && createdAt <= monthStart && createdAt > prevMonthStart;
    }).length || 0;
    
    const churnRate = paidAtPrevMonth > 0 ? (churnedThisMonth / paidAtPrevMonth) * 100 : 0;
    
    return {
      month: format(date, 'MMM', { locale: ptBR }),
      churn: Math.round(churnRate * 10) / 10,
      churned: churnedThisMonth,
    };
  });

  // Revenue forecast for next 3 months based on MRR trend
  const calculateRevenueForecast = () => {
    if (mrrByMonth.length < 2) return [];
    
    // Calculate average monthly growth rate from last 3 months
    const recentMonths = mrrByMonth.slice(-3);
    let totalGrowthRate = 0;
    let validGrowths = 0;
    
    for (let i = 1; i < recentMonths.length; i++) {
      if (recentMonths[i - 1].mrr > 0) {
        const growthRate = (recentMonths[i].mrr - recentMonths[i - 1].mrr) / recentMonths[i - 1].mrr;
        totalGrowthRate += growthRate;
        validGrowths++;
      }
    }
    
    const avgGrowthRate = validGrowths > 0 ? totalGrowthRate / validGrowths : 0;
    const currentMrrValue = mrrByMonth[mrrByMonth.length - 1]?.mrr || 0;
    
    // Project next 3 months
    const forecast = [];
    let projectedMrr = currentMrrValue;
    
    for (let i = 1; i <= 3; i++) {
      const futureDate = subMonths(new Date(), -i);
      projectedMrr = projectedMrr * (1 + avgGrowthRate);
      
      forecast.push({
        month: format(futureDate, 'MMM', { locale: ptBR }),
        mrr: Math.round(projectedMrr * 100) / 100,
        isProjection: true,
      });
    }
    
    return forecast;
  };

  const revenueForecast = calculateRevenueForecast();
  const mrrWithForecast = [
    ...mrrByMonth.map(m => ({ ...m, isProjection: false })),
    ...revenueForecast,
  ];

  // Calculate LTV (Lifetime Value)
  const calculateLTV = () => {
    const arpu = parseFloat(metrics.arpu) || 0;
    const monthlyChurnRate = metrics.churnRate / 100;
    
    // LTV = ARPU / Churn Rate (for monthly)
    // If churn is 0, use average subscription length estimate
    if (monthlyChurnRate <= 0) {
      // Assume average customer stays 24 months if no churn
      return arpu * 24;
    }
    
    // Average customer lifetime in months = 1 / churn rate
    const avgLifetimeMonths = 1 / monthlyChurnRate;
    return arpu * avgLifetimeMonths;
  };

  const ltv = calculateLTV();
  const avgLifetimeMonths = metrics.churnRate > 0 ? Math.round(1 / (metrics.churnRate / 100)) : 24;

  // Plan distribution for pie chart
  const planDistribution = [
    { name: 'Gratuito', value: metrics.freeSubscribers, color: COLORS[0] },
    { name: 'Pro', value: metrics.proSubscribers, color: COLORS[1] },
    { name: 'Família', value: metrics.familySubscribers, color: COLORS[2] },
  ];

  // Revenue breakdown
  const revenueBreakdown = [
    { 
      name: 'Pro', 
      revenue: metrics.proSubscribers * PLAN_PRICES.pro,
      subscribers: metrics.proSubscribers,
      percentage: metrics.mrr > 0 ? ((metrics.proSubscribers * PLAN_PRICES.pro / metrics.mrr) * 100).toFixed(0) : '0'
    },
    { 
      name: 'Família', 
      revenue: metrics.familySubscribers * PLAN_PRICES.family,
      subscribers: metrics.familySubscribers,
      percentage: metrics.mrr > 0 ? ((metrics.familySubscribers * PLAN_PRICES.family / metrics.mrr) * 100).toFixed(0) : '0'
    },
  ];

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const content = (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold">Dashboard Financeiro</h1>
        <p className="text-sm text-muted-foreground">Métricas detalhadas de receita e assinaturas</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/30">
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 md:gap-2">
                <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                <span className="hidden sm:inline">MRR</span>
                <span className="sm:hidden">MRR</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {subsLoading ? (
                <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
              ) : (
                <>
                  <div className="text-lg md:text-2xl font-bold text-green-500">
                    {formatCurrency(metrics.mrr)}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    {metrics.mrrChange >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <span className={metrics.mrrChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {metrics.mrrChange >= 0 ? '+' : ''}{metrics.mrrChange.toFixed(1)}%
                    </span>
                    <span className="hidden sm:inline">vs mês anterior</span>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30">
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 md:gap-2">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                <span className="hidden sm:inline">ARR</span>
                <span className="sm:hidden">ARR</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {subsLoading ? (
                <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
              ) : (
                <>
                  <div className="text-lg md:text-2xl font-bold text-blue-500">
                    {formatCurrency(metrics.arr)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.paidSubscribers} pagos
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/30">
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 md:gap-2">
                <QrCode className="h-3 w-3 md:h-4 md:w-4 text-cyan-500" />
                <span>PIX</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {pixLoading ? (
                <Skeleton className="h-6 md:h-8 w-16 md:w-20" />
              ) : (
                <>
                  <div className="text-lg md:text-2xl font-bold text-cyan-500">
                    {formatCurrency(pixMetrics.totalAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pixMetrics.confirmed} confirmados
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/30">
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 md:gap-2">
                <Percent className="h-3 w-3 md:h-4 md:w-4 text-purple-500" />
                <span className="hidden sm:inline">Conversão</span>
                <span className="sm:hidden">Conv.</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {subsLoading ? (
                <Skeleton className="h-6 md:h-8 w-14 md:w-16" />
              ) : (
                <>
                  <div className="text-lg md:text-2xl font-bold text-purple-500">
                    {metrics.conversionRate}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.paidSubscribers}/{metrics.totalSubscribers}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/30">
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 md:gap-2">
                <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                <span>Churn</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {subsLoading ? (
                <Skeleton className="h-6 md:h-8 w-14 md:w-16" />
              ) : (
                <>
                  <div className="text-lg md:text-2xl font-bold text-red-500">
                    {metrics.churnRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Taxa mensal
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/30">
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 md:gap-2">
                <PiggyBank className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
                ARPU
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {subsLoading ? (
                <Skeleton className="h-6 md:h-8 w-16 md:w-20" />
              ) : (
                <>
                  <div className="text-lg md:text-2xl font-bold text-orange-500">
                    {formatCurrency(parseFloat(metrics.arpu))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    /mês
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/30">
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 md:gap-2">
                <Target className="h-3 w-3 md:h-4 md:w-4 text-emerald-500" />
                LTV
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {subsLoading ? (
                <Skeleton className="h-6 md:h-8 w-16 md:w-20" />
              ) : (
                <>
                  <div className="text-lg md:text-2xl font-bold text-emerald-500">
                    {formatCurrency(ltv)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{avgLifetimeMonths} meses
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* Combined Revenue Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="p-3 md:p-6 pb-2">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                Receita Total Combinada
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">PIX confirmados + Assinaturas recorrentes (últimos 6 meses)</CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {(subsLoading || pixLoading) ? (
                <Skeleton className="h-[180px] md:h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                  <ComposedChart data={combinedRevenueByMonth}>
                    <defs>
                      <linearGradient id="pixGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2}/>
                      </linearGradient>
                      <linearGradient id="subsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <YAxis 
                      tick={{ fontSize: isMobile ? 10 : 12 }} 
                      tickFormatter={(value) => `R$${value}`}
                      width={isMobile ? 50 : 60}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value), 
                        name === 'pix' ? 'PIX' : name === 'subscriptions' ? 'Assinaturas' : 'Total'
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: isMobile ? 12 : 14,
                      }}
                    />
                    <Legend 
                      formatter={(value) => value === 'pix' ? 'PIX' : value === 'subscriptions' ? 'Assinaturas' : 'Total'}
                    />
                    <Bar dataKey="pix" stackId="a" fill="url(#pixGradient)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="subscriptions" stackId="a" fill="url(#subsGradient)" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded" style={{ background: 'hsl(var(--chart-2))' }} />
                  <span className="text-xs md:text-sm">PIX ({formatCurrency(pixMetrics.totalAmount)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded" style={{ background: 'hsl(var(--primary))' }} />
                  <span className="text-xs md:text-sm">Assinaturas ({formatCurrency(metrics.mrr)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded" style={{ background: 'hsl(var(--chart-5))' }} />
                  <span className="text-xs md:text-sm">Total ({formatCurrency(metrics.totalRevenue)})</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* MRR Evolution */}
          <Card>
            <CardHeader className="p-3 md:p-6 pb-2">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                Evolução do MRR
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Receita mensal recorrente nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {subsLoading ? (
                <Skeleton className="h-[180px] md:h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={isMobile ? 180 : 260}>
                  <AreaChart data={mrrByMonth}>
                    <defs>
                      <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <YAxis 
                      tick={{ fontSize: isMobile ? 10 : 12 }} 
                      tickFormatter={(value) => `R$${value}`}
                      width={isMobile ? 50 : 60}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'MRR']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: isMobile ? 12 : 14,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mrr"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#mrrGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Plan Distribution */}
          <Card>
            <CardHeader className="p-3 md:p-6 pb-2">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 md:h-5 md:w-5" />
                Distribuição de Planos
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Assinantes por tipo de plano</CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {subsLoading ? (
                <Skeleton className="h-[180px] md:h-64 w-full" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 40 : 60}
                        outerRadius={isMobile ? 60 : 80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 md:gap-6 mt-2 md:mt-4">
                    {planDistribution.map((plan, index) => (
                      <div key={plan.name} className="flex items-center gap-1.5 md:gap-2">
                        <div 
                          className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full" 
                          style={{ backgroundColor: plan.color }}
                        />
                        <span className="text-xs md:text-sm">{plan.name} ({plan.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
              Breakdown de Receita por Plano
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Contribuição de cada plano para a receita total</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="grid gap-3 md:gap-4 md:grid-cols-2">
              {revenueBreakdown.map((plan) => (
                <div key={plan.name} className="p-3 md:p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {plan.name === 'Pro' ? (
                        <Badge className="bg-primary text-primary-foreground text-xs">Pro</Badge>
                      ) : (
                        <Badge className="bg-chart-5 text-white text-xs">Família</Badge>
                      )}
                      <span className="text-xs md:text-sm text-muted-foreground">
                        {plan.subscribers} assinantes
                      </span>
                    </div>
                    <span className="text-xs md:text-sm font-medium">{plan.percentage}%</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${plan.name === 'Pro' ? 'bg-primary' : 'bg-chart-5'}`}
                        style={{ width: `${plan.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg md:text-2xl font-bold">
                        {formatCurrency(plan.revenue)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(plan.name === 'Pro' ? PLAN_PRICES.pro : PLAN_PRICES.family)}/usuário
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Churn History & Forecast Charts */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* Churn History Chart */}
          <Card>
            <CardHeader className="p-3 md:p-6 pb-2">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
                Histórico de Churn
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Taxa de cancelamento mensal (últimos 6 meses)</CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {subsLoading ? (
                <Skeleton className="h-[180px] md:h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
                  <LineChart data={churnHistoryByMonth}>
                    <defs>
                      <linearGradient id="churnGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <YAxis 
                      tick={{ fontSize: isMobile ? 10 : 12 }} 
                      tickFormatter={(value) => `${value}%`}
                      width={isMobile ? 40 : 50}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'churn' ? `${value}%` : value,
                        name === 'churn' ? 'Taxa de Churn' : 'Cancelados'
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: isMobile ? 12 : 14,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="churn"
                      stroke="hsl(0, 84%, 60%)"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(0, 84%, 60%)', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Revenue Forecast Chart */}
          <Card>
            <CardHeader className="p-3 md:p-6 pb-2">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                Previsão de Receita
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">MRR atual + projeção para próximos 3 meses</CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {subsLoading ? (
                <Skeleton className="h-[180px] md:h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
                  <AreaChart data={mrrWithForecast}>
                    <defs>
                      <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <YAxis 
                      tick={{ fontSize: isMobile ? 10 : 12 }} 
                      tickFormatter={(value) => `R$${value}`}
                      width={isMobile ? 50 : 60}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string, props: { payload?: { isProjection?: boolean } }) => [
                        formatCurrency(value),
                        props.payload?.isProjection ? 'MRR (Projeção)' : 'MRR (Real)'
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: isMobile ? 12 : 14,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mrr"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#forecastGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              <div className="flex flex-wrap justify-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-6 bg-primary" />
                  <span className="text-xs">Histórico</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-6 bg-primary" style={{ borderStyle: 'dashed', borderWidth: '1px', borderColor: 'hsl(var(--primary))' }} />
                  <span className="text-xs">Projeção</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LTV & Metrics Summary */}
        <div className="grid gap-3 md:gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                <Target className="h-3 w-3 md:h-4 md:w-4" />
                LTV Médio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold text-emerald-500">
                {formatCurrency(ltv)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tempo médio: ~{avgLifetimeMonths} meses
              </p>
              <p className="text-xs text-muted-foreground">
                ARPU × Lifetime
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                LTV:CAC Ratio
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold text-blue-500">
                {ltv > 0 ? `${(ltv / 50).toFixed(1)}:1` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                CAC estimado: R$ 50
              </p>
              <p className="text-xs text-green-500">
                {ltv / 50 >= 3 ? '✓ Saudável (≥3:1)' : '⚠ Abaixo do ideal'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                Previsão 3 Meses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold text-green-500">
                {formatCurrency(revenueForecast[2]?.mrr || metrics.mrr)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                MRR projetado
              </p>
              <div className="flex items-center gap-1 text-xs text-green-500">
                <ArrowUpRight className="h-3 w-3" />
                <span>+{formatCurrency((revenueForecast[2]?.mrr || metrics.mrr) - metrics.mrr)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                Receita Anual Projetada
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold text-primary">
                {formatCurrency((revenueForecast[2]?.mrr || metrics.mrr) * 12)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado na projeção de MRR
              </p>
            </CardContent>
          </Card>
        </div>

        {/* PIX Payments Section */}
        <div className="pt-4 md:pt-6 border-t">
          <div className="mb-4 md:mb-6">
            <h2 className="text-lg md:text-2xl font-bold flex items-center gap-2 md:gap-3">
              <QrCode className="h-5 w-5 md:h-7 md:w-7 text-primary" />
              Métricas de Pagamentos PIX
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">Análise detalhada de receita via PIX</p>
          </div>

          {/* PIX Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/30">
              <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1 md:gap-2">
                  <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                  <span className="hidden sm:inline">Receita Confirmada</span>
                  <span className="sm:hidden">Confirmado</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {pixLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <>
                    <div className="text-base md:text-2xl font-bold text-green-500 truncate">
                      {formatCurrency(pixMetrics.totalAmount)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pixMetrics.confirmed} pgto{pixMetrics.confirmed !== 1 ? 's' : ''}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/30">
              <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1 md:gap-2">
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-amber-500" />
                  <span className="hidden sm:inline">Pendente de Aprovação</span>
                  <span className="sm:hidden">Pendente</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {pixLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <>
                    <div className="text-base md:text-2xl font-bold text-amber-500 truncate">
                      {formatCurrency(pixMetrics.pendingAmount)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pixMetrics.pending} aguardando
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/30">
              <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1 md:gap-2">
                  <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                  <span className="hidden sm:inline">Ticket Médio</span>
                  <span className="sm:hidden">Ticket</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {pixLoading ? (
                  <Skeleton className="h-6 md:h-8 w-20 md:w-24" />
                ) : (
                  <>
                    <div className="text-base md:text-2xl font-bold text-blue-500 truncate">
                      {formatCurrency(pixMetrics.avgTicket)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                      Por pagamento confirmado
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/30">
              <CardHeader className="p-3 md:p-6 pb-1 md:pb-2">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1 md:gap-2">
                  <Percent className="h-3 w-3 md:h-4 md:w-4 text-purple-500" />
                  <span className="hidden sm:inline">Taxa de Aprovação</span>
                  <span className="sm:hidden">Aprovação</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {pixLoading ? (
                  <Skeleton className="h-6 md:h-8 w-14 md:w-16" />
                ) : (
                  <>
                    <div className="text-base md:text-2xl font-bold text-purple-500">
                      {pixMetrics.conversionRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pixMetrics.confirmed}/{pixMetrics.total}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* PIX Charts */}
          <Tabs defaultValue="monthly" className="space-y-4 md:space-y-6">
            <TabsList className="w-full grid grid-cols-3 md:w-auto md:inline-flex">
              <TabsTrigger value="monthly" className="text-xs md:text-sm">Mensal</TabsTrigger>
              <TabsTrigger value="daily" className="text-xs md:text-sm">
                <span className="hidden sm:inline">Diário (30 dias)</span>
                <span className="sm:hidden">Diário</span>
              </TabsTrigger>
              <TabsTrigger value="breakdown" className="text-xs md:text-sm">Por Plano</TabsTrigger>
            </TabsList>

            <TabsContent value="monthly" className="space-y-4 md:space-y-6">
              <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                {/* Monthly Revenue Chart */}
                <Card>
                  <CardHeader className="p-3 md:p-6 pb-2">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                      Receita PIX Mensal
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Evolução da receita PIX nos últimos 6 meses</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0">
                    {pixLoading ? (
                      <Skeleton className="h-[180px] md:h-64 w-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height={isMobile ? 180 : 280}>
                        <AreaChart data={pixByMonth}>
                          <defs>
                            <linearGradient id="pixAmountGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
                          <YAxis 
                            tick={{ fontSize: isMobile ? 10 : 12 }} 
                            tickFormatter={(value) => `R$${value}`}
                            width={isMobile ? 50 : 60}
                          />
                          <Tooltip 
                            formatter={(value: number) => [formatCurrency(value), 'Receita']}
                            labelFormatter={(label) => pixByMonth.find(m => m.month === label)?.fullMonth || label}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: isMobile ? 12 : 14,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="hsl(var(--chart-2))"
                            fillOpacity={1}
                            fill="url(#pixAmountGradient)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Monthly Count Chart */}
                <Card>
                  <CardHeader className="p-3 md:p-6 pb-2">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                      Pagamentos por Mês
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Quantidade de pagamentos por status</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0">
                    {pixLoading ? (
                      <Skeleton className="h-[180px] md:h-64 w-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height={isMobile ? 180 : 280}>
                        <BarChart data={pixByMonth}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
                          <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: isMobile ? 12 : 14,
                            }}
                          />
                          {!isMobile && <Legend />}
                          <Bar dataKey="confirmed" name="Confirmados" fill="hsl(142, 76%, 36%)" stackId="a" />
                          <Bar dataKey="pending" name="Pendentes" fill="hsl(38, 92%, 50%)" stackId="a" />
                          <Bar dataKey="rejected" name="Rejeitados" fill="hsl(0, 84%, 60%)" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="daily" className="space-y-4 md:space-y-6">
              <Card>
                <CardHeader className="p-3 md:p-6 pb-2">
                  <CardTitle className="text-sm md:text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                    Pagamentos PIX - Últimos 30 Dias
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm">Evolução diária de pagamentos e receita</CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0">
                  {pixLoading ? (
                    <Skeleton className="h-[200px] md:h-80 w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={isMobile ? 200 : 320}>
                      <ComposedChart data={pixByDay}>
                        <defs>
                          <linearGradient id="dailyAmountGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: isMobile ? 8 : 10 }} 
                          interval={isMobile ? 4 : 2}
                        />
                        <YAxis 
                          yAxisId="left"
                          tick={{ fontSize: isMobile ? 10 : 12 }} 
                          tickFormatter={(value) => `R$${value}`}
                          width={isMobile ? 45 : 60}
                        />
                        {!isMobile && (
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 12 }} 
                          />
                        )}
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            if (name === 'Receita') return [formatCurrency(value), name];
                            return [value, name];
                          }}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: isMobile ? 12 : 14,
                          }}
                        />
                        {!isMobile && <Legend />}
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="amount"
                          name="Receita"
                          stroke="hsl(var(--primary))"
                          fillOpacity={1}
                          fill="url(#dailyAmountGradient)"
                          strokeWidth={2}
                        />
                        <Bar 
                          yAxisId={isMobile ? "left" : "right"}
                          dataKey="confirmed" 
                          name="Confirmados" 
                          fill="hsl(142, 76%, 36%)" 
                        />
                        <Bar 
                          yAxisId={isMobile ? "left" : "right"}
                          dataKey="pending" 
                          name="Pendentes" 
                          fill="hsl(38, 92%, 50%)" 
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-4 md:space-y-6">
              <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                {/* Pie Chart by Plan */}
                <Card>
                  <CardHeader className="p-3 md:p-6 pb-2">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4 md:h-5 md:w-5" />
                      Distribuição por Plano
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Pagamentos confirmados por tipo de plano</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0">
                    {pixLoading ? (
                      <Skeleton className="h-[180px] md:h-64 w-full" />
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={isMobile ? 160 : 220}>
                          <PieChart>
                            <Pie
                              data={pixByPlan.filter(p => p.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={isMobile ? 35 : 50}
                              outerRadius={isMobile ? 55 : 80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {pixByPlan.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIX_COLORS[index % PIX_COLORS.length]} />
                              ))}
                            </Pie>
                              <Tooltip 
                              formatter={(value: number, name: string, props: { payload?: { name?: string } }) => {
                                const plan = pixByPlan.find(p => p.value === value);
                                return [`${value} pgto${value !== 1 ? 's' : ''} (${formatCurrency(plan?.amount || 0)})`, props.payload?.name];
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-2 mt-2 md:mt-4">
                          {pixByPlan.map((plan, index) => (
                            <div key={plan.name} className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                              <div 
                                className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full shrink-0" 
                                style={{ backgroundColor: PIX_COLORS[index % PIX_COLORS.length] }}
                              />
                              <span className="truncate">{plan.name}</span>
                              <span className="text-muted-foreground ml-auto">({plan.value})</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Revenue by Plan */}
                <Card>
                  <CardHeader className="p-3 md:p-6 pb-2">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4 md:h-5 md:w-5" />
                      Receita por Plano
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">Valor total recebido por tipo de plano</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0">
                    {pixLoading ? (
                      <Skeleton className="h-[180px] md:h-64 w-full" />
                    ) : (
                      <div className="space-y-3 md:space-y-4">
                        {pixByPlan.map((plan, index) => {
                          const percentage = pixMetrics.totalAmount > 0 
                            ? (plan.amount / pixMetrics.totalAmount) * 100 
                            : 0;
                          return (
                            <div key={plan.name} className="space-y-1.5 md:space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 md:gap-2">
                                  <div 
                                    className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full" 
                                    style={{ backgroundColor: PIX_COLORS[index % PIX_COLORS.length] }}
                                  />
                                  <span className="text-xs md:text-sm font-medium">{plan.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {plan.value} pgto{plan.value !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 md:gap-3">
                                <div className="flex-1 h-1.5 md:h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all"
                                    style={{ 
                                      width: `${percentage}%`,
                                      backgroundColor: PIX_COLORS[index % PIX_COLORS.length]
                                    }}
                                  />
                                </div>
                                <span className="text-xs md:text-sm font-medium w-16 md:w-20 text-right">
                                  {formatCurrency(plan.amount)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        
                        <div className="pt-3 md:pt-4 border-t mt-3 md:mt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm md:text-base font-bold">Total</span>
                            <span className="text-base md:text-xl font-bold text-primary">
                              {formatCurrency(pixMetrics.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
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
