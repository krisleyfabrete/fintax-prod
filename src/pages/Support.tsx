import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  in_progress: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  waiting_user: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/30',
  closed: 'bg-muted text-muted-foreground border-muted',
};

const statusLabels: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em Andamento',
  waiting_user: 'Aguardando Resposta',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export default function Support() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium'
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['user-tickets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Ticket[];
    },
    enabled: !!user
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['ticket-messages', selectedTicket?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', selectedTicket?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TicketMessage[];
    },
    enabled: !!selectedTicket
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id,
          subject: data.subject,
          description: data.description,
          priority: data.priority
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tickets'] });
      setIsCreateOpen(false);
      setFormData({ subject: '', description: '', priority: 'medium' });
      toast.success('Ticket criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar ticket');
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket?.id,
          user_id: user?.id,
          message,
          is_admin: false
        });

      if (error) throw error;

      // Update ticket status to in_progress when user responds
      if (selectedTicket?.status === 'waiting_user') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages'] });
      queryClient.invalidateQueries({ queryKey: ['user-tickets'] });
      setNewMessage('');
    },
    onError: () => {
      toast.error('Erro ao enviar mensagem');
    }
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    createTicketMutation.mutate(formData);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'waiting_user':
        return <MessageSquare className="h-4 w-4" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suporte</h1>
          <p className="text-muted-foreground">
            Entre em contato conosco e acompanhe seus tickets
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Ticket</DialogTitle>
              <DialogDescription>
                Descreva seu problema ou dúvida e nossa equipe responderá em breve.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assunto</label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Resumo do problema..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Prioridade</label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva detalhadamente seu problema ou dúvida..."
                  rows={5}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createTicketMutation.isPending}>
                  Criar Ticket
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lista de Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Meus Tickets</CardTitle>
            <CardDescription>
              {tickets.length} ticket(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum ticket encontrado</p>
                <p className="text-sm">Crie um novo ticket para entrar em contato</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={cn(
                      'p-4 rounded-lg border cursor-pointer transition-all glass-card',
                      selectedTicket?.id === ticket.id
                        ? 'ring-2 ring-primary'
                        : 'hover:ring-1 hover:ring-white/20'
                    )}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{ticket.subject}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {ticket.description}
                        </p>
                      </div>
                      <Badge variant="outline" className={statusColors[ticket.status]}>
                        {getStatusIcon(ticket.status)}
                        <span className="ml-1">{statusLabels[ticket.status]}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Prioridade: {priorityLabels[ticket.priority]}</span>
                      <span>
                        {formatDistanceToNow(new Date(ticket.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalhes do Ticket */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedTicket ? selectedTicket.subject : 'Selecione um ticket'}
            </CardTitle>
            {selectedTicket && (
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline" className={statusColors[selectedTicket.status]}>
                  {statusLabels[selectedTicket.status]}
                </Badge>
                <span>•</span>
                <span>Prioridade: {priorityLabels[selectedTicket.priority]}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!selectedTicket ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um ticket para ver os detalhes</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Descrição original:</p>
                  <p className="text-sm text-muted-foreground">{selectedTicket.description}</p>
                </div>

                <ScrollArea className="h-64 border rounded-lg p-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma mensagem ainda
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg max-w-[85%] ${
                            msg.is_admin
                              ? 'bg-primary/10 mr-auto'
                              : 'bg-muted ml-auto'
                          }`}
                        >
                          <p className="text-xs font-medium mb-1">
                            {msg.is_admin ? 'Suporte' : 'Você'}
                          </p>
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(msg.created_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {selectedTicket.status !== 'closed' && (
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={sendMessageMutation.isPending || !newMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </AppLayout>
  );
}
