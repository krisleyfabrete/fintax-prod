import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, X, Loader2, Clock, AlertTriangle, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface DowngradeRequest {
  id: string;
  user_id: string;
  user_email: string | null;
  current_plan: string | null;
  requested_plan: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function AdminDowngradeRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedRequest, setSelectedRequest] = useState<DowngradeRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch downgrade requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-downgrade-requests', statusFilter, search],
    queryFn: async () => {
      let query = supabase
        .from('downgrade_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.ilike('user_email', `%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as DowngradeRequest[];
    },
  });

  // Process request mutation
  const processRequestMutation = useMutation({
    mutationFn: async ({ 
      requestId, 
      status, 
      notes 
    }: { 
      requestId: string; 
      status: 'approved' | 'rejected'; 
      notes?: string;
    }) => {
      const request = requests?.find(r => r.id === requestId);
      if (!request) throw new Error('Solicitação não encontrada');

      // Update the request status
      const { error: updateError } = await supabase
        .from('downgrade_requests')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          admin_notes: notes || null,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If approved, downgrade the user's subscription
      if (status === 'approved') {
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            plan: 'free',
            current_period_start: null,
            current_period_end: null,
          })
          .eq('user_id', request.user_id);

        if (subError) throw subError;
      }

      // Create notification for the user
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: status === 'approved' 
          ? 'Downgrade aprovado' 
          : 'Solicitação de downgrade rejeitada',
        message: status === 'approved'
          ? 'Sua solicitação de downgrade foi aprovada. Seu plano agora é Gratuito.'
          : `Sua solicitação de downgrade foi rejeitada.${notes ? ` Motivo: ${notes}` : ''}`,
        type: 'subscription',
        link: '/dashboard',
      });

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_action: status === 'approved' ? 'approve_downgrade' : 'reject_downgrade',
        p_target_type: 'downgrade_request',
        p_target_id: requestId,
        p_details: {
          user_email: request.user_email,
          current_plan: request.current_plan,
          status,
          notes,
        },
      });

      return { status };
    },
    onSuccess: (data) => {
      toast.success(
        data.status === 'approved' 
          ? 'Downgrade aprovado com sucesso' 
          : 'Solicitação rejeitada'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-downgrade-requests'] });
      setSelectedRequest(null);
      setActionType(null);
      setAdminNotes('');
    },
    onError: (error: Error) => {
      toast.error('Erro ao processar solicitação', {
        description: error.message,
      });
    },
  });

  const handleAction = (request: DowngradeRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminNotes('');
  };

  const handleConfirmAction = () => {
    if (!selectedRequest || !actionType) return;
    
    processRequestMutation.mutate({
      requestId: selectedRequest.id,
      status: actionType === 'approve' ? 'approved' : 'rejected',
      notes: adminNotes.trim() || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-500"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-500"><Check className="h-3 w-3 mr-1" /> Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-500"><X className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Solicitações de Downgrade</h1>
          <p className="text-muted-foreground">
            Gerencie as solicitações de downgrade de planos dos usuários
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="approved">Aprovados</SelectItem>
                  <SelectItem value="rejected">Rejeitados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Solicitações</CardTitle>
            <CardDescription>
              Lista de solicitações de downgrade de planos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : requests?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma solicitação encontrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Plano Atual</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests?.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.user_email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {request.current_plan === 'pro' ? 'Pro' : 'Familiar'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {request.reason || '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-right">
                          {request.status === 'pending' ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleAction(request, 'approve')}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleAction(request, 'reject')}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Rejeitar
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {request.reviewed_at && 
                                format(new Date(request.reviewed_at), 'dd/MM/yyyy', { locale: ptBR })
                              }
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <>
                  <Check className="h-5 w-5 text-green-600" />
                  Aprovar Downgrade
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Rejeitar Downgrade
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? `O usuário ${selectedRequest?.user_email} terá seu plano alterado para Gratuito.`
                : `A solicitação de ${selectedRequest?.user_email} será rejeitada.`
              }
            </DialogDescription>
          </DialogHeader>

          {selectedRequest?.reason && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm font-medium mb-1">Motivo do usuário:</p>
              <p className="text-sm text-muted-foreground">{selectedRequest.reason}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin-notes">Observações (opcional)</Label>
            <Textarea
              id="admin-notes"
              placeholder="Adicione observações sobre esta decisão..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setActionType(null);
              }}
              disabled={processRequestMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleConfirmAction}
              disabled={processRequestMutation.isPending}
            >
              {processRequestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : actionType === 'approve' ? (
                'Confirmar Aprovação'
              ) : (
                'Confirmar Rejeição'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
