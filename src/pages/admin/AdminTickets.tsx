import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Eye, Send, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  admin_seen_at: string | null;
  profiles?: { full_name: string | null };
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export default function AdminTickets() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousTicketCountRef = useRef<number>(0);

  // Initialize audio for notification sound
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + 
      'tvT19' + 'A'.repeat(100)); // Fallback beep
    // Try to use a better notification sound
    audioRef.current.src = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
    audioRef.current.volume = 0.5;
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
  };

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-tickets', statusFilter],
    queryFn: async () => {
      let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data: ticketsData, error } = await query;
      if (error) throw error;
      
      const userIds = ticketsData?.map(t => t.user_id) || [];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      
      return ticketsData?.map(ticket => ({
        ...ticket,
        profiles: profiles?.find(p => p.id === ticket.user_id) || { full_name: null }
      })) as Ticket[];
    },
  });

  // Check for new tickets and play sound
  useEffect(() => {
    if (tickets && tickets.length > 0) {
      const unseenCount = tickets.filter(t => !t.admin_seen_at && (t.status === 'open' || t.status === 'in_progress')).length;
      if (unseenCount > previousTicketCountRef.current && previousTicketCountRef.current > 0) {
        playNotificationSound();
        toast.info('Novo ticket recebido!');
      }
      previousTicketCountRef.current = unseenCount;
    }
  }, [tickets]);

  // Subscribe to realtime updates for new tickets
  useEffect(() => {
    const channel = supabase
      .channel('admin-tickets-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        () => {
          playNotificationSound();
          toast.info('Novo ticket recebido!');
          queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
          queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_messages' },
        (payload) => {
          // Only notify for user messages (not admin)
          if (payload.new && !(payload.new as { is_admin?: boolean }).is_admin) {
            playNotificationSound();
            toast.info('Nova mensagem recebida!');
            queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticket-messages'] });
            queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['ticket-messages', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const { data, error } = await supabase.from('ticket_messages').select('*').eq('ticket_id', selectedTicket.id).order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedTicket,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('support_tickets').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status atualizado!');
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message, ticketUserId }: { ticketId: string; message: string; ticketUserId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('ticket_messages').insert({ ticket_id: ticketId, user_id: user.id, message, is_admin: true });
      if (error) throw error;
      
      // Update ticket status to waiting_user when admin responds
      await supabase.from('support_tickets').update({ status: 'waiting_user' }).eq('id', ticketId);
      
      await supabase.functions.invoke('ticket-notification', {
        body: { ticketId, userId: ticketUserId, message: 'Sua solicitação foi respondida pelo suporte.' }
      });
    },
    onSuccess: () => {
      toast.success('Mensagem enviada!');
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', selectedTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      if (selectedTicket) {
        setSelectedTicket({ ...selectedTicket, status: 'waiting_user', admin_seen_at: new Date().toISOString() });
      }
    },
  });

  const markAsSeenMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ admin_seen_at: new Date().toISOString() })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ticket marcado como visto!');
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
      if (selectedTicket) {
        setSelectedTicket({ ...selectedTicket, admin_seen_at: new Date().toISOString() });
      }
    },
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = { 
      open: 'bg-yellow-500/10 text-yellow-600', 
      in_progress: 'bg-blue-500/10 text-blue-600', 
      waiting_user: 'bg-orange-500/10 text-orange-600',
      resolved: 'bg-green-500/10 text-green-600', 
      closed: 'bg-muted text-muted-foreground' 
    };
    const labels: Record<string, string> = { 
      open: 'Aberto', 
      in_progress: 'Em Andamento', 
      waiting_user: 'Aguardando Usuário',
      resolved: 'Resolvido', 
      closed: 'Fechado' 
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = { 
      low: 'bg-muted text-muted-foreground', 
      medium: 'bg-yellow-500/10 text-yellow-600', 
      high: 'bg-orange-500/10 text-orange-600', 
      urgent: 'bg-red-500/10 text-red-600' 
    };
    const labels: Record<string, string> = { 
      low: 'Baixa', 
      medium: 'Média', 
      high: 'Alta', 
      urgent: 'Urgente' 
    };
    return <Badge variant="outline" className={styles[priority]}>{labels[priority]}</Badge>;
  };

  const stats = {
    open: tickets?.filter(t => t.status === 'open').length || 0,
    in_progress: tickets?.filter(t => t.status === 'in_progress').length || 0,
    waiting_user: tickets?.filter(t => t.status === 'waiting_user').length || 0,
    resolved: tickets?.filter(t => t.status === 'resolved').length || 0,
  };

  const content = (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Tickets de Suporte</h1>
        <p className="text-sm lg:text-base text-muted-foreground">Gerencie solicitações dos usuários</p>
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card>
            <CardHeader className="pb-2 px-3 lg:px-6">
              <CardTitle className="text-xs lg:text-sm text-muted-foreground">Abertos</CardTitle>
            </CardHeader>
            <CardContent className="px-3 lg:px-6">
              <div className="text-xl lg:text-2xl font-bold text-yellow-600">{stats.open}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 px-3 lg:px-6">
              <CardTitle className="text-xs lg:text-sm text-muted-foreground">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent className="px-3 lg:px-6">
              <div className="text-xl lg:text-2xl font-bold text-blue-600">{stats.in_progress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 px-3 lg:px-6">
              <CardTitle className="text-xs lg:text-sm text-muted-foreground">Aguardando Usuário</CardTitle>
            </CardHeader>
            <CardContent className="px-3 lg:px-6">
              <div className="text-xl lg:text-2xl font-bold text-orange-600">{stats.waiting_user}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 px-3 lg:px-6">
              <CardTitle className="text-xs lg:text-sm text-muted-foreground">Resolvidos</CardTitle>
            </CardHeader>
            <CardContent className="px-3 lg:px-6">
              <div className="text-xl lg:text-2xl font-bold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pb-3 lg:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Tickets
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="waiting_user">Aguardando Usuário</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
                <SelectItem value="closed">Fechados</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <>
                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {tickets?.map((ticket) => (
                    <div key={ticket.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm line-clamp-2 flex-1">{ticket.subject}</h3>
                        <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => setSelectedTicket(ticket)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getPriorityBadge(ticket.priority)}
                        {getStatusBadge(ticket.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="truncate max-w-[120px]">{ticket.profiles?.full_name || 'Sem nome'}</span>
                        <span>{format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </div>
                    </div>
                  ))}
                  {tickets?.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">Nenhum ticket encontrado</p>
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets?.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium max-w-xs truncate">{ticket.subject}</TableCell>
                          <TableCell>{ticket.profiles?.full_name || 'Sem nome'}</TableCell>
                          <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                          <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                          <TableCell className="text-muted-foreground">{format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(ticket)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {tickets?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum ticket encontrado</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base lg:text-lg pr-6">{selectedTicket?.subject}</DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPriorityBadge(selectedTicket.priority)}
                    <Select 
                      value={selectedTicket.status} 
                      onValueChange={(status) => { 
                        updateStatusMutation.mutate({ id: selectedTicket.id, status }); 
                        setSelectedTicket({ ...selectedTicket, status }); 
                      }}
                    >
                      <SelectTrigger className="w-[140px] lg:w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Aberto</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="waiting_user">Aguardando Usuário</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                        <SelectItem value="closed">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedTicket.admin_seen_at && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCheck className="h-3 w-3 mr-1" />
                        Visto
                      </Badge>
                    )}
                  </div>
                  {!selectedTicket.admin_seen_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsSeenMutation.mutate(selectedTicket.id)}
                      disabled={markAsSeenMutation.isPending}
                    >
                      <CheckCheck className="h-4 w-4 mr-1" />
                      Marcar como visto
                    </Button>
                  )}
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{selectedTicket.description}</p>
                </div>
                <ScrollArea className="h-48 lg:h-64 border rounded-lg p-4">
                  {messagesLoading ? <Skeleton className="h-32" /> : (
                    <div className="space-y-3">
                      {messages?.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] lg:max-w-[80%] p-3 rounded-lg ${msg.is_admin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">{format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}</p>
                          </div>
                        </div>
                      ))}
                      {messages?.length === 0 && <p className="text-center text-muted-foreground">Nenhuma mensagem ainda</p>}
                    </div>
                  )}
                </ScrollArea>
                <div className="flex gap-2">
                  <Textarea 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder="Digite sua resposta..." 
                    className="flex-1 min-h-[60px]" 
                  />
                  <Button 
                    onClick={() => newMessage.trim() && sendMessageMutation.mutate({ 
                      ticketId: selectedTicket.id, 
                      message: newMessage, 
                      ticketUserId: selectedTicket.user_id 
                    })} 
                    disabled={!newMessage.trim()}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
              </div>
            </div>
          )}
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
