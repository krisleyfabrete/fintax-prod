import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { toast } from 'sonner';
import { 
  CreditCard, 
  DollarSign, 
  Search, 
  Edit, 
  Users,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  Crown,
  Home,
  Download,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

type SubscriptionPlan = 'free' | 'pro' | 'family';

interface SubscriptionWithProfile {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  is_grace_license: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string | null;
  } | null;
  user_email?: string;
}

const PLAN_PRICES = {
  free: 0,
  pro: 29.9,
  family: 49.9,
};

const PLAN_LABELS = {
  free: 'Gratuito',
  pro: 'Pro',
  family: 'Família',
};

export default function AdminSubscriptions() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionWithProfile | null>(null);
  const [newPlan, setNewPlan] = useState<SubscriptionPlan>('free');
  const [graceChecked, setGraceChecked] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await refetch();
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-subscriptions', search, planFilter],
    queryFn: async () => {
      // First get subscriptions
      let query = supabase
        .from('subscriptions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (planFilter !== 'all') {
        query = query.eq('plan', planFilter as SubscriptionPlan);
      }

      const { data: subscriptions, error } = await query;
      
      if (error) throw error;
      
      // Get profiles for each subscription
      const subsWithProfiles: SubscriptionWithProfile[] = await Promise.all(
        (subscriptions || []).map(async (sub) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', sub.user_id)
            .maybeSingle();

          let userEmail = '';
          try {
            const { data: emailData } = await supabase.functions.invoke('get-user-email', {
              body: { userId: sub.user_id },
            });
            userEmail = emailData?.email || '';
          } catch {
            // Ignora falha na busca de email
          }

          return {
            ...sub,
            profiles: profile || null,
            user_email: userEmail
          };
        })
      );

      // Filter by search
      if (search) {
        return subsWithProfiles.filter((sub) => 
          sub.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
        );
      }

      return subsWithProfiles;
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ subscriptionId, plan, isGrace, userId }: { subscriptionId: string; plan: SubscriptionPlan; isGrace: boolean; userId: string }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          plan,
          is_grace_license: isGrace,
          updated_at: new Date().toISOString(),
          ...(plan === 'free' && !isGrace ? { 
            current_period_start: null,
            current_period_end: null 
          } : {})
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_action: 'update_subscription_plan',
        p_target_type: 'subscription',
        p_target_id: subscriptionId,
        p_details: { 
          user_id: userId,
          new_plan: plan,
          is_grace_license: isGrace
        }
      });
    },
    onSuccess: () => {
      toast.success('Plano atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      setEditingSubscription(null);
    },
    onError: (error) => {
      toast.error('Erro ao atualizar plano: ' + error.message);
    }
  });

  const stats = {
  total: data?.length || 0,
  free: data?.filter((s) => s.plan === 'free' && !s.is_grace_license).length || 0,
  pro: data?.filter((s) => s.plan === 'pro' && !s.is_grace_license).length || 0,
  family: data?.filter((s) => s.plan === 'family' && !s.is_grace_license).length || 0,
  gracie: data?.filter((s) => s.is_grace_license).length || 0,
  mrr: (data?.filter((s) => s.plan === 'pro' && !s.is_grace_license).length || 0) * PLAN_PRICES.pro +
       (data?.filter((s) => s.plan === 'family' && !s.is_grace_license).length || 0) * PLAN_PRICES.family,
  conversionRate: data?.filter((s) => !s.is_grace_license).length ?
    ((data.filter((s) => s.plan !== 'free' && !s.is_grace_license).length / data.filter((s) => !s.is_grace_license).length) * 100).toFixed(1) : '0',
};

  const getPlanBadge = (plan: SubscriptionPlan) => {
    switch (plan) {
      case 'pro':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Crown className="h-3 w-3 mr-1 text-yellow-500" />Pro</Badge>;
      case 'family':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/30"><Users className="h-3 w-3 mr-1" />Família</Badge>;
      default:
        return <Badge variant="secondary"><Crown className="h-3 w-3 mr-1 text-muted-foreground" />Gratuito</Badge>;
    }
  };

  const handleEditPlan = (subscription: SubscriptionWithProfile) => {
    setEditingSubscription(subscription);
    setNewPlan(subscription.plan);
    setGraceChecked(subscription.is_grace_license ?? false);
  };

  const handleSavePlan = () => {
    if (!editingSubscription) return;
    updatePlanMutation.mutate({
      subscriptionId: editingSubscription.id,
      plan: newPlan,
      isGrace: graceChecked,
      userId: editingSubscription.user_id
    });
  };

  // Export functions
  const exportToCSV = () => {
    if (!data || data.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = ['Nome', 'Plano', 'Período Fim', 'Atualizado Em'];
    const rows = data.map(sub => [
      sub.profiles?.full_name || 'Sem nome',
      PLAN_LABELS[sub.plan],
      sub.current_period_end ? format(new Date(sub.current_period_end), 'dd/MM/yyyy') : '-',
      format(new Date(sub.updated_at), 'dd/MM/yyyy HH:mm')
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assinaturas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso!');
  };

  const exportToExcel = () => {
    if (!data || data.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    // Create Excel-compatible XML
    const headers = ['Nome', 'Plano', 'Preço', 'Período Fim', 'Atualizado Em'];
    const rows = data.map(sub => [
      sub.profiles?.full_name || 'Sem nome',
      PLAN_LABELS[sub.plan],
      `R$ ${PLAN_PRICES[sub.plan].toFixed(2).replace('.', ',')}`,
      sub.current_period_end ? format(new Date(sub.current_period_end), 'dd/MM/yyyy') : '-',
      format(new Date(sub.updated_at), 'dd/MM/yyyy HH:mm')
    ]);

    const excelContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Assinaturas">
    <Table>
      <Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
      ${rows.map(row => `<Row>${row.map(cell => `<Cell><Data ss:Type="String">${cell}</Data></Cell>`).join('')}</Row>`).join('\n')}
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assinaturas_${format(new Date(), 'yyyy-MM-dd')}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Excel exportado com sucesso!');
  };

  const exportToPDF = () => {
    if (!data || data.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Relatório de Assinaturas', 14, 22);
    
    // Date
    doc.setFontSize(10);
    doc.setTextColor(128);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 30);
    
    // Summary
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text('Resumo:', 14, 42);
    doc.setFontSize(10);
    doc.text(`Total de Assinaturas: ${stats.total}`, 14, 50);
    doc.text(`Plano Free: ${stats.free}`, 14, 56);
    doc.text(`Plano Pro: ${stats.pro}`, 14, 62);
    doc.text(`Plano Família: ${stats.family}`, 14, 68);
    doc.text(`MRR: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.mrr)}`, 14, 74);
    doc.text(`Taxa de Conversão: ${stats.conversionRate}%`, 14, 80);

    // Table
    const tableData = data.map(sub => [
      sub.profiles?.full_name || 'Sem nome',
      PLAN_LABELS[sub.plan],
      `R$ ${PLAN_PRICES[sub.plan].toFixed(2).replace('.', ',')}`,
      sub.current_period_end ? format(new Date(sub.current_period_end), 'dd/MM/yyyy') : '-',
      format(new Date(sub.updated_at), 'dd/MM/yyyy')
    ]);

    autoTable(doc, {
      startY: 90,
      head: [['Nome', 'Plano', 'Preço', 'Período Fim', 'Atualizado']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [124, 58, 237] },
      styles: { fontSize: 9 }
    });

    doc.save(`assinaturas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  const content = (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl lg:text-3xl font-bold">Gerenciamento de Planos</h1>
            <p className="text-sm lg:text-base text-muted-foreground">Visualize e gerencie todas as assinaturas do sistema</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2 flex-1 lg:flex-none">
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2 flex-1 lg:flex-none">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2 flex-1 lg:flex-none">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              <span className="hidden lg:inline">Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
          <Card>
            <CardHeader className="pb-2 px-3 lg:px-6">
              <CardTitle className="text-xs lg:text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 lg:px-6">
              <div className="text-xl lg:text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground hidden lg:block">assinaturas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 px-3 lg:px-6">
              <CardTitle className="text-xs lg:text-sm text-muted-foreground">Free</CardTitle>
            </CardHeader>
            <CardContent className="px-3 lg:px-6">
              <div className="text-xl lg:text-2xl font-bold">{stats.free}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? ((stats.free / stats.total) * 100).toFixed(0) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2 px-3 lg:px-6">
              <CardTitle className="text-xs lg:text-sm text-muted-foreground flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Pro
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 lg:px-6">
              <div className="text-xl lg:text-2xl font-bold text-primary">{stats.pro}</div>
              <p className="text-xs text-muted-foreground hidden lg:block">
                R$ {(stats.pro * PLAN_PRICES.pro).toFixed(2)}/mês
              </p>
            </CardContent>
          </Card>

          <Card className="border-chart-5/30 bg-chart-5/5">
            <CardHeader className="pb-2 px-3 lg:px-6">
              <CardTitle className="text-xs lg:text-sm text-muted-foreground flex items-center gap-2">
                <Home className="h-4 w-4" style={{ color: 'hsl(var(--chart-5))' }} />
                Família
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 lg:px-6">
              <div className="text-xl lg:text-2xl font-bold" style={{ color: 'hsl(var(--chart-5))' }}>{stats.family}</div>
              <p className="text-xs text-muted-foreground hidden lg:block">
                R$ {(stats.family * PLAN_PRICES.family).toFixed(2)}/mês
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-2 lg:col-span-1 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/30">
            <CardHeader className="pb-2 px-3 lg:px-6">
              <CardTitle className="text-xs lg:text-sm text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                MRR
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 lg:px-6">
              <div className="text-xl lg:text-2xl font-bold text-green-500">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.mrr)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {stats.conversionRate}% conversão
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader className="pb-3 lg:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              Lista de Assinaturas
            </CardTitle>
            <CardDescription className="text-sm">
              Clique em "Editar" para alterar o plano de um usuário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Filtrar por plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  <SelectItem value="free">Gratuito</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="family">Família</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {data?.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">Nenhuma assinatura encontrada</p>
                  ) : (
                    data?.map((sub) => (
                      <div key={sub.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{sub.profiles?.full_name || 'Sem nome'}</p>
                            <p className="text-xs text-muted-foreground truncate">{sub.user_email}</p>
                          </div>
                          {getPlanBadge(sub.plan)}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Período fim</p>
                            <p>
                              {sub.current_period_end 
                                ? format(new Date(sub.current_period_end), 'dd/MM/yyyy', { locale: ptBR })
                                : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Atualizado</p>
                            <p>{format(new Date(sub.updated_at), 'dd/MM/yyyy', { locale: ptBR })}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleEditPlan(sub)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar Plano
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Última Atualização</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhuma assinatura encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        data?.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">
                              {sub.profiles?.full_name || 'Sem nome'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {sub.user_email}
                            </TableCell>
                            <TableCell>{getPlanBadge(sub.plan)}</TableCell>
                            <TableCell>
                              {sub.current_period_end ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(sub.current_period_end), 'dd/MM/yyyy', { locale: ptBR })}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(sub.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPlan(sub)}
                                className="gap-1"
                              >
                                <Edit className="h-4 w-4" />
                                Editar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Plan Dialog */}
        <Dialog open={!!editingSubscription} onOpenChange={() => setEditingSubscription(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Plano</DialogTitle>
              <DialogDescription>
                Altere o plano de assinatura do usuário. Esta ação será registrada no log de auditoria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <p className="text-sm font-medium">{editingSubscription?.profiles?.full_name || 'Sem nome'}</p>
                <p className="text-xs text-muted-foreground">{editingSubscription?.user_email}</p>
              </div>

              <div className="space-y-2">
                <Label>Plano Atual</Label>
                <div>{editingSubscription && getPlanBadge(editingSubscription.plan)}</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-plan">Novo Plano</Label>
                <Select value={newPlan} onValueChange={(v) => setNewPlan(v as SubscriptionPlan)}>
                  <SelectTrigger id="new-plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Gratuito</Badge>
                        <span className="text-muted-foreground">- R$ 0/mês</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pro">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-primary-foreground">Pro</Badge>
                        <span className="text-muted-foreground">- R$ 29,90/mês</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="family">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-chart-5 text-white">Família</Badge>
                        <span className="text-muted-foreground">- R$ 49,90/mês</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed">
                <Checkbox
                  id="grace-license"
                  checked={graceChecked}
                  onCheckedChange={(v) => setGraceChecked(!!v)}
                />
                <Label htmlFor="grace-license" className="text-sm font-medium leading-none">
                  Licença cortesia (acesso total sem pagamento)
                </Label>
              </div>
              {graceChecked && (
                <p className="text-xs text-muted-foreground">
                  Usuário com acesso total ao plano selecionado sem pagamento. Excluído de KPIs de receita/MRR.
                </p>
              )}

              {newPlan === 'free' && editingSubscription?.plan !== 'free' && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">
                    <strong>Atenção:</strong> Ao rebaixar para o plano gratuito, os dados de assinatura Asaas serão removidos.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditingSubscription(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSavePlan} 
                disabled={updatePlanMutation.isPending || newPlan === editingSubscription?.plan}
              >
                {updatePlanMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
