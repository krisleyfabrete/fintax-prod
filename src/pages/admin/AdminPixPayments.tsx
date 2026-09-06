import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search,
  RefreshCw,
  QrCode,
  Loader2,
  Eye,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Banknote,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

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

export default function AdminPixPayments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PixPayment | null>(null);
  const [actionType, setActionType] = useState<'confirm' | 'reject' | 'view' | 'cancel' | null>(null);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paymentToCancel, setPaymentToCancel] = useState<PixPayment | null>(null);

  const handleRefresh = async () => {
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ['admin-pix-payments-stats'] });
  };

  // Realtime subscription for pix_payments
  useEffect(() => {
    const channel = supabase
      .channel('admin-pix-payments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pix_payments'
        },
        () => {
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['admin-pix-payments'] });
          queryClient.invalidateQueries({ queryKey: ['admin-pix-payments-stats'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Query para estatísticas (todos os pagamentos, sem filtro)
  const { data: allPayments } = useQuery({
    queryKey: ['admin-pix-payments-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pix_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PixPayment[];
    },
  });

  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ['admin-pix-payments', statusFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('pix_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as PixPaymentStatus);
      }

      if (searchTerm) {
        query = query.ilike('user_email', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PixPayment[];
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, notes }: { paymentId: string; notes: string }) => {
      const payment = payments?.find(p => p.id === paymentId);
      if (!payment) throw new Error('Pagamento não encontrado');

      // Update payment status
      const { error: paymentError } = await supabase
        .from('pix_payments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user?.id,
          notes,
        })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      // Update user subscription
      const planMap: Record<string, 'pro' | 'family'> = {
        'pro': 'pro',
        'family': 'family',
      };

      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .update({
          plan: planMap[payment.plan] || 'pro',
          current_period_start: new Date().toISOString(),
          current_period_end: payment.interval === 'yearly' 
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', payment.user_id);

      if (subscriptionError) throw subscriptionError;

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: payment.user_id,
        title: 'Pagamento PIX Confirmado! 🎉',
        message: `Seu pagamento de R$ ${payment.amount.toFixed(2).replace('.', ',')} foi confirmado. Sua assinatura ${payment.plan === 'family' ? 'Familiar' : 'Pro'} já está ativa!`,
        type: 'success',
        link: '/dashboard',
      });

      return payment;
    },
    onSuccess: () => {
      toast({
        title: 'Pagamento confirmado!',
        description: 'A assinatura do usuário foi ativada.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-pix-payments'] });
      closeDialog();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao confirmar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, notes }: { paymentId: string; notes: string }) => {
      const payment = payments?.find(p => p.id === paymentId);
      if (!payment) throw new Error('Pagamento não encontrado');

      const { error } = await supabase
        .from('pix_payments')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          confirmed_by: user?.id,
          notes,
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: payment.user_id,
        title: 'Pagamento PIX não confirmado',
        message: `Não conseguimos confirmar seu pagamento de R$ ${payment.amount.toFixed(2).replace('.', ',')}. ${notes ? `Motivo: ${notes}` : 'Por favor, entre em contato com o suporte.'}`,
        type: 'warning',
        link: '/support',
      });

      return payment;
    },
    onSuccess: () => {
      toast({
        title: 'Pagamento rejeitado',
        description: 'O usuário foi notificado.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-pix-payments'] });
      closeDialog();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao rejeitar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const payment = allPayments?.find(p => p.id === paymentId) || payments?.find(p => p.id === paymentId);
      if (!payment) throw new Error('Pagamento não encontrado');

      const { error } = await supabase
        .from('pix_payments')
        .delete()
        .eq('id', paymentId)
        .eq('status', 'pending');

      if (error) throw error;

      // Send notification to user
      await supabase.from('notifications').insert({
        user_id: payment.user_id,
        title: 'Pagamento PIX Cancelado',
        message: `Seu pagamento PIX de R$ ${payment.amount.toFixed(2).replace('.', ',')} foi cancelado pelo administrador.`,
        type: 'info',
        link: '/dashboard',
      });

      return payment;
    },
    onSuccess: () => {
      toast({
        title: 'Pagamento cancelado',
        description: 'O pagamento foi removido e o usuário foi notificado.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-pix-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pix-payments-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setCancelDialogOpen(false);
      setPaymentToCancel(null);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao cancelar pagamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const closeDialog = () => {
    setSelectedPayment(null);
    setActionType(null);
    setNotes('');
    setIsProcessing(false);
  };

  const handleAction = async () => {
    if (!selectedPayment) return;
    setIsProcessing(true);

    if (actionType === 'confirm') {
      await confirmPaymentMutation.mutateAsync({ 
        paymentId: selectedPayment.id, 
        notes 
      });
    } else if (actionType === 'reject') {
      await rejectPaymentMutation.mutateAsync({ 
        paymentId: selectedPayment.id, 
        notes 
      });
    }
  };

  const handleCancelPayment = (payment: PixPayment) => {
    setPaymentToCancel(payment);
    setCancelDialogOpen(true);
  };

  const confirmCancelPayment = async () => {
    if (!paymentToCancel) return;
    await cancelPaymentMutation.mutateAsync(paymentToCancel.id);
  };

  const getStatusBadge = (status: PixPaymentStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'confirmed':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitado
          </Badge>
        );
    }
  };

  const getPlanLabel = (plan: string, interval: string) => {
    const planName = plan === 'family' ? 'Familiar' : 'Pro';
    const intervalName = interval === 'yearly' ? 'Anual' : 'Mensal';
    return `${planName} ${intervalName}`;
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  // Estatísticas calculadas a partir de todos os pagamentos
  const stats = {
    pending: allPayments?.filter(p => p.status === 'pending') || [],
    confirmed: allPayments?.filter(p => p.status === 'confirmed') || [],
    rejected: allPayments?.filter(p => p.status === 'rejected') || [],
    totalConfirmed: allPayments?.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0) || 0,
    totalPending: allPayments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0,
  };

  const pendingCount = stats.pending.length;

  const content = (
    <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-3xl font-bold flex items-center gap-2 lg:gap-3">
              <QrCode className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
              Pagamentos PIX
            </h1>
            <p className="text-sm lg:text-base text-muted-foreground mt-1">
              Gerencie e confirme pagamentos PIX pendentes
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="w-fit">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-3 lg:pt-6 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-xl lg:text-3xl font-bold text-amber-400">{stats.pending.length}</p>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                    {formatCurrency(stats.totalPending)}
                  </p>
                </div>
                <div className="p-2 lg:p-3 rounded-full bg-amber-500/10">
                  <Clock className="h-4 w-4 lg:h-6 lg:w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-3 lg:pt-6 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Confirmados</p>
                  <p className="text-xl lg:text-3xl font-bold text-green-400">{stats.confirmed.length}</p>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                    {formatCurrency(stats.totalConfirmed)}
                  </p>
                </div>
                <div className="p-2 lg:p-3 rounded-full bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 lg:h-6 lg:w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-3 lg:pt-6 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Rejeitados</p>
                  <p className="text-xl lg:text-3xl font-bold text-red-400">{stats.rejected.length}</p>
                </div>
                <div className="p-2 lg:p-3 rounded-full bg-red-500/10">
                  <XCircle className="h-4 w-4 lg:h-6 lg:w-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3 lg:pt-6 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm text-muted-foreground">Total</p>
                  <p className="text-lg lg:text-2xl font-bold text-primary">{formatCurrency(stats.totalConfirmed)}</p>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                    {stats.confirmed.length} pagamento{stats.confirmed.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-2 lg:p-3 rounded-full bg-primary/10">
                  <DollarSign className="h-4 w-4 lg:h-6 lg:w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 lg:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="confirmed">Confirmados</SelectItem>
                  <SelectItem value="rejected">Rejeitados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">Pagamentos</CardTitle>
            <CardDescription className="text-xs lg:text-sm">
              Lista de todos os pagamentos PIX registrados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : payments && payments.length > 0 ? (
              <>
                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="p-3 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{payment.user_email}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        {getStatusBadge(payment.status)}
                      </div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-semibold">{formatCurrency(payment.amount)}</span>
                          <Badge variant="outline" className="text-xs">
                            {getPlanLabel(payment.plan, payment.interval)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setActionType('view');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        {payment.status === 'pending' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setActionType('confirm');
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Confirmar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setActionType('reject');
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelPayment(payment)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.user_email}
                          </TableCell>
                          <TableCell>
                            {getPlanLabel(payment.plan, payment.interval)}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setActionType('view');
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {payment.status === 'pending' && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setActionType('confirm');
                                    }}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Confirmar
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setActionType('reject');
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Rejeitar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelPayment(payment)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum pagamento encontrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={!!selectedPayment && !!actionType} onOpenChange={() => closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'confirm' && 'Confirmar Pagamento'}
                {actionType === 'reject' && 'Rejeitar Pagamento'}
                {actionType === 'view' && 'Detalhes do Pagamento'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'confirm' && 'Confirme que o pagamento foi recebido para ativar a assinatura do usuário.'}
                {actionType === 'reject' && 'Informe o motivo da rejeição para notificar o usuário.'}
                {actionType === 'view' && 'Informações completas do pagamento PIX.'}
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedPayment.user_email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Plano</p>
                    <p className="font-medium">
                      {getPlanLabel(selectedPayment.plan, selectedPayment.interval)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor</p>
                    <p className="font-medium font-mono">
                      {formatCurrency(selectedPayment.amount)}
                    </p>
                  </div>
<div className="col-span-2">
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-medium">
                      {format(new Date(selectedPayment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {selectedPayment.notes && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Notas</p>
                      <p className="font-medium">{selectedPayment.notes}</p>
                    </div>
                  )}
                </div>

                {actionType !== 'view' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {actionType === 'confirm' ? 'Notas (opcional)' : 'Motivo da rejeição'}
                    </label>
                    <Textarea
                      placeholder={actionType === 'confirm' 
                        ? 'Adicione notas sobre a confirmação...'
                        : 'Informe o motivo da rejeição...'}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                {actionType === 'view' ? 'Fechar' : 'Cancelar'}
              </Button>
              {actionType === 'confirm' && (
                <Button 
                  onClick={handleAction} 
                  disabled={isProcessing}
                >
                  {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar Pagamento
                </Button>
              )}
              {actionType === 'reject' && (
                <Button 
                  variant="destructive" 
                  onClick={handleAction}
                  disabled={isProcessing}
                >
                  {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Rejeitar Pagamento
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Pagamento PIX</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja cancelar este pagamento PIX pendente?
                {paymentToCancel && (
                  <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                    <p><strong>Email:</strong> {paymentToCancel.user_email}</p>
                    <p><strong>Valor:</strong> {formatCurrency(paymentToCancel.amount)}</p>
                    <p><strong>Plano:</strong> {getPlanLabel(paymentToCancel.plan, paymentToCancel.interval)}</p>
                  </div>
                )}
                <p className="mt-3 text-destructive">
                  Esta ação não pode ser desfeita. O usuário será notificado.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancelPayment}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={cancelPaymentMutation.isPending}
              >
                {cancelPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cancelar Pagamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
