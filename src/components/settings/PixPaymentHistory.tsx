import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  QrCode,
  AlertCircle,
  Trash2,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

type PixPaymentStatus = 'pending' | 'confirmed' | 'rejected';

interface PixPayment {
  id: string;
  plan: string;
  interval: string;
  amount: number;
  status: PixPaymentStatus;
  created_at: string;
  confirmed_at: string | null;
  notes: string | null;
}

export function PixPaymentHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentToCancel, setPaymentToCancel] = useState<PixPayment | null>(null);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['user-pix-payments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('pix_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PixPayment[];
    },
    enabled: !!user?.id,
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('pix_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Pagamento cancelado',
        description: 'O registro do pagamento foi removido.',
      });
      queryClient.invalidateQueries({ queryKey: ['user-pix-payments'] });
      setPaymentToCancel(null);
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao cancelar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: PixPaymentStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Aguardando
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
            Não confirmado
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

  if (isLoading) {
    return (
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pagamentos PIX
          </CardTitle>
          <CardDescription>Histórico dos seus pagamentos via PIX</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pagamentos PIX
          </CardTitle>
          <CardDescription>Histórico dos seus pagamentos via PIX</CardDescription>
        </CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <QrCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum pagamento PIX registrado</p>
              <p className="text-sm mt-1">
                Seus pagamentos via PIX aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {getPlanLabel(payment.plan, payment.interval)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="font-mono font-medium">
                        {formatCurrency(payment.amount)}
                      </span>
                      <span>•</span>
                      <span>
                        {format(new Date(payment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {payment.status === 'rejected' && payment.notes && (
                      <div className="flex items-start gap-1.5 mt-2 text-sm text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{payment.notes}</span>
                      </div>
                    )}
                    {payment.status === 'pending' && (
                      <p className="text-xs text-amber-400 mt-1">
                        Aguardando confirmação manual (até 24h úteis)
                      </p>
                    )}
                    {payment.status === 'confirmed' && payment.confirmed_at && (
                      <p className="text-xs text-green-400 mt-1">
                        Confirmado em {format(new Date(payment.confirmed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {payment.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setPaymentToCancel(payment)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!paymentToCancel} onOpenChange={() => setPaymentToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar pagamento PIX?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este registro de pagamento?
              {paymentToCancel && (
                <span className="block mt-2 font-medium text-foreground">
                  {getPlanLabel(paymentToCancel.plan, paymentToCancel.interval)} - {formatCurrency(paymentToCancel.amount)}
                </span>
              )}
              <span className="block mt-2 text-amber-500">
                Se você já realizou o pagamento PIX, entre em contato com o suporte antes de cancelar.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => paymentToCancel && cancelPaymentMutation.mutate(paymentToCancel.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelPaymentMutation.isPending}
            >
              {cancelPaymentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Cancelar pagamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
